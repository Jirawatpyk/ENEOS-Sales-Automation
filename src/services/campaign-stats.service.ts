/**
 * ENEOS Sales Automation - Campaign Stats Service (Supabase)
 * Handles Brevo Campaign Events storage and statistics tracking
 * Story 9-2: Migrated from Google Sheets to Supabase
 */

import { supabase } from '../lib/supabase.js';
import { campaignLogger as logger } from '../utils/logger.js';
import type { NormalizedCampaignEvent } from '../validators/campaign-event.validator.js';
import type {
  CampaignStatsItem,
  CampaignEventItem,
  PaginationMeta,
  CampaignStatsSortBy,
} from '../types/admin.types.js';
import { CAMPAIGN_EVENTS } from '../constants/campaign.constants.js';

// ===========================================
// Result Types
// ===========================================

export interface RecordEventResult {
  success: boolean;
  duplicate: boolean;
  error?: string;
  eventId?: number;
  campaignId?: number;
}

// ===========================================
// Main Entry Point
// ===========================================

/**
 * Record a campaign event (main entry point)
 * Step 1: INSERT event (UNIQUE constraint handles dedup)
 * Step 2: Upsert campaign stats with accurate counts
 */
export async function recordCampaignEvent(event: NormalizedCampaignEvent): Promise<RecordEventResult> {
  logger.info('Recording campaign event', {
    eventId: event.eventId,
    campaignId: event.campaignId,
    event: event.event,
    email: event.email,
  });

  try {
    // Step 1: INSERT event (UNIQUE constraint handles dedup)
    const { data: eventRow, error: eventError } = await supabase
      .from('campaign_events')
      .insert({
        event_id: String(event.eventId),
        campaign_id: String(event.campaignId),
        campaign_name: event.campaignName,
        email: event.email.toLowerCase(),
        event: event.event,
        event_at: event.eventAt || null,
        sent_at: event.sentAt || null,
        url: event.url || null,
        tag: event.tag || null,
        segment_ids: event.segmentIds.length > 0 ? event.segmentIds : null,
      })
      .select('id')
      .maybeSingle();

    // Duplicate check: UNIQUE constraint violation = code 23505
    if (eventError) {
      if (eventError.code === '23505') {
        logger.info('Duplicate event detected, returning success', {
          eventId: event.eventId,
          eventType: event.event,
        });
        return {
          success: true,
          duplicate: true,
          eventId: event.eventId,
          campaignId: event.campaignId,
        };
      }
      throw eventError;
    }

    // Step 2: Upsert campaign stats (event already written = source of truth)
    try {
      await upsertCampaignStats(event);

      logger.info('Campaign event recorded successfully', {
        eventId: event.eventId,
        campaignId: event.campaignId,
        eventRowId: eventRow?.id,
      });
    } catch (statsError) {
      const statsMessage = statsError instanceof Error ? statsError.message : String(statsError);
      logger.warn('Campaign event written but stats update failed — stats may be stale', {
        eventId: event.eventId,
        campaignId: event.campaignId,
        event: event.event,
        email: event.email,
        error: statsMessage,
        action: 'STATS_RECONCILE_NEEDED',
      });
    }

    return {
      success: true,
      duplicate: false,
      eventId: event.eventId,
      campaignId: event.campaignId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to record campaign event', {
      eventId: event.eventId,
      campaignId: event.campaignId,
      error: errorMessage,
    });

    return {
      success: false,
      duplicate: false,
      error: errorMessage,
      eventId: event.eventId,
      campaignId: event.campaignId,
    };
  }
}

// ===========================================
// Upsert Campaign Stats
// ===========================================

/**
 * Upsert campaign stats after recording an event.
 * Queries actual counts from campaign_events (source of truth),
 * then upserts into campaign_stats.
 */
