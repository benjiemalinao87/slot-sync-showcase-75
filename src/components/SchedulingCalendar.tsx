'use client'

import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, CalendarPlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getAvailableSlots, bookAppointment, getBusyDaysForMonth } from "@/utils/googleCalendarAuth";
import { TimeSlot } from "@/types/calendar";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ErrorDialog } from './ErrorDialog';
import { submitToWebhook } from '@/utils/webhookService';
import { triggerConfetti } from '@/lib/confetti';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format, isWeekend, isBefore, startOfDay } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { 
  filterSlotsForBusinessHours, 
  getDefaultBusinessHours, 
  formatTimeInTimezone,
  isValidTimezone 
} from '@/utils/timezoneHelper';

interface SchedulingCalendarProps {
  salesRepEmail?: string;
  salesRep?: any;
  leadDetails?: any;
  onBookingComplete?: (bookingDetails: any) => void;
}

export function SchedulingCalendar({ salesRepEmail, salesRep, leadDetails, onBookingComplete }: SchedulingCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [busyDays, setBusyDays] = useState<string[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();

  // New function to fetch busy days for a month
  const fetchBusyDays = async () => {
    if (!salesRepEmail) return;
    
    try {
      setCalendarLoading(true);
      
      // Get current month information
      const now = new Date();
      const month = now.getMonth(); // 0-indexed (0=January, 11=December)
      const year = now.getFullYear();
      
      console.log(`Fetching busy days for ${month+1}/${year} calendar: ${salesRepEmail}`);
      
      // First, make sure startDate and endDate are properly formatted for the API
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // Last day of the month
      
      console.log("Date range for busy days:", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        calendarId: salesRepEmail
      });
      
      const busyDaysData = await getBusyDaysForMonth(
        month, 
        year, 
        salesRepEmail
      );
      
      console.log("Received busy days:", busyDaysData);
      setBusyDays(Array.isArray(busyDaysData) ? busyDaysData : []);
    } catch (err: any) {
      console.error('Error fetching busy days:', err);
      // More detailed error logging
      if (err.message) {
        console.error('Error message:', err.message);
      }
      if (err.stack) {
        console.error('Error stack:', err.stack);
      }
      
      toast.error("Failed to load calendar availability");
      setBusyDays([]); // Reset busy days to prevent blocking all dates
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (salesRepEmail) {
      fetchBusyDays();
    }
  }, [salesRepEmail]);

  useEffect(() => {
    if (date) {
      // Reset error state when changing dates
      setError(null);
      fetchAvailableSlots();
    }
  }, [date]);

  const fetchAvailableSlots = async () => {
    if (!date) return;
    
    // We'll use the sales rep's email for calendar lookup
    // If no rep email is provided directly, use it from the salesRep object
    const emailToUse = salesRepEmail || salesRep?.email;
    
    if (!emailToUse) {
      setError("Sales representative email not provided");
      setTimeSlots([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get user's timezone
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Validate timezone
      if (!isValidTimezone(userTimeZone)) {
        throw new Error("Invalid user timezone detected");
      }
      
      // Format date properly to ensure consistency
      const formattedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      console.log("Fetching slots for:", emailToUse);
      console.log("Date for slots:", formattedDate.toISOString());
      console.log("User timezone:", userTimeZone);
      
      // Call the edge function to get available slots using service account
      const rawSlots = await getAvailableSlots(formattedDate, emailToUse);
      
      // Check if slots is an array before processing
      if (!Array.isArray(rawSlots)) {
        console.error('Invalid slots data returned:', rawSlots);
        setTimeSlots([]);
        setError('Invalid response format from server');
        toast.error("Failed to load time slots - invalid format");
        return;
      }
      
      console.log(`Retrieved ${rawSlots.length} raw time slots from server`);
      
      // Get business hours for user's timezone
      const businessHours = getDefaultBusinessHours(userTimeZone);
      
      // Filter slots based on business hours and format for user's timezone
      const filteredSlots = filterSlotsForBusinessHours(rawSlots, businessHours);
      
      console.log(`Filtered to ${filteredSlots.length} slots within business hours (${businessHours.start}:00-${businessHours.end}:00 ${userTimeZone})`);
      
      setTimeSlots(filteredSlots);
      
      if (filteredSlots.length === 0) {
        toast.info("No time slots available during business hours for this date");
      }
    } catch (err: any) {
      console.error('Error fetching slots:', err);
      // More detailed error logging
      if (err.message) {
        console.error('Error message:', err.message);
      }
      if (err.stack) {
        console.error('Error stack:', err.stack);
      }
      
      setError(`Failed to fetch available time slots: ${err.message || 'Unknown error'}`);
      toast.error("Failed to load available time slots");
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (!slot.isAvailable) {
      toast.error("This time slot is no longer available");
      return;
    }
    setSelectedSlot(slot);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !date || !salesRepEmail) return;

    const bookingToastId = toast.loading("Creating your appointment...");
    setIsLoading(true);
    setError(null);

    try {
      // Get user's timezone for proper conversion
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Create a new date object for the selected date in user's timezone
      const selectedDate = new Date(date);
      
      // Check if the date is valid
      if (isNaN(selectedDate.getTime())) {
        throw new Error("Invalid selected date");
      }
      
      console.log("Selected date:", selectedDate.toISOString());
      console.log("User timezone:", userTimeZone);
      console.log("Selected slot:", selectedSlot);
      
      // Since the server now returns ISO strings, we can use them directly
      // The selectedSlot.startTime and endTime are already in ISO format
      let startTime: Date;
      let endTime: Date;
      
      try {
        // Parse the ISO strings directly
        startTime = new Date(selectedSlot.startTime);
        endTime = new Date(selectedSlot.endTime);
        
        // Validate the parsed dates
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          throw new Error("Invalid date objects created from slot times");
        }
        
        console.log("Parsed start time (UTC):", startTime.toISOString());
        console.log("Parsed end time (UTC):", endTime.toISOString());
        console.log("Start time (user timezone):", startTime.toString());
        console.log("End time (user timezone):", endTime.toString());
        
      } catch (parseError) {
        console.error("Error parsing slot times:", parseError);
        console.error("Slot data:", { 
          startTime: selectedSlot.startTime, 
          endTime: selectedSlot.endTime 
        });
        throw new Error(`Failed to parse slot times: ${parseError.message}`);
      }
      
      // Prepare booking details
      const bookingName = leadDetails ? 
        `${leadDetails.firstName} ${leadDetails.lastName}` : 
        "Guest";
        
      const bookingEmail = leadDetails?.email || "No email provided";
      const bookingNotes = leadDetails?.notes || `Interests: ${leadDetails?.interest || "Not specified"}`;
      const bookingAddress = leadDetails?.address ? `${leadDetails.address}, ${leadDetails.city || ''}` : (leadDetails?.city || 'No address provided');

      // Format the time for the title using user's timezone
      const timeStr = startTime.toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true,
        timeZone: userTimeZone
      });

      // Create the event title
      const eventTitle = `Cobalt Site Visit: ${timeStr}: ${bookingAddress}`;

      // Get the calendar ID (sales rep's email) for booking
      const calendarIdToUse = salesRepEmail || salesRep?.email;

      // Pass the calendar ID to the bookAppointment function with timezone info
      await bookAppointment(
        startTime.toISOString(),
        endTime.toISOString(),
        {
          name: bookingName,
          email: bookingEmail,
          notes: `Address: ${bookingAddress}\n${bookingNotes}`,
          address: bookingAddress,
          timeZone: userTimeZone // Pass timezone info
        },
        calendarIdToUse // Pass the calendar ID (sales rep's email)
      );

      toast.success("Appointment booked successfully!", { id: bookingToastId });
      
      const bookingInfo = {
        date: selectedDate,
        startTime: startTime,
        endTime: endTime,
        slot: selectedSlot,
        rep: salesRep
      };

      // Send booking information to webhook
      try {
        // Format phone number to E.164 format (just digits with country code)
        let formattedPhone = "No phone provided";
        if (leadDetails?.phone) {
          // Remove all non-digit characters
          const digitsOnly = leadDetails.phone.replace(/\D/g, '');
          
          // If no country code (assuming US/CA), add +1
          if (digitsOnly.length === 10) {
            formattedPhone = `1${digitsOnly}`;
          } else {
            // Otherwise just use the digits
            formattedPhone = digitsOnly;
          }
        }

        await submitToWebhook({
          appointmentDate: selectedDate.toISOString(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          customerName: bookingName,
          customerEmail: bookingEmail,
          customerPhone: formattedPhone,
          notes: bookingNotes,
          interest: leadDetails?.interest || "Not specified",
          salesRepName: salesRep?.name || "Unknown",
          salesRepEmail: salesRep?.email || calendarIdToUse || "Unknown",
          slot: selectedSlot
        });
        console.log("Webhook notification sent successfully");
      } catch (webhookError) {
        console.error("Failed to send webhook notification:", webhookError);
        // Don't stop the booking process if webhook fails
      }

      // Store the booking details for the confirmation page - serialize dates properly
      sessionStorage.setItem('lastBooking', JSON.stringify({
        date: selectedDate.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        slot: selectedSlot,
        rep: salesRep
      }));

      // Update the navigation to include the booking details in state
      if (onBookingComplete) {
        onBookingComplete(bookingInfo);
      } else {
        navigate('/booking-confirmation', { state: { bookingDetails: bookingInfo } });
      }
    } catch (error: any) {
      console.error('Failed to book appointment:', error);
      toast.error("Failed to book appointment: " + (error.message || "Please try again later"), { id: bookingToastId });
      setBookingError(error.message || "Unknown error occurred while booking appointment");
      setIsErrorDialogOpen(true);
    } finally {
      setIsLoading(false);
      setIsConfirmDialogOpen(false);
    }
  };

  const handleIframeError = () => {
    console.error('Failed to load calendar iframe');
    setIframeError('Failed to load calendar. Please try refreshing the page.');
  };

  const handleScheduleMeeting = () => {
    if (!salesRepEmail) return;
    
    // Format the calendar URL for event creation
    const baseUrl = 'https://calendar.google.com/calendar/u/0/r/eventedit';
    const params = new URLSearchParams({
      text: 'Sales Meeting',
      details: 'Meeting with sales representative',
      add: salesRepEmail,
      ctz: 'America/Chicago'
    });

    // Open in new tab
    window.open(`${baseUrl}?${params.toString()}`, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Card className="border-none shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-yellow-600 p-8 text-white relative overflow-hidden">
          {/* Solar panel pattern in background */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-10 gap-1 w-full h-full">
              {Array(40).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-sm"></div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div>
              <CardTitle className="text-3xl font-bold mb-2">Book Your Appointment</CardTitle>
              <CardDescription className="text-blue-100 text-lg opacity-90">
                With {salesRep?.name || "Your Solar Design Expert"}
              </CardDescription>
            </div>
            <div className="bg-yellow-500 p-3 rounded-full shadow-lg hidden md:flex">
              <CalendarClock className="h-10 w-10 text-white" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
            {/* Calendar View - Left side (8 columns on large screens) */}
            <div className="lg:col-span-8 bg-white p-6 lg:p-8 relative">
              {/* Sun rays in background */}
              <div className="absolute -top-8 right-8 w-40 h-40 bg-yellow-400 rounded-full opacity-5"></div>
              
              {salesRepEmail ? (
                <div className="w-full h-full rounded-xl">
                  <div className="mb-6 border-b border-gray-100 pb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Select a Date</h3>
                    <p className="text-gray-500">
                      Choose an available date to view appointment slots
                    </p>
                  </div>
                  
                  {calendarLoading ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500">Loading calendar availability...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center py-20">
                      <div className="bg-red-50 rounded-xl p-6 border border-red-100 mb-4 text-center w-full max-w-md">
                        <p className="text-red-600 mb-3">Failed to load calendar availability</p>
                        <Button 
                          variant="outline" 
                          className="bg-white hover:bg-red-50 border-red-200 text-red-600"
                          onClick={fetchBusyDays}
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <Calendar 
                        mode="single" 
                        selected={date} 
                        onSelect={(newDate) => {
                          setDate(newDate);
                          // Clear previous time slots when date changes
                          setTimeSlots([]);
                          setSelectedSlot(null);
                        }}
                        disabled={(date) => {
                          // Disable past dates
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          if (isBefore(date, now)) return true;
                          
                          // Disable weekends
                          if (isWeekend(date)) return true;
                          
                          // Disable dates that are fully booked
                          const dateString = date.toISOString().split('T')[0];
                          return busyDays.includes(dateString);
                        }}
                        className={cn(
                          "rounded-xl border border-gray-100 shadow-sm mx-auto w-full max-w-md",
                          "[&_.rdp-caption]:text-xl [&_.rdp-caption]:font-bold [&_.rdp-caption]:text-gray-800",
                          "[&_.rdp-months]:mx-auto",
                          "[&_.rdp-day]:h-14 [&_.rdp-day]:w-14",
                          "[&_.rdp-day_button]:h-12 [&_.rdp-day_button]:w-12 [&_.rdp-day_button]:rounded-full",
                          "[&_.rdp-day_button]:font-medium [&_.rdp-day_button]:text-gray-700",
                          "[&_.rdp-day_button:hover]:bg-yellow-50",
                          "[&_.rdp-day_button.rdp-day_selected]:bg-yellow-500",
                          "[&_.rdp-day_button.rdp-day_selected]:text-white",
                          "[&_.rdp-day_button.rdp-day_selected]:hover:bg-yellow-600",
                          "[&_.rdp-nav_button]:hover:bg-yellow-50 [&_.rdp-nav_button]:p-2 [&_.rdp-nav_button]:rounded-full",
                          "[&_.rdp-head_cell]:text-blue-600 [&_.rdp-head_cell]:font-semibold",
                          "[&_.rdp-day_button.rdp-day_disabled]:text-gray-300 [&_.rdp-day_button.rdp-day_disabled]:line-through",
                          "[&_.rdp-day_button.rdp-day_disabled]:bg-gray-50",
                        )}
                      />
                    </div>
                  )}
                  
                  <div className="mt-8 flex justify-center">
                    <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                      <div className="flex items-center justify-center bg-white rounded-lg border border-gray-100 shadow-sm py-3">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-800">Selected</span>
                      </div>
                      <div className="flex items-center justify-center bg-white rounded-lg border border-gray-100 shadow-sm py-3">
                        <div className="w-4 h-4 bg-white border border-gray-300 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-800">Available</span>
                      </div>
                      <div className="flex items-center justify-center bg-white rounded-lg border border-gray-100 shadow-sm py-3">
                        <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-800">Unavailable</span>
                      </div>
                    </div>
                  </div>
                  
                  {date && (
                    <div className="mt-8 bg-gradient-to-r from-yellow-50 to-blue-50 rounded-xl border border-yellow-100 p-6">
                      <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                        <CalendarClock className="h-5 w-5 mr-2" />
                        Selected Date
                      </h4>
                      <div className="flex flex-col">
                        <span className="text-blue-900 font-bold text-xl">
                          {format(date, 'EEEE, MMMM d, yyyy')}
                        </span>
                        <p className="mt-2 text-blue-700">
                          {timeSlots.length > 0 
                            ? `${timeSlots.filter(slot => slot.isAvailable).length} time slots available` 
                            : 'Checking available time slots...'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center bg-gray-50 rounded-xl p-8">
                  <div className="text-center">
                    <CalendarPlus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-500 mb-2">No Calendar Selected</h3>
                    <p className="text-gray-400">Calendar information unavailable</p>
                  </div>
                </div>
              )}
            </div>

            {/* Available Time Slots - Right side (4 columns on large screens) */}
            <div className="lg:col-span-4 bg-gradient-to-b from-blue-50 to-white p-6 lg:p-8 border-l border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-yellow-100 p-2 rounded-full mr-3">
                  <CalendarClock className="h-5 w-5 text-yellow-600" />
                </span>
                Available Times
              </h3>
              
              <div className="mt-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-gray-500">Loading available slots...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                    <p className="text-red-600 mb-3">
                      {error.includes("Failed to fetch") ? 
                        "We couldn't load the available time slots. Please try again or select a different date." : 
                        error}
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full bg-white hover:bg-red-50 border-red-200 text-red-600"
                      onClick={fetchAvailableSlots}
                    >
                      Retry
                    </Button>
                  </div>
                ) : timeSlots.length > 0 ? (
                  <>
                    <p className="text-gray-500 mb-4">
                      Select a time slot below to book your solar consultation
                    </p>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {timeSlots.map((slot) => (
                        <Button
                          key={slot.id}
                          variant={slot.isAvailable ? "outline" : "ghost"}
                          className={cn(
                            "w-full transition-all duration-200 rounded-xl py-6",
                            slot.isAvailable 
                              ? "border-yellow-200 hover:bg-yellow-50 hover:border-yellow-300 text-gray-700 bg-white" 
                              : "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400"
                          )}
                          onClick={() => handleTimeSlotSelect(slot)}
                          disabled={!slot.isAvailable}
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                    <CalendarClock className="h-16 w-16 text-yellow-300 mx-auto mb-4" />
                    {date ? (
                      <>
                        <h4 className="text-lg font-semibold text-gray-700 mb-2">No Available Slots</h4>
                        <p className="text-gray-500 mb-4">
                          No time slots available for the selected date.
                        </p>
                        <p className="text-gray-400 text-sm">
                          Please select a different date to see available times.
                        </p>
                      </>
                    ) : (
                      <>
                        <h4 className="text-lg font-semibold text-gray-700 mb-2">Select a Date First</h4>
                        <p className="text-gray-500">
                          Please select a date from the calendar to view available time slots.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Dialog - Updated styling with solar theme */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent className="rounded-xl border-none">
          <AlertDialogHeader>
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 -mx-6 -mt-6 p-6 rounded-t-xl border-b border-yellow-400 mb-6 text-white">
              <AlertDialogTitle className="text-xl">Confirm Your Solar Consultation</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-700 text-base">
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-gray-100 p-4 flex items-center">
                  <CalendarClock className="h-5 w-5 text-yellow-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-medium text-gray-800">
                      {date && format(date, 'MMMM d, yyyy')} at {selectedSlot?.time}
                    </p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-100 p-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">Solar Design Expert</p>
                    <p className="font-medium text-gray-800">{salesRep?.name || "Our solar designer"}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-blue-700">
                    Your consultation will include a personalized assessment of your home's solar potential and estimated energy savings.
                  </p>
                </div>
              </div>
              
              <p className="mt-6 text-center text-gray-600">
                Would you like to confirm this solar design consultation?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-lg bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmBooking} 
              disabled={isLoading}
              className="rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Booking...
                </span>
              ) : 'Confirm Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ErrorDialog
        isOpen={isErrorDialogOpen}
        onClose={() => setIsErrorDialogOpen(false)}
        error={bookingError}
      />
      
      {/* Add custom scrollbar styles - using regular style tag */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }
        `
      }} />
    </div>
  );
}

export default SchedulingCalendar;
