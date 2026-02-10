/**
 * Transform Helper Functions
 * Handles data transformation between internal and API formats
 */

import { LeadItem, ActivityItem } from '../../../types/admin.types.js';
import { LeadRow } from '../../../types/index.js';

/**
 * Get the appropriate timestamp based on lead status
 * Used for sorting by most recent activity
 */
export function getActivityTimestamp(lead: LeadRow): string {
  switch (lead.status) {
    case 'closed':
      return lead.closedAt || lead.contactedAt || lead.date;
    case 'lost':
      return lead.lostAt || lead.contactedAt || lead.date;
    case 'unreachable':
      return lead.unreachableAt || lead.contactedAt || lead.date;
    case 'contacted':
    case 'claimed':
      return lead.contactedAt || lead.date;
    case 'new':
    default:
      return lead.date;
  }
}

/**
 * Convert LeadRow to LeadItem format for API response
 */
export function leadRowToLeadItem(lead: LeadRow): LeadItem {
  return {
    row: lead.rowNumber,
    leadUuid: lead.leadUUID || '', // Always set from Supabase; guard for Lead type allowing null
    date: lead.date,
    customerName: lead.customerName,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    industry: lead.industryAI,
    website: lead.website || '',
    capital: lead.capital || '',
    status: lead.status,
    owner: lead.salesOwnerId
      ? {
          id: lead.salesOwnerId,
          name: lead.salesOwnerName || 'Unknown',
        }
      : null,
    campaign: {
      id: lead.brevoCampaignId || lead.campaignId,
      name: lead.campaignName,
    },
    source: lead.source,
    talkingPoint: lead.talkingPoint || '',
    clickedAt: lead.clickedAt,
    claimedAt: null, // Not used - use contactedAt instead
    contactedAt: lead.contactedAt,
    closedAt: lead.closedAt,
    // Additional fields from Brevo Contact Attributes
    leadSource: lead.leadSource || null,
    jobTitle: lead.jobTitle || null,
    city: lead.city || null,
    // Google Search Grounding fields (2026-01-26)
    juristicId: lead.juristicId ?? null,
    dbdSector: lead.dbdSector ?? null,
    province: lead.province ?? null,
    fullAddress: lead.fullAddress ?? null,
  };
}

/**
 * Convert LeadRow to ActivityItem format
 */
export function leadRowToActivityItem(lead: LeadRow): ActivityItem {
  return {
    id: `act_${lead.leadUUID || lead.rowNumber}`,
    type: lead.status as ActivityItem['type'],
    salesId: lead.salesOwnerId || '',
    salesName: lead.salesOwnerName || 'Unknown',
    leadId: lead.rowNumber,
    leadUuid: lead.leadUUID || '',
    company: lead.company,
    customerName: lead.customerName,
    timestamp: getActivityTimestamp(lead),
  };
}
