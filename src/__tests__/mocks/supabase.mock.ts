/**
 * Supabase Mock Factory
 * Chainable mock pattern for unit tests
 *
 * Usage (shared factory):
 *   import { createMockSupabaseClient } from '../mocks/supabase.mock.js';
 *   const { mockSupabase, mockChain } = createMockSupabaseClient();
 *
 * Usage (vi.hoisted pattern — required for vi.mock):
 *   const { mockSupabase, mockChain } = vi.hoisted(() => {
 *     // Inline mock definition (vi.hoisted is synchronous)
 *     const mockChain = { select: vi.fn().mockReturnThis(), ... };
 *     const mockSupabase = { from: vi.fn().mockReturnValue(mockChain) };
 *     return { mockSupabase, mockChain };
 *   });
 *   vi.mock('../../lib/supabase.js', () => ({ supabase: mockSupabase }));
 */

import { vi } from 'vitest';

export const createMockSupabaseClient = () => {
  /**
   * Chainable mock that mirrors Supabase's PostgrestFilterBuilder.
   * The `then` method makes this object "thenable" (Promise/A+ spec) —
   * `await supabase.from('table').select()` resolves to `{ data, error }`.
   * This matches real Supabase SDK behavior where the query builder is thenable.
   */
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
  };

  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockChain),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return { mockSupabase, mockChain };
};