async function upsertCampaignStats(event: NormalizedCampaignEvent): Promise<void> {
  const campaignId = String(event.campaignId);

  // Count total events by type for this campaign
  const [deliveredCount, openedCount, clickedCount] = await Promise.all([
    countEvents(campaignId, CAMPAIGN_EVENTS.DELIVERED),
    countEvents(campaignId, CAMPAIGN_EVENTS.OPENED),
    countEvents(campaignId, CAMPAIGN_EVENTS.CLICK),
  ]);

  // Count unique emails by type for this campaign
  const [uniqueOpens, uniqueClicks] = await Promise.all([
    countUniqueEmails(campaignId, CAMPAIGN_EVENTS.OPENED),
    countUniqueEmails(campaignId, CAMPAIGN_EVENTS.CLICK),
  ]);

  // Calculate rates
  const delivered = deliveredCount;
  const openRate = delivered > 0 ? Math.round((uniqueOpens / delivered) * 10000) / 100 : 0;
  const clickRate = delivered > 0 ? Math.round((uniqueClicks / delivered) * 10000) / 100 : 0;

  // Get first event timestamp for this campaign
  const { data: firstEventRow } = await supabase
    .from('campaign_events')
    .select('event_at')
    .eq('campaign_id', campaignId)
    .order('event_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('campaign_stats')
    .upsert({
      campaign_id: campaignId,
      campaign_name: event.campaignName,
      delivered: deliveredCount,
      opened: openedCount,
      clicked: clickedCount,
      unique_opens: uniqueOpens,
      unique_clicks: uniqueClicks,
      open_rate: openRate,
      click_rate: clickRate,
      first_event: firstEventRow?.event_at || now,
      last_updated: now,
    }, { onConflict: 'campaign_id' });

  if (error) {
    throw error;
  }

  logger.debug('Campaign stats upserted', { campaignId, delivered, openRate, clickRate });
}

/**
 * Count total events for a campaign + event type
 */
async function countEvents(campaignId: string, eventType: string): Promise<number> {
  const { count, error } = await supabase
    .from('campaign_events')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('event', eventType);

  if (error) {
    throw error;
  }
  return count || 0;
}

/**
 * Count unique emails for a campaign + event type
 * Uses SELECT DISTINCT email approach (Supabase JS doesn't support COUNT(DISTINCT))
 * NOTE: Loads all matching emails into memory for JS Set dedup.
 * For high-volume campaigns (100K+ events), consider supabase.rpc() with COUNT(DISTINCT).
 */
async function countUniqueEmails(campaignId: string, eventType: string): Promise<number> {
  const { data, error } = await supabase
    .from('campaign_events')
    .select('email')
    .eq('campaign_id', campaignId)
    .eq('event', eventType);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return 0;
  }

  const uniqueEmails = new Set(data.map(row => row.email.toLowerCase()));
  return uniqueEmails.size;
}

// ===========================================
// READ Operations
// ===========================================

/**
 * Get all campaign stats with pagination, search, date range filtering, and sorting
 */
