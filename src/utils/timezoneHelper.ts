export interface TimeSlot {
  id: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  isAvailable: boolean;
  time: string;      // Display time
}

export interface BusinessHours {
  start: number; // Hour in 24-hour format (e.g., 9 for 9 AM)
  end: number;   // Hour in 24-hour format (e.g., 17 for 5 PM)
  timezone: string; // User's timezone
}

/**
 * Filters time slots to only include those within business hours for the user's timezone
 */
export function filterSlotsForBusinessHours(
  slots: TimeSlot[], 
  businessHours: BusinessHours
): TimeSlot[] {
  return slots
    .filter(slot => {
      const startTime = new Date(slot.startTime);
      
      // Get the hour in the user's timezone
      const hourInUserTZ = parseInt(startTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        hour12: false,
        timeZone: businessHours.timezone
      }));
      
      // Check if the slot falls within business hours
      return hourInUserTZ >= businessHours.start && hourInUserTZ < businessHours.end;
    })
    .map(slot => ({
      ...slot,
      // Update the display time to show in user's timezone
      time: formatTimeInTimezone(slot.startTime, slot.endTime, businessHours.timezone)
    }));
}

/**
 * Formats a time slot for display in the user's timezone
 */
export function formatTimeInTimezone(
  startTime: string, 
  endTime: string, 
  timezone: string
): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  const startFormatted = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone
  });
  
  const endFormatted = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit', 
    hour12: false,
    timeZone: timezone
  });
  
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Gets default business hours (9 AM - 5 PM) for a timezone
 */
export function getDefaultBusinessHours(timezone: string): BusinessHours {
  return {
    start: 9,  // 9 AM
    end: 17,   // 5 PM
    timezone
  };
}

/**
 * Checks if a date falls on a weekend
 */
export function isWeekendInTimezone(date: Date, timezone: string): boolean {
  // Create a date string in the target timezone and check day of week
  const dayOfWeek = parseInt(date.toLocaleDateString('en-US', {
    weekday: 'numeric', // 0 = Sunday, 1 = Monday, etc.
    timeZone: timezone
  }));
  
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

/**
 * Converts a local time slot to the appropriate timezone-aware Date objects
 */
export function createTimezoneAwareDate(
  date: Date, 
  hour: number, 
  minute: number, 
  timezone: string
): Date {
  // Create the date in the user's timezone
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Create a date object that represents the correct time in the user's timezone
  return new Date(year, month, day, hour, minute, 0, 0);
}

/**
 * Validates that a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
} 