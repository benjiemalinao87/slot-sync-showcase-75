import { supabase } from '@/integrations/supabase/client';

// Constants for Supabase
const SUPABASE_URL = 'https://xpwdtjmtaqzrjyeazszz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwd2R0am10YXF6cmp5ZWF6c3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk2ODg0MTcsImV4cCI6MjAyNTI2NDQxN30.LTwyEEH8GGULmS-p-qWdRSxZNQUUQN8tHm_Ej-dKM44';

// Helper function to handle API responses
async function handleResponse(response: Response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  
  if (!response.ok) {
    const errorBody = isJson ? await response.json() : await response.text();
    console.error('API Error:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: errorBody
    });
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  if (!isJson) {
    console.warn('Unexpected content type:', contentType);
    return await response.text();
  }
  
  return await response.json();
}

/**
 * Tests the Google Calendar integration by fetching available slots
 * @param calendarId - The email of the calendar to fetch slots from
 * @param date - The date to fetch slots for (defaults to today)
 */
export async function testCalendarIntegration(
  calendarId: string,
  date = new Date()
) {
  console.log('Testing Google Calendar integration...');
  console.log(`Calendar ID: ${calendarId}`);
  console.log(`Date: ${date.toISOString().split('T')[0]}`);
  
  try {
    const headers = {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };
    
    console.log('Request headers:', headers);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/calendar-test`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'getAvailableSlots',
        date: date.toISOString().split('T')[0],
        calendarId
      })
    });

    const data = await handleResponse(response);
    console.log('Response data:', data);
    
    return { 
      success: true, 
      data,
      availableSlotCount: data?.slots?.filter(slot => slot.isAvailable)?.length || 0
    };
  } catch (error) {
    console.error('Error testing calendar integration:', error);
    throw error;
  }
}

/**
 * Tests the service account configuration
 */
export async function testServiceAccountConfig() {
  console.log('Starting service account configuration test...');
  
  try {
    const headers = {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };
    
    console.log('Request headers:', headers);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/calendar-test`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'checkConfiguration' })
    });

    const data = await handleResponse(response);
    console.log('Response data:', data);
    
    return { 
      success: true, 
      data,
      isConfigured: data?.isConfigured || false
    };
  } catch (error) {
    console.error('Error testing service account config:', error);
    throw error;
  }
}

/**
 * Test booking an appointment using the service account
 */
export async function testBookAppointment(
  calendarId: string,
  startTime: string,
  endTime: string,
  summary: string,
  description: string
) {
  console.log('Testing appointment booking...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/calendar-test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'bookAppointment',
        calendarId,
        startTime,
        endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        summary,
        description
      })
    });

    if (!response.ok) {
      throw new Error('Failed to book appointment');
    }

    const data = await response.json();
    console.log('Booking response:', data);
    
    return { 
      success: true, 
      data,
      eventId: data?.event?.id || null
    };
  } catch (error) {
    console.error('Error booking appointment:', error);
    throw error;
  }
}

// Export a simple function to run all tests
export async function runAllTests(calendarId: string) {
  console.log('Running all calendar integration tests...');
  
  try {
    // Test configuration first
    const configTest = await testServiceAccountConfig();
    console.log('Configuration test result:', configTest.success ? 'PASSED' : 'FAILED');
    
    if (!configTest.success) {
      console.error('Configuration test failed. Cannot continue with other tests.');
      return {
        configTest,
        slotsTest: null,
        bookingTest: null,
        overallSuccess: false
      };
    }
    
    // Test available slots
    const slotsTest = await testCalendarIntegration(calendarId);
    console.log('Slots test result:', slotsTest.success ? 'PASSED' : 'FAILED');
    
    if (!slotsTest.success) {
      console.error('Slots test failed. Cannot continue with booking test.');
      return {
        configTest,
        slotsTest,
        bookingTest: null,
        overallSuccess: false
      };
    }
    
    // Test booking (with a test event)
    const bookingTest = await testBookAppointment(
      calendarId,
      new Date().toISOString(),
      new Date(Date.now() + 30 * 60000).toISOString(),
      'Test Appointment',
      'This is a test appointment'
    );
    
    console.log('Booking test result:', bookingTest.success ? 'PASSED' : 'FAILED');
    
    return {
      configTest,
      slotsTest,
      bookingTest,
      overallSuccess: configTest.success && slotsTest.success && bookingTest.success
    };
  } catch (error) {
    console.error('Error running all tests:', error);
    throw error;
  }
} 