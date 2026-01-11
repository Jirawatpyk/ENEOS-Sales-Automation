/**
 * ENEOS Sales Automation - Phone Formatter Utility
 * Handles Thai phone number formatting
 */

/**
 * Format phone number to Thai standard format
 * Removes spaces, dashes, and converts +66 to 0
 *
 * @param phone - Raw phone number string
 * @returns Formatted phone number
 *
 * @example
 * formatPhone('+66812345678') // '0812345678'
 * formatPhone('081-234-5678') // '0812345678'
 * formatPhone('081 234 5678') // '0812345678'
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';

  return phone
    .replace(/\s+/g, '')      // Remove spaces
    .replace(/-/g, '')        // Remove dashes
    .replace(/^\+66/, '0')    // Convert +66 to 0
    .replace(/^66/, '0')      // Convert 66 to 0 (without +)
    .trim();
}

/**
 * Validate Thai phone number format
 *
 * @param phone - Phone number to validate
 * @returns boolean indicating if phone is valid
 */
export function isValidThaiPhone(phone: string): boolean {
  const formatted = formatPhone(phone);
  // Thai mobile: 08x, 09x | Thai landline: 02x-07x
  return /^0[2-9]\d{7,8}$/.test(formatted);
}

/**
 * Format phone number for display with dashes
 *
 * @param phone - Phone number to format
 * @returns Formatted display string
 *
 * @example
 * formatPhoneDisplay('0812345678') // '081-234-5678'
 */
export function formatPhoneDisplay(phone: string): string {
  const formatted = formatPhone(phone);

  if (formatted.length === 10) {
    // Mobile format: 081-234-5678
    return `${formatted.slice(0, 3)}-${formatted.slice(3, 6)}-${formatted.slice(6)}`;
  } else if (formatted.length === 9) {
    // Landline format: 02-123-4567
    return `${formatted.slice(0, 2)}-${formatted.slice(2, 5)}-${formatted.slice(5)}`;
  }

  return formatted;
}

/**
 * Create tel: URI for phone calls
 *
 * @param phone - Phone number
 * @returns tel: URI string
 */
export function createTelUri(phone: string): string {
  const formatted = formatPhone(phone);
  return `tel:${formatted}`;
}