export async function getAllCampaignStats(options: {
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: CampaignStatsSortBy;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<{
  data: CampaignStatsItem[];
  pagination: PaginationMeta;
}> {
  const {
    page = 1,
    limit = 20,
    search,
    dateFrom,
    dateTo,
    sortBy = 'Last_Updated',
    sortOrder = 'desc',
  } = options;

  logger.debug('Getting all campaign stats', { page, limit, search, sortBy, sortOrder });

  // Build query
  let query = supabase.from('campaign_stats').select('*', { count: 'exact' });

  // Apply search filter (escape LIKE wildcards in user input)
  if (search) {
    const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
    query = query.ilike('campaign_name', `%${escapedSearch}%`);
  }

  // Apply date range filters on first_event
  if (dateFrom) {
    query = query.gte('first_event', dateFrom);
  }
  if (dateTo) {
    query = query.lte('first_event', dateTo);
  }

  // Apply sorting
  const sortColumn = mapSortByToColumn(sortBy);
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

  // Apply pagination
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw error;
  }

  const total = count || 0;
  const campaigns = (data || []).map(rowToCampaignStatsItem);

  logger.info('Campaign stats retrieved', { total, returned: campaigns.length });

  return {
    data: campaigns,
    pagination: createPaginationMeta(total, page, limit),
  };
}

/**
 * Get single campaign stats by Campaign_ID
 */
export async function getCampaignStatsById(campaignId: number): Promise<CampaignStatsItem | null> {
  logger.debug('Getting campaign stats by ID', { campaignId });

  const { data, error } = await supabase
    .from('campaign_stats')
    .select('*')
    .eq('campaign_id', String(campaignId))
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return rowToCampaignStatsItem(data);
}

/**
 * Get campaign events with pagination and filtering
 * LEFT JOIN leads for contact info (AC #2, #3)
 */
export async function getCampaignEvents(
  campaignId: number,
  options: {
    page?: number;
    limit?: number;
    event?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): Promise<{
  data: CampaignEventItem[];
  pagination: PaginationMeta;
}> {
  const {
    page = 1,
    limit = 50,
    event: eventFilter,
    dateFrom,
    dateTo,
  } = options;

  logger.debug('Getting campaign events', { campaignId, page, limit, eventFilter });

  // Build events query
  let query = supabase
    .from('campaign_events')
    .select('*', { count: 'exact' })
    .eq('campaign_id', String(campaignId));

  if (eventFilter) {
    query = query.eq('event', eventFilter);
  }
  if (dateFrom) {
    query = query.gte('event_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('event_at', dateTo);
  }

  query = query.order('event_at', { ascending: false });

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data: events, count, error } = await query;

  if (error) {
    throw error;
  }

  const total = count || 0;

  if (!events || events.length === 0) {
    return {
      data: [],
      pagination: createPaginationMeta(total, page, limit),
    };
  }

  // Get contact data from leads by emails (AC #2)
  const uniqueEmails = [...new Set(events.map(e => e.email.toLowerCase()))];
  const { data: leads } = await supabase
    .from('leads')
    .select('email, customer_name, company')
    .in('email', uniqueEmails);

  // Build lookup map
  const leadsMap = new Map(
    (leads || []).map(l => [l.email.toLowerCase(), l])
  );

  // Map events + merge contact data
  const result: CampaignEventItem[] = events.map(e => {
    const lead = leadsMap.get(e.email.toLowerCase());
    return {
      eventId: Number(e.event_id),
      email: e.email,
      event: e.event,
      eventAt: e.event_at || '',
      url: e.url || null,
      firstname: lead?.customer_name || '',
      lastname: '',
      company: lead?.company || '',
    };
  });

  logger.info('Campaign events retrieved', { campaignId, total, returned: result.length });

  return {
    data: result,
    pagination: createPaginationMeta(total, page, limit),
  };
}

// ===========================================
// Health Check
// ===========================================

/**
 * Check if campaign tables are accessible
 */
async function healthCheck(): Promise<{ healthy: boolean; latency: number }> {
  const start = Date.now();

  try {
    const { error } = await supabase
      .from('campaign_stats')
      .select('campaign_id')
      .limit(1);

    return {
      healthy: !error,
      latency: Date.now() - start,
    };
  } catch {
    return {
      healthy: false,
      latency: Date.now() - start,
    };
  }
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Map sortBy parameter to Supabase column name
 */
function mapSortByToColumn(sortBy: CampaignStatsSortBy): string {
  const mapping: Record<CampaignStatsSortBy, string> = {
    'Last_Updated': 'last_updated',
    'First_Event': 'first_event',
    'Campaign_Name': 'campaign_name',
    'Delivered': 'delivered',
    'Opened': 'opened',
    'Clicked': 'clicked',
    'Open_Rate': 'open_rate',
    'Click_Rate': 'click_rate',
  };
  return mapping[sortBy] || 'last_updated';
}

/**
 * Convert Supabase row to CampaignStatsItem
 */
function rowToCampaignStatsItem(row: Record<string, unknown>): CampaignStatsItem {
  return {
    campaignId: Number(row.campaign_id || 0),
    campaignName: String(row.campaign_name || ''),
    delivered: Number(row.delivered || 0),
    opened: Number(row.opened || 0),
    clicked: Number(row.clicked || 0),
    uniqueOpens: Number(row.unique_opens || 0),
    uniqueClicks: Number(row.unique_clicks || 0),
    openRate: Number(row.open_rate || 0),
    clickRate: Number(row.click_rate || 0),
    hardBounce: Number(row.hard_bounce || 0),
    softBounce: Number(row.soft_bounce || 0),
    unsubscribe: Number(row.unsubscribe || 0),
    spam: Number(row.spam || 0),
    firstEvent: String(row.first_event || ''),
    lastUpdated: String(row.last_updated || ''),
  };
}

/**
 * Create pagination metadata
 */
function createPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ===========================================
// Compatibility Wrapper (keeps existing imports working)
// ===========================================

export const campaignStatsService = {
  recordCampaignEvent,
  getAllCampaignStats,
  getCampaignStatsById,
  getCampaignEvents,
  healthCheck,
};
