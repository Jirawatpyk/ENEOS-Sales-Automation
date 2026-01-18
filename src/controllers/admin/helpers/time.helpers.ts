/**
 * Time Helper Functions
 * Handles time calculations and date utilities
 */

/** Milliseconds in one minute */
const MS_PER_MINUTE = 1000 * 60;

/** Milliseconds in one day */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * คำนวณจำนวนนาทีระหว่าง 2 วันที่
 * @param start - ISO date string (start time)
 * @param end - ISO date string (end time)
 * @returns Number of minutes between dates, or 0 if invalid
 */
export function getMinutesBetween(start: string | null, end: string | null): number {
  if (!start || !end) {return 0;}
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_MINUTE);
}

/**
 * Get ISO week number from date
 * @param date - Date object to get week number from
 * @returns Week number (1-53)
 */
export function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / MS_PER_DAY;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Safely parse date to timestamp, returns 0 for invalid dates
 * @param dateStr - Date string to parse
 * @returns Timestamp in milliseconds, or 0 if invalid
 */
export function safeGetTime(dateStr: string): number {
  const time = new Date(dateStr).getTime();
  return isNaN(time) ? 0 : time;
}

/**
 * Calculate average from array of numbers
 * @param values - Array of numbers
 * @returns Average value, or 0 if empty array
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
