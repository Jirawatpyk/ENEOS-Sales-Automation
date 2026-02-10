/**
 * Supabase Client Module
 * Server-side only — uses service role key (bypasses RLS)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    db: { schema: 'public' },
    auth: { persistSession: false },
    global: {
      // eslint-disable-next-line no-undef -- RequestInit is a global type in Node.js 20+
      fetch: (url: string | URL | Request, options?: RequestInit) => {
        const timeoutSignal = AbortSignal.timeout(10000);
        const signal = options?.signal
          ? AbortSignal.any([options.signal, timeoutSignal])
          : timeoutSignal;
        return fetch(url, { ...options, signal });
      },
    },
  }
);

/**
 * Health check helper — verifies Supabase connectivity
 * Uses a lightweight head-only query on sales_team (always exists)
 * @returns true if connection is healthy
 */
export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.from('sales_team').select('id', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}
