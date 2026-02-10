/**
 * ENEOS Sales Automation - Deduplication Service (Supabase)
 * Prevents duplicate lead processing via DB constraint (INSERT ON CONFLICT DO NOTHING)
 * Story 9-1a: Simplified from 3-tier cache (Redis → Memory → Sheet) to single Supabase call
 */

import { supabase } from '../lib/supabase.js';
import { dedupLogger as logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { normalizeEmail } from '../utils/email-parser.js';
import { DuplicateLeadError, AppError } from '../types/index.js';

// ===========================================
// Dedup Key Builder (ADR-002 format)
// ===========================================

/**
 * Build dedup key in new format: lead:{email}:{source}
 * Replaces old format: email_source (from email-parser.ts createDedupKey)
 */
export function buildDedupKey(email: string, source: string): string {
  return `lead:${normalizeEmail(email)}:${source || 'unknown'}`;
}

// ===========================================
// Exported Service Functions
// ===========================================

/**
 * Check if a lead is duplicate and mark as processed if new (AC #2)
 * Uses INSERT ON CONFLICT DO NOTHING — if row returned → new, if empty → duplicate
 *
 * @returns true if duplicate, false if new (and marked as processed)
 */
export async function checkAndMark(email: string, source: string): Promise<boolean> {
  if (!config.features.deduplication) {
    logger.debug('Deduplication disabled, allowing all leads');
    return false;
  }

  const key = buildDedupKey(email, source);

  logger.debug('Checking deduplication', { key });

  const { data, error } = await supabase
    .from('dedup_log')
    .upsert(
      {
        key,
        info: normalizeEmail(email),
        source: source || 'unknown',
        processed_at: new Date().toISOString(),
      },
      { onConflict: 'key', ignoreDuplicates: true }
    )
    .select();

  if (error) {
    logger.error('Dedup check failed', { error, key });
    throw new AppError(
      `Deduplication check failed: ${error.message}`,
      500,
      'DB_ERROR'
    );
  }

  // If data has rows, the insert succeeded → new lead
  // If data is empty, the row already existed → duplicate
  const isDuplicate = !data || data.length === 0;

  if (isDuplicate) {
    logger.info('Duplicate found', { key });
  } else {
    logger.info('New lead processed', { key });
  }

  return isDuplicate;
}

/**
 * Check if duplicate and throw DuplicateLeadError if true (AC #2)
 */
export async function checkOrThrow(email: string, source: string): Promise<void> {
  const duplicate = await checkAndMark(email, source);

  if (duplicate) {
    throw new DuplicateLeadError(email, source);
  }
}

/**
 * Check if duplicate without marking (AC #2)
 * SELECT 1 FROM dedup_log WHERE key = $1
 */
export async function isDuplicate(email: string, source: string): Promise<boolean> {
  if (!config.features.deduplication) {
    return false;
  }

  const key = buildDedupKey(email, source);

  const { data, error } = await supabase
    .from('dedup_log')
    .select('key')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    logger.error('Dedup check failed', { error, key });
    throw new AppError(
      `Deduplication check failed: ${error.message}`,
      500,
      'DB_ERROR'
    );
  }

  return data !== null;
}

/**
 * Health check / Stats (AC #7)
 */
export function getStats(): {
  enabled: boolean;
  backend: string;
} {
  return {
    enabled: config.features.deduplication,
    backend: 'supabase',
  };
}

