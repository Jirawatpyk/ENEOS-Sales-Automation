/**
 * Filter Helper Functions
 * Handles lead filtering by various criteria
 */

import { PeriodInfo } from '../../../types/admin.types.js';
import { LeadRow } from '../../../types/index.js';
import { parseDateFromSheets } from '../../../utils/date-formatter.js';
import { logger } from '../../../utils/logger.js';
import * as leadsService from '../../../services/leads.service.js';

/**
 * กรอง leads ตาม period
 */
export function filterByPeriod(leads: LeadRow[], period: PeriodInfo): LeadRow[] {
  const startTime = new Date(period.startDate).getTime();
  const endTime = new Date(period.endDate).getTime();

  return leads.filter((lead) => {
    const leadTime = parseDateFromSheets(lead.date).getTime();
    return leadTime >= startTime && leadTime <= endTime;
  });
}

/**
 * กรอง leads ตาม status (รองรับ comma-separated values)
 *
 * Note: "claimed" เป็น special status สำหรับ filter - หมายถึง leads ที่มี salesOwnerId
 * (ไม่ใช่ค่า status จริงใน database)
 */
export function filterByStatus(leads: LeadRow[], status: string): LeadRow[] {
  const statuses = status.split(',').map((s) => s.trim().toLowerCase());

  return leads.filter((lead) => {
    // Special case: "claimed" = leads ที่มี salesOwnerId (ไม่ว่า status จะเป็นอะไร)
    if (statuses.includes('claimed') && lead.salesOwnerId) {
      return true;
    }

    // ตรวจสอบ status ปกติ
    return statuses.includes(lead.status);
  });
}

/**
 * กรอง leads ตาม owner (รองรับ comma-separated values และ 'unassigned')
 */
export function filterByOwner(leads: LeadRow[], owner: string): LeadRow[] {
  const ownerIds = owner.split(',').map((id) => id.trim());
  const includeUnassigned = ownerIds.includes('unassigned');
  const actualOwnerIds = ownerIds.filter((id) => id !== 'unassigned');

  return leads.filter((lead) => {
    // Check if lead matches "unassigned" condition
    if (includeUnassigned && !lead.salesOwnerId) {
      return true;
    }
    // Check if lead matches any of the owner IDs
    if (actualOwnerIds.length > 0 && lead.salesOwnerId && actualOwnerIds.includes(lead.salesOwnerId)) {
      return true;
    }
    return false;
  });
}

/**
 * กรอง leads ตาม campaign
 */
export function filterByCampaign(leads: LeadRow[], campaign: string): LeadRow[] {
  return leads.filter((lead) => lead.campaignId === campaign);
}

/**
 * กรอง leads ตาม search term (company, customerName, email)
 */
export function filterBySearch(leads: LeadRow[], search: string): LeadRow[] {
  const searchLower = search.toLowerCase();
  return leads.filter(
    (lead) =>
      lead.company.toLowerCase().includes(searchLower) ||
      lead.customerName.toLowerCase().includes(searchLower) ||
      lead.email.toLowerCase().includes(searchLower)
  );
}

/**
 * กรอง leads ตาม leadSource
 * Story 4-14: Filter by Lead Source
 * Special value '__unknown__' matches leads with null/empty leadSource
 */
export function filterByLeadSource(leads: LeadRow[], leadSource: string): LeadRow[] {
  if (leadSource === '__unknown__') {
    return leads.filter((lead) => !lead.leadSource);
  }
  return leads.filter((lead) => lead.leadSource === leadSource);
}

/**
 * ดึง leads ทั้งหมดจาก Google Sheets
 *
 * @returns Array of leads, or empty array on error (fails gracefully)
 * @note Returns empty array on error to prevent dashboard crash.
 *       Error is logged for debugging. Check logs if dashboard shows empty data.
 */
export async function getAllLeads(): Promise<LeadRow[]> {
  try {
    return await leadsService.getAllLeads();
  } catch (error) {
    logger.error('Failed to get all leads - dashboard will show empty data', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return [];
  }
}
