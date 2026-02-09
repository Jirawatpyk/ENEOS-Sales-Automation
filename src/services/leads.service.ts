/**
 * ENEOS Sales Automation - Leads Service (Supabase)
 * All lead CRUD operations via Supabase query builder
 * Story 9-1a: Replaces sheetsService for lead operations
 */

import { supabase } from '../lib/supabase.js';
import { sheetsService } from './sheets.service.js';
import { createModuleLogger } from '../utils/logger.js';
import { normalizeEmail } from '../utils/email-parser.js';
import {
  RaceConditionError,
  AppError,
} from '../types/index.js';
import type {
  Lead,
  LeadStatus,
  SupabaseLead,
  LeadRow,
} from '../types/index.js';
import { toSupabaseLead, fromSupabaseLead } from '../types/index.js';
import { PAGINATION } from '../constants/admin.constants.js';

const logger = createModuleLogger('leads');

// ===========================================
// Lead CRUD Operations
// ===========================================

/**
 * Add a new lead (AC #1)
 * INSERT INTO leads ... RETURNING * with UUID auto-gen
 */
export async function addLead(lead: Partial<Lead>): Promise<SupabaseLead> {
  const payload = toSupabaseLead(lead);

  const { data, error } = await supabase
    .from('leads')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    logger.error('Failed to add lead', { error, email: lead.email });
    throw new AppError(
      `Failed to add lead: ${error?.message || 'No data returned'}`,
      500,
      'DB_INSERT_ERROR'
    );
  }

  // Fire-and-forget: write status history to Google Sheets (until Story 9-3)
  sheetsService.addStatusHistory({
    leadUUID: data.id,
    status: 'new',
    changedById: 'System',
    changedByName: 'System',
    timestamp: new Date().toISOString(),
  }).catch(err => logger.error('Failed to write status history', { err }));

  logger.info('Lead added', { id: data.id, email: data.email });
  return data as SupabaseLead;
}

/**
 * Get lead by UUID (AC #1)
 * SELECT * FROM leads WHERE id = $1
 */
export async function getLeadById(id: string): Promise<SupabaseLead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select()
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logger.error('Failed to get lead by id', { error, id });
    throw new AppError(
      `Failed to get lead: ${error.message}`,
      500,
      'DB_QUERY_ERROR'
    );
  }

  return (data as SupabaseLead) || null;
}

/**
 * Update lead with optimistic locking (AC #3)
 * UPDATE ... WHERE id = $1 AND version = $2 RETURNING *
 * Throws RaceConditionError if version mismatch
 */
