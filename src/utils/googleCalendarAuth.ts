import { supabase } from "@/integrations/supabase/client";

// This is now the company's calendar where appointments will be booked
// If no specific calendar ID is specified, use primary
const COMPANY_CALENDAR_ID = 'primary';

export const getAvailableSlots = async (date: Date, calendarId: string) => {
  try {
    const origin = window.location.origin;
    
    console.log(`Getting available slots for calendar: ${calendarId} on date: ${date.toISOString()}`);
    
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { 
        date: date.toISOString(),
        calendarId: calendarId,
        action: 'getAvailableSlots',
        origin
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message);
    }
    
    if (data?.error) {
      console.error('Error fetching available slots:', data.error);
      throw new Error(data.error);
    }
    
    console.log(`Retrieved ${data?.slots?.length || 0} available slots`);
    return data.slots;
  } catch (error: any) {
    console.error('Failed to fetch available slots:', error);
    throw new Error(error.message || 'Failed to fetch available slots');
  }
};

// New function to get busy days for the month without exposing meeting details
export const getBusyDaysForMonth = async (month: number, year: number, calendarId: string) => {
  try {
    const origin = window.location.origin;
    
    console.log(`Getting busy days for calendar: ${calendarId} in month: ${month+1}/${year}`);
    
    // Create start and end date for the month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of the month
    
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { 
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        calendarId: calendarId,
        action: 'getBusyDays',
        origin
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message);
    }
    
    if (data?.error) {
      console.error('Error fetching busy days:', data.error);
      throw new Error(data.error);
    }
    
    console.log(`Retrieved ${data?.busyDays?.length || 0} busy days`);
    return data.busyDays;
  } catch (error: any) {
    console.error('Failed to fetch busy days:', error);
    throw new Error(error.message || 'Failed to fetch busy days');
  }
};

export const bookAppointment = async (
  startTime: string,
  endTime: string,
  bookingDetails: {
    name: string;
    email: string;
    notes?: string;
  },
  calendarId: string = COMPANY_CALENDAR_ID // Add optional calendarId parameter with default
) => {
  try {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const origin = window.location.origin;
    
    // Format the date strings properly
    const formatTimeString = (timeStr: string) => {
      // Extract the date part and time part
      const [datePart, timePart] = timeStr.split('T');
      
      // Handle time format with potential AM/PM
      let formattedTime = timePart;
      if (formattedTime.includes('AM') || formattedTime.includes('PM')) {
        // Parse the time properly
        const timeComponents = formattedTime.split(':');
        let hours = parseInt(timeComponents[0]);
        const minutes = timeComponents[1].replace('AM', '').replace('PM', '');
        
        // Convert to 24-hour format if PM
        if (formattedTime.includes('PM') && hours < 12) {
          hours += 12;
        }
        // Handle 12 AM case
        if (formattedTime.includes('AM') && hours === 12) {
          hours = 0;
        }
        
        formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}:00`;
      }
      
      return `${datePart}T${formattedTime}`;
    };
    
    const formattedStartTime = formatTimeString(startTime);
    const formattedEndTime = formatTimeString(endTime);
    
    console.log('Booking appointment with formatted times:', { formattedStartTime, formattedEndTime });
    console.log('Using calendar ID:', calendarId);
    
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { 
        startTime: formattedStartTime, 
        endTime: formattedEndTime, 
        timeZone: userTimeZone,
        summary: `Meeting with ${bookingDetails.name}`,
        description: `Booking details:\nName: ${bookingDetails.name}\nEmail: ${bookingDetails.email}\nNotes: ${bookingDetails.notes || 'No notes provided'}`,
        calendarId: calendarId, // Use the provided calendarId instead of COMPANY_CALENDAR_ID
        action: 'bookAppointment',
        origin
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message || 'Failed to book appointment');
    }
    
    if (data?.error) {
      console.error('Booking error from function:', data.error);
      throw new Error(data.error);
    }

    console.log('Successfully booked appointment');
    return true;
  } catch (error: any) {
    console.error('Failed to book appointment:', error);
    throw new Error(error.message || 'Failed to book the appointment');
  }
};

// Service account testing function
export const testCalendarServiceAccount = async () => {
  try {
    const origin = window.location.origin;
    
    const { data, error } = await supabase.functions.invoke('calendar-test', {
      body: { origin }
    });
    
    if (error) {
      console.error('Function error:', error);
      throw new Error(error.message);
    }
    
    console.log('Service account test result:', data);
    return data;
  } catch (error: any) {
    console.error('Failed to test service account:', error);
    throw new Error(error.message || 'Failed to test service account');
  }
};

// Type definition for OAuth responses
interface AuthCallbackResponse {
  success: boolean;
  message?: string;
  error?: string;
  refreshToken?: string;
  accessToken?: string;
}

// Updated handleAuthCallback function with proper return type
export const handleAuthCallback = async (code: string): Promise<AuthCallbackResponse> => {
  console.warn('handleAuthCallback is deprecated. Using service account instead.');
  try {
    // Check if service account is configured
    const result = await testCalendarServiceAccount();
    
    return {
      success: result?.isConfigured || false,
      message: 'Service account authentication used instead of OAuth',
      error: result?.isConfigured ? undefined : 'Service account not properly configured',
      // Add empty strings for refreshToken and accessToken to maintain compatibility
      refreshToken: '',
      accessToken: ''
    };
  } catch (error: any) {
    console.error('Service account error:', error);
    return {
      success: false,
      error: error.message || 'Service account configuration error',
      refreshToken: '',
      accessToken: ''
    };
  }
};

export const saveRefreshToken = async (refreshToken: string): Promise<AuthCallbackResponse> => {
  console.warn('saveRefreshToken is deprecated. Using service account instead.');
  // This is a stub that doesn't actually save anything
  return {
    success: true,
    message: 'Service account authentication used instead of OAuth - no refresh token needed',
    refreshToken: ''
  };
};
