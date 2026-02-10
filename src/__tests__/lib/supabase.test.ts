/**
 * Tests for Supabase Client Module
 * AC: #5 — Supabase client connects successfully from Express app
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted — define mocks inline (synchronous)
const { mockCreateClient, mockClient } = vi.hoisted(() => {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue({ data: [{ id: 'test' }], error: null }),
    }),
  });
  const mockRpc = vi.fn().mockResolvedValue({ data: 'PostgreSQL 15.1', error: null });
  const mockClient = { from: mockFrom, rpc: mockRpc };
  const mockCreateClient = vi.fn().mockReturnValue(mockClient);
  return { mockCreateClient, mockClient, mockFrom };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

// Import AFTER mock setup
import { supabase, checkSupabaseHealth } from '../../lib/supabase.js';

describe('Supabase Client Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('client creation', () => {
    it('should export a supabase client instance created with createClient', () => {
      // The module-level createClient was called during import
      expect(supabase).toBeDefined();
      expect(supabase).toBe(mockClient);
    });

    it('should have from method available', () => {
      expect(supabase.from).toBeDefined();
      expect(typeof supabase.from).toBe('function');
    });
  });

  describe('client export', () => {
    it('should export supabase client as named export', () => {
      expect(supabase).toBeDefined();
    });

    it('should export checkSupabaseHealth function', () => {
      expect(checkSupabaseHealth).toBeDefined();
      expect(typeof checkSupabaseHealth).toBe('function');
    });
  });

  describe('checkSupabaseHealth', () => {
    it('should return true when connection is healthy', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: null, error: null, count: 1 });
      mockClient.from.mockReturnValue({ select: mockSelect });

      const result = await checkSupabaseHealth();
      expect(result).toBe(true);
      expect(mockClient.from).toHaveBeenCalledWith('sales_team');
    });

    it('should return false when query returns error', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: null, error: { message: 'connection error' } });
      mockClient.from.mockReturnValue({ select: mockSelect });

      const result = await checkSupabaseHealth();
      expect(result).toBe(false);
    });

    it('should return false when exception is thrown', async () => {
      mockClient.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await checkSupabaseHealth();
      expect(result).toBe(false);
    });
  });
});