export async function updateLeadWithLock(
  id: string,
  updates: Partial<SupabaseLead>,
  expectedVersion: number
): Promise<SupabaseLead> {
  // Remove fields that shouldn't be updated directly
  const { id: _id, created_at: _ca, ...safeUpdates } = updates;

  const { data, error } = await supabase
    .from('leads')
    .update({
      ...safeUpdates,
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('version', expectedVersion)
    .select()
    .single();

  if (error || !data) {
    throw new RaceConditionError(`Lead ${id} was modified by another user`);
  }

  return data as SupabaseLead;
}

/**
 * Claim a lead — set owner + status + contacted_at + version++ (AC #4)
 * Uses read-then-atomic-UPDATE to eliminate TOCTOU race:
 *   1. Read current state (for isNewClaim + version info — NOT a lock)
 *   2. Atomic UPDATE with WHERE version = V AND (sales_owner_id IS NULL OR sales_owner_id = userId)
 *   3. If UPDATE fails (0 rows), re-read to determine cause
 * The WHERE clause prevents concurrent claim corruption even if state changes between read and write.
 */
export async function claimLead(
  id: string,
  salesUserId: string,
  salesUserName: string,
  status: LeadStatus = 'contacted'
): Promise<{
  success: boolean;
  lead: LeadRow;
  alreadyClaimed: boolean;
  isNewClaim: boolean;
  owner?: string;
}> {
  const now = new Date().toISOString();

  // 1. Read current state (informational — not a lock)
  const current = await getLeadById(id);
  if (!current) {
    throw new AppError('Lead not found', 404, 'ROW_NOT_FOUND');
  }

  // 2. Quick check: already claimed by someone else?
  if (current.sales_owner_id && current.sales_owner_id !== salesUserId) {
    return {
      success: false,
      lead: supabaseLeadToLeadRow(current),
      alreadyClaimed: true,
      isNewClaim: false,
      owner: current.sales_owner_name || current.sales_owner_id || undefined,
    };
  }

  const isNewClaim = !current.sales_owner_id;

  // 3. Build timestamp updates — only set contacted_at on first contact
  const timestamps: Record<string, string> = {};
  if (!current.contacted_at) {
    timestamps.contacted_at = now;
  }
  if (status === 'closed') {
    timestamps.closed_at = now;
  } else if (status === 'lost') {
    timestamps.lost_at = now;
  } else if (status === 'unreachable') {
    timestamps.unreachable_at = now;
  }

  // 4. Atomic UPDATE with version check + ownership guard
  //    WHERE id = X AND version = V AND (sales_owner_id IS NULL OR sales_owner_id = salesUserId)
  //    Eliminates TOCTOU: if someone claims between step 1 and 4, the UPDATE fails safely.
  const { data: updated, error } = await supabase
    .from('leads')
    .update({
      sales_owner_id: salesUserId,
      sales_owner_name: salesUserName,
      status,
      ...timestamps,
      version: current.version + 1,
      updated_at: now,
    })
    .eq('id', id)
    .eq('version', current.version)
    .or(`sales_owner_id.is.null,sales_owner_id.eq.${salesUserId}`)
    .select()
    .single();

  if (updated && !error) {
    // Fire-and-forget: write status history (until Story 9-3)
    sheetsService.addStatusHistory({
      leadUUID: id,
      status,
      changedById: salesUserId,
      changedByName: salesUserName,
      timestamp: now,
    }).catch(err => logger.error('Failed to write status history', { err }));

    return {
      success: true,
      lead: supabaseLeadToLeadRow(updated as SupabaseLead),
      alreadyClaimed: false,
      isNewClaim,
    };
  }

  // 5. UPDATE failed — re-read to determine cause (race condition)
  const refetched = await getLeadById(id);
  if (!refetched) {
    throw new AppError('Lead not found', 404, 'ROW_NOT_FOUND');
  }

  // Someone else claimed between our read and update
  return {
    success: false,
    lead: supabaseLeadToLeadRow(refetched),
    alreadyClaimed: true,
    isNewClaim: false,
    owner: refetched.sales_owner_name || refetched.sales_owner_id || undefined,
  };
}

/**
 * Update lead status (AC #5) — verify ownership, update status + timestamp
 */
export async function updateLeadStatus(
  id: string,
  salesUserId: string,
  newStatus: LeadStatus
): Promise<SupabaseLead> {
  const current = await getLeadById(id);

  if (!current) {
    throw new AppError('Lead not found', 404, 'ROW_NOT_FOUND');
  }

  // Verify ownership
  if (current.sales_owner_id && current.sales_owner_id !== salesUserId) {
    throw new AppError('Not authorized to update this lead', 403, 'NOT_OWNER');
  }

  const timestamps: Partial<SupabaseLead> = {};
  if (newStatus === 'contacted' && !current.contacted_at) {
    timestamps.contacted_at = new Date().toISOString();
  } else if (newStatus === 'closed') {
    timestamps.closed_at = new Date().toISOString();
  } else if (newStatus === 'lost') {
    timestamps.lost_at = new Date().toISOString();
  } else if (newStatus === 'unreachable') {
    timestamps.unreachable_at = new Date().toISOString();
  }

  const updated = await updateLeadWithLock(
    id,
    {
      status: newStatus,
      ...timestamps,
    } as Partial<SupabaseLead>,
    current.version
  );

  // Fire-and-forget: write status history (until Story 9-3)
  sheetsService.addStatusHistory({
    leadUUID: id,
    status: newStatus,
    changedById: salesUserId,
    changedByName: current.sales_owner_name || salesUserId,
    timestamp: new Date().toISOString(),
  }).catch(err => logger.error('Failed to write status history', { err }));

  return updated;
}

/**
 * Get leads with pagination (AC #5)
 * Supports filter by status, date range, search text, owner, campaign, leadSource
 * Supports sort by created_at, company, status, sales_owner_name
 */
export async function getLeadsWithPagination(
  page: number = 1,
  limit: number = PAGINATION.DEFAULT_LIMIT,
  filters: {
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    owner?: string;
    campaign?: string;
    leadSource?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{ data: SupabaseLead[]; total: number }> {
  const safeLimit = Math.min(limit, PAGINATION.MAX_LIMIT);
  const offset = (page - 1) * safeLimit;

  // Map sortBy from camelCase field names to snake_case DB columns
  const sortColumn = SORT_FIELD_MAP[filters.sortBy || 'date'] || 'created_at';
  const ascending = filters.sortOrder === 'asc';

  // Build count query
  let countQuery = supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  // Build data query with sort + pagination
  let dataQuery = supabase
    .from('leads')
    .select()
    .order(sortColumn, { ascending })
    .range(offset, offset + safeLimit - 1);

  // Apply filters to both queries
  if (filters.status) {
    const statuses = filters.status.split(',').map(s => s.trim());
    const hasClaimed = statuses.includes('claimed');
    const regularStatuses = statuses.filter(s => s !== 'claimed');

    if (hasClaimed && regularStatuses.length > 0) {
      // "claimed" = has owner, plus any regular status values
      const orFilter = `sales_owner_id.not.is.null,status.in.(${regularStatuses.join(',')})`;
      countQuery = countQuery.or(orFilter);
      dataQuery = dataQuery.or(orFilter);
    } else if (hasClaimed) {
      countQuery = countQuery.not('sales_owner_id', 'is', null);
      dataQuery = dataQuery.not('sales_owner_id', 'is', null);
    } else if (regularStatuses.length === 1) {
      countQuery = countQuery.eq('status', regularStatuses[0]);
      dataQuery = dataQuery.eq('status', regularStatuses[0]);
    } else if (regularStatuses.length > 1) {
      countQuery = countQuery.in('status', regularStatuses);
      dataQuery = dataQuery.in('status', regularStatuses);
    }
  }

  if (filters.startDate) {
    countQuery = countQuery.gte('created_at', filters.startDate);
    dataQuery = dataQuery.gte('created_at', filters.startDate);
  }

  if (filters.endDate) {
    countQuery = countQuery.lte('created_at', filters.endDate);
    dataQuery = dataQuery.lte('created_at', filters.endDate);
  }

  if (filters.search) {
    const sanitized = sanitizeSearchInput(filters.search);
    const searchFilter = `company.ilike.%${sanitized}%,customer_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`;
    countQuery = countQuery.or(searchFilter);
    dataQuery = dataQuery.or(searchFilter);
  }

  if (filters.owner) {
    const ownerIds = filters.owner.split(',').map(id => id.trim());
    const hasUnassigned = ownerIds.includes('unassigned');
    const actualIds = ownerIds.filter(id => id !== 'unassigned');

    if (hasUnassigned && actualIds.length > 0) {
      const orFilter = `sales_owner_id.is.null,sales_owner_id.in.(${actualIds.join(',')})`;
      countQuery = countQuery.or(orFilter);
      dataQuery = dataQuery.or(orFilter);
    } else if (hasUnassigned) {
      countQuery = countQuery.is('sales_owner_id', null);
      dataQuery = dataQuery.is('sales_owner_id', null);
    } else if (actualIds.length === 1) {
      countQuery = countQuery.eq('sales_owner_id', actualIds[0]);
      dataQuery = dataQuery.eq('sales_owner_id', actualIds[0]);
    } else if (actualIds.length > 1) {
      countQuery = countQuery.in('sales_owner_id', actualIds);
      dataQuery = dataQuery.in('sales_owner_id', actualIds);
    }
  }

  if (filters.campaign) {
    countQuery = countQuery.eq('workflow_id', filters.campaign);
    dataQuery = dataQuery.eq('workflow_id', filters.campaign);
  }

  if (filters.leadSource) {
    if (filters.leadSource === '__unknown__') {
      countQuery = countQuery.is('lead_source', null);
      dataQuery = dataQuery.is('lead_source', null);
    } else {
      countQuery = countQuery.eq('lead_source', filters.leadSource);
      dataQuery = dataQuery.eq('lead_source', filters.leadSource);
    }
  }

  const [countResult, dataResult] = await Promise.all([
    countQuery,
    dataQuery,
  ]);

  if (countResult.error) {
    logger.error('Failed to count leads', { error: countResult.error });
    throw new AppError(
      `Failed to count leads: ${countResult.error.message}`,
      500,
      'DB_QUERY_ERROR'
    );
  }

  if (dataResult.error) {
    logger.error('Failed to fetch leads', { error: dataResult.error });
    throw new AppError(
      `Failed to fetch leads: ${dataResult.error.message}`,
      500,
      'DB_QUERY_ERROR'
    );
  }

  return {
    data: (dataResult.data || []) as SupabaseLead[],
    total: countResult.count || 0,
  };
}

/** Map camelCase sort field names to snake_case DB columns */
const SORT_FIELD_MAP: Record<string, string> = {
  date: 'created_at',
  createdAt: 'created_at',
  company: 'company',
  status: 'status',
  salesOwnerName: 'sales_owner_name',
};

/**
 * Get distinct filter values for admin dashboard (lightweight — no full row data)
 * Returns unique owners, campaigns, and lead sources for building filter dropdowns.
 */
export async function getDistinctFilterValues(): Promise<{
  owners: { id: string; name: string }[];
  campaigns: { id: string; name: string }[];
  leadSources: string[];
}> {
  const { data, error } = await supabase
    .from('leads')
    .select('sales_owner_id, sales_owner_name, workflow_id, campaign_name, lead_source');

  if (error) {
    logger.error('Failed to get distinct filter values', { error });
    throw new AppError(
      `Failed to get filter values: ${error.message}`,
      500,
      'DB_QUERY_ERROR'
    );
  }

  const rows = (data || []) as Array<{
    sales_owner_id: string | null;
    sales_owner_name: string | null;
    workflow_id: string | null;
    campaign_name: string | null;
    lead_source: string | null;
  }>;

  // Deduplicate in JS (Supabase JS doesn't support SELECT DISTINCT)
  const ownerMap = new Map<string, string>();
  const campaignMap = new Map<string, string>();
  const leadSourceSet = new Set<string>();

  for (const row of rows) {
    if (row.sales_owner_id) {
      ownerMap.set(row.sales_owner_id, row.sales_owner_name || 'Unknown');
    }
    if (row.workflow_id) {
      campaignMap.set(row.workflow_id, row.campaign_name || 'Unknown');
    }
    if (row.lead_source) {
      leadSourceSet.add(row.lead_source);
    }
  }

  return {
    owners: Array.from(ownerMap, ([id, name]) => ({ id, name })),
    campaigns: Array.from(campaignMap, ([id, name]) => ({ id, name })),
    leadSources: Array.from(leadSourceSet).sort(),
  };
}

/**
 * Get leads count grouped by status (AC #5)
 * Uses parallel count queries per status (Supabase JS has no GROUP BY).
 * Each query uses { count: 'exact', head: true } — no row data transferred.
 */
export async function getLeadsCountByStatus(): Promise<Record<string, number>> {
  const statuses: LeadStatus[] = ['new', 'claimed', 'contacted', 'closed', 'lost', 'unreachable'];

  const results = await Promise.all(
    statuses.map(async (status) => {
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);

      if (error) {
        logger.error('Failed to count leads for status', { error, status });
        throw new AppError(
          `Failed to get status counts: ${error.message}`,
          500,
          'DB_QUERY_ERROR'
        );
      }

      return { status, count: count || 0 };
    })
  );

  const counts: Record<string, number> = {};
  for (const { status, count } of results) {
    if (count > 0) {
      counts[status] = count;
    }
  }

  return counts;
}

/**
 * Get leads by date range
 * Filter by created_at range
 */
export async function getLeadsByDateRange(
  start: string,
  end: string
): Promise<SupabaseLead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select()
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to get leads by date range', { error });
    throw new AppError(
      `Failed to get leads by date range: ${error.message}`,
      500,
      'DB_QUERY_ERROR'
    );
  }

  return (data || []) as SupabaseLead[];
}

/**
 * Get all leads (for export / filter helpers)
 * Returns LeadRow[] for backward compatibility with existing admin helpers
 */
export async function getAllLeads(): Promise<LeadRow[]> {
  const { data, error } = await supabase
    .from('leads')
    .select()
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to get all leads', { error });
    throw new AppError(
      `Failed to get all leads: ${error.message}`,
      500,
      'DB_QUERY_ERROR'
    );
  }

  return (data || []).map((row) => supabaseLeadToLeadRow(row as SupabaseLead));
}

