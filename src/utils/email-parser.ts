/**
 * ENEOS Sales Automation - Email Parser Utility
 * Extract domain and validate email addresses
 */

/**
 * Extract domain from email address
 *
 * @param email - Email address
 * @returns Domain string (lowercase)
 *
 * @example
 * extractDomain('John.Doe@SCG.com') // 'scg.com'
 */
export function extractDomain(email: string): string {
  if (!email || !email.includes('@')) {
    return '';
  }

  const parts = email.toLowerCase().split('@');
  return parts[1] || '';
}

/**
 * Normalize email address to lowercase
 *
 * @param email - Email address
 * @returns Normalized email (lowercase, trimmed)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validate email format
 *
 * @param email - Email address to validate
 * @returns boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if email is from a personal/free email provider
 * Used to filter out non-business emails
 *
 * @param email - Email address to check
 * @returns boolean indicating if email is from free provider
 */
export function isFreeEmailProvider(email: string): boolean {
  const freeProviders = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'live.com',
    'icloud.com',
    'mail.com',
    'protonmail.com',
    'ymail.com',
    'aol.com',
  ];

  const domain = extractDomain(email);
  return freeProviders.includes(domain);
}

/**
 * Extract company name from email domain
 * Simple heuristic: take first part before TLD
 *
 * @param email - Email address
 * @returns Estimated company name
 *
 * @example
 * guessCompanyFromEmail('info@scg.co.th') // 'SCG'
 */
export function guessCompanyFromEmail(email: string): string {
  const domain = extractDomain(email);

  if (!domain) {return '';}

  // Remove common TLDs and subdomains
  const parts = domain.split('.');
  const companyPart = parts[0];

  // Capitalize
  return companyPart.toUpperCase();
}

/**
 * Create deduplication key from email and campaign
 *
 * @param email - Email address
 * @param leadSource - Lead source (e.g., Website, LinkedIn, Trade Show)
 * @returns Composite key for deduplication
 */
export function createDedupKey(email: string, leadSource: string): string {
  return `${normalizeEmail(email)}_${leadSource || 'unknown'}`;
}
