/**
 * Date Utilities
 *
 * Provides safe date operations with validation to prevent:
 * - Invalid date objects
 * - NaN from date arithmetic
 * - Unreasonable date ranges
 */

/**
 * Check if a value is a valid Date object
 */
export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate that a date is within a reasonable range for financial data
 * Default range: 1970 to current year + 10
 */
export function isReasonableDate(date: Date, options?: {
  minYear?: number;
  maxYear?: number;
}): boolean {
  if (!isValidDate(date)) {
    return false;
  }

  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();

  const minYear = options?.minYear ?? 1970;
  const maxYear = options?.maxYear ?? (currentYear + 10);

  return year >= minYear && year <= maxYear;
}

/**
 * Safely calculate the difference between two dates in days
 * Returns null if either date is invalid
 */
export function daysBetween(date1: Date, date2: Date): number | null {
  if (!isValidDate(date1) || !isValidDate(date2)) {
    return null;
  }

  const diff = date2.getTime() - date1.getTime();
  return diff / (1000 * 60 * 60 * 24);
}

/**
 * Safely calculate the absolute difference between two dates in days
 * Returns null if either date is invalid
 */
export function absDaysBetween(date1: Date, date2: Date): number | null {
  const days = daysBetween(date1, date2);
  return days !== null ? Math.abs(days) : null;
}

/**
 * Calculate months between two dates with partial month support
 * Uses actual days divided by average days per month (30.44)
 * Returns null if either date is invalid or end < start
 */
export function monthsBetween(startDate: Date, endDate: Date): number | null {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return null;
  }

  if (endDate < startDate) {
    return null;
  }

  const days = daysBetween(startDate, endDate);
  if (days === null) {
    return null;
  }

  // Average days per month
  return days / 30.44;
}

/**
 * Check if two dates are on the same day (ignoring time)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  if (!isValidDate(date1) || !isValidDate(date2)) {
    return false;
  }

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if two dates are within N days of each other
 */
export function isWithinDays(date1: Date, date2: Date, days: number): boolean {
  const diff = absDaysBetween(date1, date2);
  return diff !== null && diff <= days;
}

/**
 * Get the start of day (00:00:00.000) for a date
 */
export function startOfDay(date: Date): Date | null {
  if (!isValidDate(date)) {
    return null;
  }

  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of day (23:59:59.999) for a date
 */
export function endOfDay(date: Date): Date | null {
  if (!isValidDate(date)) {
    return null;
  }

  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Parse a date string and validate it
 * Returns null if parsing fails or date is invalid
 */
export function parseAndValidateDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    if (!isValidDate(date)) {
      return null;
    }
    if (!isReasonableDate(date)) {
      console.warn(`Date outside reasonable range: ${dateString}`);
      return null;
    }
    return date;
  } catch (error) {
    console.error(`Failed to parse date: ${dateString}`, error);
    return null;
  }
}

/**
 * Safely add days to a date
 * Returns null if date is invalid
 */
export function addDays(date: Date, days: number): Date | null {
  if (!isValidDate(date)) {
    return null;
  }

  const result = new Date(date);
  result.setDate(result.getDate() + days);

  return isValidDate(result) ? result : null;
}

/**
 * Safely add months to a date
 * Returns null if date is invalid
 */
export function addMonths(date: Date, months: number): Date | null {
  if (!isValidDate(date)) {
    return null;
  }

  const result = new Date(date);
  result.setMonth(result.getMonth() + months);

  return isValidDate(result) ? result : null;
}

/**
 * Format date as YYYY-MM-DD (ISO date string)
 * Returns null if date is invalid
 */
export function formatISODate(date: Date): string | null {
  if (!isValidDate(date)) {
    return null;
  }

  return date.toISOString().split('T')[0];
}

/**
 * Get month key for grouping (YYYY-MM format)
 * Returns null if date is invalid
 */
export function getMonthKey(date: Date): string | null {
  if (!isValidDate(date)) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get quarter key for grouping (YYYY-Q1, YYYY-Q2, etc.)
 * Returns null if date is invalid
 */
export function getQuarterKey(date: Date): string | null {
  if (!isValidDate(date)) {
    return null;
  }

  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

/**
 * Validate a date range
 * Returns true if both dates are valid and start <= end
 */
export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return false;
  }

  return startDate <= endDate;
}

/**
 * Get the minimum valid date from an array
 * Returns null if array is empty or all dates are invalid
 */
export function minDate(dates: Date[]): Date | null {
  const validDates = dates.filter(isValidDate);
  if (validDates.length === 0) {
    return null;
  }

  return new Date(Math.min(...validDates.map(d => d.getTime())));
}

/**
 * Get the maximum valid date from an array
 * Returns null if array is empty or all dates are invalid
 */
export function maxDate(dates: Date[]): Date | null {
  const validDates = dates.filter(isValidDate);
  if (validDates.length === 0) {
    return null;
  }

  return new Date(Math.max(...validDates.map(d => d.getTime())));
}

/**
 * Sort dates in ascending order, filtering out invalid dates
 */
export function sortDates(dates: Date[]): Date[] {
  return dates
    .filter(isValidDate)
    .sort((a, b) => a.getTime() - b.getTime());
}