/**
 * Lookup campaign ID for an email from campaign_events (AC #6)
 * Returns most recent campaign_id or null
 */
export async function lookupCampaignId(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);

  const { data, error } = await supabase
    .from('campaign_events')
    .select('campaign_id')
    .eq('email', normalized)
    .order('event_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error('Failed to lookup campaign id', { error, email: normalized });
    throw new AppError(
      `Failed to lookup campaign id: ${error.message}`,
      500,
      'DB_QUERY_ERROR'
    );
  }

  return data ? (data as { campaign_id: string }).campaign_id : null;
}

/**
 * Get all leads by email (for campaign join in 9-2)
 * SELECT id, customer_name, email, phone, company FROM leads
 */
export async function getAllLeadsByEmail(): Promise<
  Pick<SupabaseLead, 'id' | 'customer_name' | 'email' | 'phone' | 'company'>[]
> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, customer_name, email, phone, company');

  if (error) {
    logger.error('Failed to get all leads by email', { error });
    throw new AppError(
      `Failed to get all leads by email: ${error.message}`,
      500,
      'DB_QUERY_ERROR'
    );
  }

  return (data || []) as Pick<SupabaseLead, 'id' | 'customer_name' | 'email' | 'phone' | 'company'>[];
}

// ===========================================
// Helper: Sanitize search input for PostgREST .or() filter
// Prevents filter injection via commas and SQL LIKE wildcards
// ===========================================

function sanitizeSearchInput(input: string): string {
  return input
    .replace(/[%_]/g, '')     // Remove SQL LIKE wildcards
    .replace(/,/g, '')        // Remove commas (PostgREST OR separator)
    .trim()
    .substring(0, 100);       // Limit length
}

// ===========================================
// Re-export buildDedupKey for backward compat (single source of truth in deduplication.service.ts)
// ===========================================

export { buildDedupKey as buildLeadDedupKey } from './deduplication.service.js';

// ===========================================
// Helper: Convert SupabaseLead → LeadRow
// For backward compat with existing controllers/templates
// ===========================================

export function supabaseLeadToLeadRow(s: SupabaseLead): LeadRow {
  const lead = fromSupabaseLead(s);
  return {
    ...lead,
    rowNumber: 0, // No row number in Supabase
    version: s.version,
  };
}
