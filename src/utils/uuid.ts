/**
 * ENEOS Sales Automation - UUID Utilities
 * UUID generation for lead identification
 */

import { randomUUID } from 'crypto';

/**
 * Generate a unique Lead ID with prefix
 * Format: lead_<uuid>
 * @returns A unique lead identifier string
 */
export function generateLeadUUID(): string {
  return `lead_${randomUUID()}`;
}

/**
 * Validate if a string is a valid lead UUID format
 * @param id - The ID to validate
 * @returns True if valid lead UUID format
 */
export function isValidLeadUUID(id: string): boolean {
  // Format: lead_<uuid> where uuid is 36 chars (8-4-4-4-12 with hyphens)
  const leadUUIDRegex = /^lead_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return leadUUIDRegex.test(id);
}

/**
 * Extract the raw UUID from a lead UUID
 * @param leadUUID - The lead UUID (format: lead_<uuid>)
 * @returns The raw UUID without prefix, or null if invalid
 */
export function extractUUID(leadUUID: string): string | null {
  if (!isValidLeadUUID(leadUUID)) {
    return null;
  }
  return leadUUID.substring(5); // Remove 'lead_' prefix
}
