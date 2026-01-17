/**
 * ENEOS Sales Automation - Date Formatter Utility
 * Format dates for Google Sheets in ISO 8601 format
 * Supports parsing both legacy Thai format and ISO format
 */

/**
 * Format date for Google Sheets (ISO 8601 format)
 * Output: "YYYY-MM-DDTHH:MM:SS.sssZ"
 *
 * Changed from Thai format (DD/MM/YYYY HH:MM:SS) to ISO for:
 * - Easier date comparison and filtering
 * - No timezone conversion issues
 * - Standard format for APIs
 */
export function formatDateForSheets(date: Date | string = new Date()): string {
  // Parse string date if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if valid date
  if (isNaN(dateObj.getTime())) {
    return formatDateForSheets(new Date()); // Fallback to current time
  }

  // Return ISO format (e.g., "2026-01-15T09:30:00.000Z")
  return dateObj.toISOString();
}

/**
 * Get current time as ISO timestamp for Google Sheets
 * @deprecated Use formatDateForSheets() or formatISOTimestamp() directly
 */
export function getCurrentThaiTime(): string {
  return formatDateForSheets(new Date());
}

/**
 * Get current time as ISO timestamp
 * Preferred over getCurrentThaiTime() after ISO migration
 */
export function getCurrentTimestamp(): string {
  return formatDateForSheets(new Date());
}

/**
 * Parse date from Google Sheets format (Thai format) or ISO format
 * Input: "DD/MM/YYYY HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS.sssZ"
 * Output: Date object
 */
export function parseDateFromSheets(dateStr: string): Date {
  if (!dateStr) {
    return new Date();
  }

  // Try ISO format first (2026-01-11T08:34:02.990Z)
  if (dateStr.includes('T')) {
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
  }

  // Parse Thai format (D/M/YYYY, HH:MM:SS or DD/MM/YYYY HH:MM:SS)
  // Supports: 11/1/2026, 16:56:06 or 11/01/2026 16:56:06
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, day, month, year, hours, minutes, seconds] = match;
    // Create date in Thai timezone, then convert to UTC
    const thaiDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
    // Subtract 7 hours to get UTC (since the stored time is Thai time)
    return new Date(thaiDate.getTime() - 7 * 60 * 60 * 1000);
  }

  // Fallback: try native Date parsing
  const fallbackDate = new Date(dateStr);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }

  // Last resort: return current date
  return new Date();
}

/**
 * Extract date key (YYYY-MM-DD) from Thai format or ISO format
 * For grouping leads by date
 */
export function extractDateKey(dateStr: string): string {
  const date = parseDateFromSheets(dateStr);
  // Return in YYYY-MM-DD format for sorting
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date as ISO 8601 timestamp
 * Output: "2026-01-15T08:30:00.000Z"
 * Used for created_at and updated_at columns (future Supabase compatibility)
 */
export function formatISOTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}
