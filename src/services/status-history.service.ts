/**
 * ENEOS Sales Automation - Status History Service (Supabase)
 * Status change audit log via Supabase query builder
 * Story 9-3: Extracted from sheets.service.ts
 */

import { supabase } from '../lib/supabase.js';
import { createModuleLogger } from '../utils/logger.js';
import { supabaseLeadToLeadRow } from './leads.service.js';
import type {
  StatusHistoryEntry,
  LeadStatus,
  LeadRow,
  SupabaseLead,
} from '../types/index.js';

const logger = createModuleLogger('status-history');

// ===========================================
// Status History Operations
// ===========================================

/**
 * Add a status history entry — fire-and-forget (AC #4)
 * INSERT INTO status_history — errors logged but never thrown
 *
 * Interface preserved: accepts StatusHistoryEntry with `leadUUID` and `timestamp` fields
 * Maps: entry.leadUUID → lead_id column, created_at auto-set by DB
 */
export async function addStatusHistory(entry: StatusHistoryEntry): Promise<void> {
  try {
    const { error } = await supabase.from('status_history').insert({
      lead_id: entry.leadUUID,
      status: entry.status,
      changed_by_id: entry.changedById,
      changed_by_name: entry.changedByName,
      notes: entry.notes || null,
      // created_at auto-set by DEFAULT now() — entry.timestamp is accepted but not written
    });

    if (error) {
      throw error;
    }

    logger.debug('Status history entry added', {
      leadId: entry.leadUUID,
      status: entry.status,
    });
  } catch (error) {
    // Fire-and-forget: log error but don't throw
    logger.error('Failed to add status history entry', {
      leadUUID: entry.leadUUID,
      status: entry.status,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get status history for a lead (AC #5)
 * SELECT * FROM status_history WHERE lead_id = $1 ORDER BY created_at ASC
 */
export async function getStatusHistory(leadId: string): Promise<StatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from('status_history')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true }); // Oldest first

  if (error) {throw error;}

  return (data || []).map(row => ({
    leadUUID: row.lead_id,
    status: row.status as LeadStatus,
    changedById: row.changed_by_id || '',
    changedByName: row.changed_by_name || '',
    timestamp: row.created_at,
    notes: row.notes || undefined,
  }));
}

/**
 * Get all status history with pagination, filters, and lead data
 * Used by activity-log controller
 */
export async function getAllStatusHistory(options: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  status?: string[];
  changedBy?: string;
}): Promise<{
  entries: Array<StatusHistoryEntry & { lead?: LeadRow }>;
  total: number;
  changedByOptions: Array<{ id: string; name: string }>;
}> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  // Build query with filters
  let query = supabase
    .from('status_history')
    .select('*', { count: 'exact' });

  if (options.from) {query = query.gte('created_at', options.from);}
  if (options.to) {query = query.lte('created_at', options.to);}
  if (options.status && options.status.length > 0) {
    query = query.in('status', options.status);
  }
  if (options.changedBy) {query = query.eq('changed_by_id', options.changedBy);}

  const { data: entries, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {throw error;}

  // Get lead data for these entries (two-query JOIN pattern from 9-2)
  const leadIds = [...new Set((entries || []).map(e => e.lead_id))];
  let leadsMap = new Map<string, SupabaseLead>();
  if (leadIds.length > 0) {
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .in('id', leadIds);
    leadsMap = new Map((leads || []).map(l => [l.id, l as SupabaseLead]));
  }

  // Get changedByOptions (distinct changed_by_id + name)
  // NOTE: Fetches all rows — Supabase JS has no SELECT DISTINCT.
  // OK for ~10K rows. Consider RPC or lookup table if history grows beyond 50K.
  const { data: changedByData } = await supabase
    .from('status_history')
    .select('changed_by_id, changed_by_name')
    .not('changed_by_id', 'is', null);
  // Deduplicate
  const changedByMap = new Map<string, string>();
  (changedByData || []).forEach(row => {
    if (row.changed_by_id && !changedByMap.has(row.changed_by_id)) {
      changedByMap.set(row.changed_by_id, row.changed_by_name || row.changed_by_id);
    }
  });
  const changedByOptions = Array.from(changedByMap.entries()).map(([id, name]) => ({ id, name }));

  // Map results
  const result = (entries || []).map(row => {
    const lead = leadsMap.get(row.lead_id);
    const leadRow = lead ? supabaseLeadToLeadRow(lead) : undefined;
    return {
      id: row.id,
      leadUUID: row.lead_id,
      rowNumber: leadRow?.rowNumber ?? 0,
      companyName: leadRow?.company ?? '',
      status: row.status as LeadStatus,
      changedById: row.changed_by_id || '',
      changedByName: row.changed_by_name || '',
      timestamp: row.created_at,
      notes: row.notes || undefined,
      lead: leadRow,
    };
  });

  return {
    entries: result,
    total: count || 0,
    changedByOptions,
  };
}

