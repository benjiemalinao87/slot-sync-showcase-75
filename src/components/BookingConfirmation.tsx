import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Calendar, ArrowRight } from "lucide-react";
import { format } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';

interface BookingConfirmationProps {
  bookingDetails?: {
    date: Date | string;
    startTime: Date | string;
    endTime: Date | string;
    rep: {
      name: string;
      email: string;
      image_url?: string;
    };
  };
}

export function BookingConfirmation({ bookingDetails: propBookingDetails }: BookingConfirmationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  
  useEffect(() => {
    const safelyParseDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
          console.error('Invalid date string:', dateStr);
          // Return current date as fallback
          return new Date();
        }
        return date;
      } catch (e) {
        console.error('Error parsing date:', e);
        // Return current date as fallback
        return new Date();
      }
    };

    // First try to get booking details from props
    if (propBookingDetails) {
      // Convert string dates to Date objects if needed
      const processedDetails = {
        ...propBookingDetails,
        date: typeof propBookingDetails.date === 'string' 
          ? safelyParseDate(propBookingDetails.date) 
          : propBookingDetails.date,
        startTime: typeof propBookingDetails.startTime === 'string' 
          ? safelyParseDate(propBookingDetails.startTime) 
          : propBookingDetails.startTime,
        endTime: typeof propBookingDetails.endTime === 'string' 
          ? safelyParseDate(propBookingDetails.endTime) 
          : propBookingDetails.endTime
      };
      setBookingDetails(processedDetails);
      return;
    }
    
    // Next try to get booking details from location state
    const stateDetails = location.state?.bookingDetails;
    if (stateDetails) {
      // Convert string dates to Date objects if needed
      const processedDetails = {
        ...stateDetails,
        date: typeof stateDetails.date === 'string' 
          ? safelyParseDate(stateDetails.date) 
          : stateDetails.date,
        startTime: typeof stateDetails.startTime === 'string' 
          ? safelyParseDate(stateDetails.startTime) 
          : stateDetails.startTime,
        endTime: typeof stateDetails.endTime === 'string' 
          ? safelyParseDate(stateDetails.endTime) 
          : stateDetails.endTime
      };
      setBookingDetails(processedDetails);
      return;
    }
    
    // Finally try to get booking details from sessionStorage
    const lastBookingStr = sessionStorage.getItem('lastBooking');
    if (lastBookingStr) {
      try {
        const parsedBooking = JSON.parse(lastBookingStr);
        // Convert string dates to Date objects
        const processedDetails = {
          ...parsedBooking,
          date: typeof parsedBooking.date === 'string' 
            ? safelyParseDate(parsedBooking.date) 
            : parsedBooking.date,
          startTime: typeof parsedBooking.startTime === 'string' 
            ? safelyParseDate(parsedBooking.startTime) 
            : parsedBooking.startTime,
          endTime: typeof parsedBooking.endTime === 'string' 
            ? safelyParseDate(parsedBooking.endTime) 
            : parsedBooking.endTime
        };
        setBookingDetails(processedDetails);
      } catch (e) {
        console.error('Error parsing booking details from session storage:', e);
      }
    }
  }, [propBookingDetails, location.state]);
  
  if (!bookingDetails) {
    return (
      <div className="text-center p-8">
        <p>No booking details found. Please try again.</p>
        <Button onClick={() => navigate('/')} className="mt-4">Go Home</Button>
      </div>
    );
  }
  
  const { date, startTime, endTime, rep } = bookingDetails;
  

  
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl relative">
      {/* Solar-themed background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-40 right-10 w-64 h-64 bg-yellow-300 rounded-full opacity-10"></div>
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-blue-600 rounded-full opacity-5"></div>
      </div>
    
      <Card className="border-none shadow-xl rounded-xl overflow-hidden relative z-10">
        <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-center p-8 text-white relative overflow-hidden">
          {/* Solar panel pattern background */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-6 gap-1 w-full h-full">
              {Array(24).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-sm"></div>
              ))}
            </div>
          </div>
          
          <div className="relative z-10">
            <div className="mx-auto bg-white/20 backdrop-blur-md rounded-full p-4 w-20 h-20 flex items-center justify-center shadow-lg mb-6">
              <Check className="h-12 w-12 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold mb-2">Appointment Confirmed!</CardTitle>
            <CardDescription className="text-yellow-100 text-lg opacity-90">
              Your solar consultation has been scheduled successfully
            </CardDescription>
          </div>
          
          {/* Sun rays */}
          <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 w-[300px] h-[300px] opacity-20">
            {Array(12).fill(0).map((_, i) => (
              <div 
                key={i} 
                className="absolute w-2 h-48 bg-white origin-bottom" 
                style={{ transform: `rotate(${i * 30}deg)` }}
              ></div>
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="p-8 space-y-8 bg-white">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center text-lg">
                <Calendar className="h-5 w-5 mr-2 text-yellow-600" />
                Appointment Details
              </h3>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-xl space-y-4 border border-yellow-100 shadow-sm">
                <div className="flex items-center">
                  <div className="bg-yellow-200 rounded-full p-2 mr-3">
                    <Calendar className="h-5 w-5 text-yellow-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-800">{format(date, 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="bg-yellow-200 rounded-full p-2 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium text-gray-800">{format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center text-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Your Solar Design Expert
              </h3>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-100 shadow-sm">
                <div className="flex items-center">
                  <div className="mr-4">
                    <div className="relative">
                      <img 
                        src={rep.image_url || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158"} 
                        alt={rep.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                      />
                      <div className="absolute bottom-0 right-0 bg-yellow-500 rounded-full w-4 h-4 border-2 border-white"></div>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{rep.name}</p>
                    <p className="text-gray-500">{rep.email}</p>
                    <p className="mt-2 text-sm bg-blue-500 text-white rounded-full px-3 py-1 inline-block">Solar Design Expert</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-6 mt-6 border-t border-gray-100">
            <p className="text-center text-gray-600 mb-6">
              We're looking forward to helping you discover the benefits of solar energy! Your appointment has been successfully booked.
            </p>
            
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => navigate('/')} 
                className="w-full md:w-auto rounded-lg py-6 text-base border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                Return to Home <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
          
          <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex items-start">
              <div className="bg-yellow-500 rounded-full p-2 shadow-sm mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">What to expect next</h4>
                <p className="text-blue-100">
                  You'll receive a confirmation email with all your appointment details. Your solar design expert will contact you at the scheduled time to discuss your home's solar energy potential.
                </p>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-blue-500 text-center">
              <div>
                <div className="text-xl font-bold text-yellow-300">Step 1</div>
                <p className="text-blue-100 text-sm">Consultation Call</p>
              </div>
              <div>
                <div className="text-xl font-bold text-yellow-300">Step 2</div>
                <p className="text-blue-100 text-sm">Custom Design</p>
              </div>
              <div>
                <div className="text-xl font-bold text-yellow-300">Step 3</div>
                <p className="text-blue-100 text-sm">Solar Installation</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BookingConfirmation; 