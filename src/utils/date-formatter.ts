/**
 * ENEOS Sales Automation - Date Formatter Utility
 * Format dates for Google Sheets compatibility (Thai timezone)
 */

/**
 * Format date for Google Sheets (Thai timezone +7)
 * Output: "DD/MM/YYYY HH:MM:SS"
 */
export function formatDateForSheets(date: Date | string = new Date()): string {
  // Parse string date if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if valid date
  if (isNaN(dateObj.getTime())) {
    return formatDateForSheets(new Date()); // Fallback to current time
  }

  // Convert to Thai timezone (+7 hours)
  const thaiDate = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);

  const day = String(thaiDate.getUTCDate()).padStart(2, '0');
  const month = String(thaiDate.getUTCMonth() + 1).padStart(2, '0');
  const year = thaiDate.getUTCFullYear();
  const hours = String(thaiDate.getUTCHours()).padStart(2, '0');
  const minutes = String(thaiDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(thaiDate.getUTCSeconds()).padStart(2, '0');

  // Prefix with single quote to force Google Sheets to treat as text
  return `'${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get current time formatted for Google Sheets
 */
export function getCurrentThaiTime(): string {
  return formatDateForSheets(new Date());
}
