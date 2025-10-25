/**
 * Business Hours Utilities
 * Parse and calculate shop open/closed status
 */

export interface DaySchedule {
  isOpen: boolean;
  open?: string;
  close?: string;
}

export interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

/**
 * Parse business hours from database format to BusinessHours interface
 * Database format: { "monday": "9:00-20:00", ... }
 * Output format: { "monday": { isOpen: true, open: "9:00", close: "20:00" }, ... }
 */
export function parseBusinessHours(dbHours: any): BusinessHours | null {
  if (!dbHours || typeof dbHours !== 'object') {
    return null;
  }

  const days: (keyof BusinessHours)[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  const result: any = {};

  for (const day of days) {
    const dayValue = dbHours[day];
    
    if (!dayValue) {
      // Day is closed
      result[day] = { isOpen: false };
      continue;
    }

    // Check if it's already in the correct format (has isOpen property)
    if (typeof dayValue === 'object' && 'isOpen' in dayValue) {
      result[day] = dayValue;
      continue;
    }

    // Parse "9:00-20:00" format if it's a string
    if (typeof dayValue === 'string') {
      const parts = dayValue.split('-');
      if (parts.length === 2) {
        result[day] = {
          isOpen: true,
          open: parts[0].trim(),
          close: parts[1].trim(),
        };
      } else {
        result[day] = { isOpen: false };
      }
    } else {
      result[day] = { isOpen: false };
    }
  }

  return result as BusinessHours;
}

export interface ShopStatus {
  isOpen: boolean;
  nextStatusChange: string;
  todayHours: string;
}

/**
 * Parse time string to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to time string
 */
function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get current day of week in lowercase using local time
 */
function getCurrentDay(): keyof BusinessHours {
  const days: (keyof BusinessHours)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  // Use local time for day determination
  const localDate = new Date();
  return days[localDate.getDay()];
}

/**
 * Get next day of week
 */
function getNextDay(currentDay: keyof BusinessHours): keyof BusinessHours {
  const days: (keyof BusinessHours)[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];
  const currentIndex = days.indexOf(currentDay);
  return days[(currentIndex + 1) % 7];
}

/**
 * Calculate shop status based on business hours
 */
export function calculateShopStatus(
  businessHours: BusinessHours | null | undefined | any
): ShopStatus {
  // Parse business hours if in database format
  const parsedHours = parseBusinessHours(businessHours);
  
  // Default closed status if no business hours
  if (!parsedHours) {
    return {
      isOpen: false,
      nextStatusChange: 'Hours not available',
      todayHours: 'Hours not available',
    };
  }

  // Use local time for all calculations
  const now = new Date();
  const currentDay = getCurrentDay();
  // Get local time hours and minutes
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const todaySchedule = parsedHours[currentDay];

  // If closed all day
  if (!todaySchedule?.isOpen) {
    // Find next opening day
    let nextDay = getNextDay(currentDay);
    let daysChecked = 0;
    
    while (daysChecked < 7) {
      const nextSchedule = parsedHours[nextDay];
      if (nextSchedule?.isOpen && nextSchedule.open) {
        const dayName = nextDay.charAt(0).toUpperCase() + nextDay.slice(1);
        return {
          isOpen: false,
          nextStatusChange: daysChecked === 0 
            ? `Opens tomorrow at ${formatMinutesToTime(parseTimeToMinutes(nextSchedule.open))}`
            : `Opens ${dayName} at ${formatMinutesToTime(parseTimeToMinutes(nextSchedule.open))}`,
          todayHours: 'Closed today',
        };
      }
      nextDay = getNextDay(nextDay);
      daysChecked++;
    }
    
    return {
      isOpen: false,
      nextStatusChange: 'Closed',
      todayHours: 'Closed today',
    };
  }

  // Shop has hours today
  const openMinutes = parseTimeToMinutes(todaySchedule.open!);
  const closeMinutes = parseTimeToMinutes(todaySchedule.close!);
  
  const todayHours = `${formatMinutesToTime(openMinutes)} - ${formatMinutesToTime(closeMinutes)}`;

  // Check if currently open
  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    return {
      isOpen: true,
      nextStatusChange: `Closes at ${formatMinutesToTime(closeMinutes)}`,
      todayHours,
    };
  }

  // Currently closed - check if before opening or after closing
  if (currentMinutes < openMinutes) {
    return {
      isOpen: false,
      nextStatusChange: `Opens at ${formatMinutesToTime(openMinutes)}`,
      todayHours,
    };
  }

  // After closing - find next opening
  let nextDay = getNextDay(currentDay);
  let daysChecked = 0;
  
  while (daysChecked < 7) {
    const nextSchedule = parsedHours[nextDay];
    if (nextSchedule?.isOpen && nextSchedule.open) {
      const dayName = nextDay.charAt(0).toUpperCase() + nextDay.slice(1);
      return {
        isOpen: false,
        nextStatusChange: daysChecked === 0 
          ? `Opens tomorrow at ${formatMinutesToTime(parseTimeToMinutes(nextSchedule.open))}`
          : `Opens ${dayName} at ${formatMinutesToTime(parseTimeToMinutes(nextSchedule.open))}`,
        todayHours,
      };
    }
    nextDay = getNextDay(nextDay);
    daysChecked++;
  }

  return {
    isOpen: false,
    nextStatusChange: 'Closed',
    todayHours,
  };
}

/**
 * Get today's hours formatted
 */
export function getTodayHours(businessHours: BusinessHours | null | undefined | any): string {
  // Parse business hours if in database format
  const parsedHours = parseBusinessHours(businessHours);
  
  if (!parsedHours) return 'Hours not available';
  
  const currentDay = getCurrentDay();
  const todaySchedule = parsedHours[currentDay];
  
  if (!todaySchedule?.isOpen) {
    return 'Closed today';
  }
  
  const openMinutes = parseTimeToMinutes(todaySchedule.open!);
  const closeMinutes = parseTimeToMinutes(todaySchedule.close!);
  
  return `${formatMinutesToTime(openMinutes)} - ${formatMinutesToTime(closeMinutes)}`;
}
