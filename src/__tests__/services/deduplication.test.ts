/**
 * Deduplication Service Tests (Supabase)
 * Story 9-1a: AC #8 — Rewritten for Supabase mock
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DuplicateLeadError } from '../../types/index.js';

// ===========================================
// Mock Setup (vi.hoisted)
// ===========================================

const { mockSupabase, mockChain } = vi.hoisted(() => {
  const mockChain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  const mockSupabase = {
    from: vi.fn().mockReturnValue(mockChain),
  };
  return { mockSupabase, mockChain };
});

vi.mock('../../lib/supabase.js', () => ({
  supabase: mockSupabase,
}));

vi.mock('../../utils/logger.js', () => ({
  dedupLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock('../../config/index.js', () => ({
  config: {
    features: {
      deduplication: true,
    },
  },
}));

import {
  checkAndMark,
  checkOrThrow,
  isDuplicate,
  getStats,
  buildDedupKey,
  deduplicationService,
} from '../../services/deduplication.service.js';

// ===========================================
// Tests
// ===========================================

describe('Deduplication Service (Supabase)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chainable mocks
    Object.values(mockChain).forEach((fn) => {
      if (typeof fn.mockReturnThis === 'function') {
        fn.mockReturnThis();
      }
    });
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue(mockChain);
  });

  // ===========================================
  // checkAndMark (AC #2)
  // ===========================================

  describe('checkAndMark', () => {
    it('should return false for new lead (insert succeeds)', async () => {
      // upsert with ignoreDuplicates: if row returned → new
      const selectPromise = Promise.resolve({
        data: [{ key: 'lead:test@example.com:Brevo' }],
        error: null,
      });
      mockChain.select.mockReturnValue({
        then: selectPromise.then.bind(selectPromise),
        catch: selectPromise.catch.bind(selectPromise),
      });

      const result = await checkAndMark('test@example.com', 'Brevo');

      expect(result).toBe(false); // not duplicate
      expect(mockSupabase.from).toHaveBeenCalledWith('dedup_log');
      expect(mockChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'lead:test@example.com:Brevo',
          info: 'test@example.com',
          source: 'Brevo',
        }),
        { onConflict: 'key', ignoreDuplicates: true }
      );
    });

    it('should return true for duplicate lead (insert returns empty)', async () => {
      // upsert with ignoreDuplicates: if empty → duplicate
      const selectPromise = Promise.resolve({
        data: [],
        error: null,
      });
      mockChain.select.mockReturnValue({
        then: selectPromise.then.bind(selectPromise),
        catch: selectPromise.catch.bind(selectPromise),
      });

      const result = await checkAndMark('dup@example.com', 'Brevo');

      expect(result).toBe(true); // is duplicate
    });

    it('should normalize email to lowercase', async () => {
      const selectPromise = Promise.resolve({
        data: [{ key: 'lead:test@example.com:Brevo' }],
        error: null,
      });
      mockChain.select.mockReturnValue({
        then: selectPromise.then.bind(selectPromise),
        catch: selectPromise.catch.bind(selectPromise),
      });

      await checkAndMark('TEST@EXAMPLE.COM', 'Brevo');

      expect(mockChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'lead:test@example.com:Brevo',
          info: 'test@example.com',
        }),
        expect.any(Object)
      );
    });

    it('should throw AppError on DB error', async () => {
      const selectPromise = Promise.resolve({
        data: null,
        error: { message: 'connection refused' },
      });
      mockChain.select.mockReturnValue({
        then: selectPromise.then.bind(selectPromise),
        catch: selectPromise.catch.bind(selectPromise),
      });

      await expect(checkAndMark('test@test.com', 'Brevo')).rejects.toThrow(
        'Deduplication check failed'
      );
    });
  });

  // ===========================================
  // checkOrThrow (AC #2)
  // ===========================================

  describe('checkOrThrow', () => {
    it('should not throw for new lead', async () => {
      const selectPromise = Promise.resolve({
        data: [{ key: 'lead:new@example.com:Brevo' }],
        error: null,
      });
      mockChain.select.mockReturnValue({
        then: selectPromise.then.bind(selectPromise),
        catch: selectPromise.catch.bind(selectPromise),
      });

      await expect(
        checkOrThrow('new@example.com', 'Brevo')
      ).resolves.not.toThrow();
    });

    it('should throw DuplicateLeadError for duplicate', async () => {
      const selectPromise = Promise.resolve({
        data: [],
        error: null,
      });
      mockChain.select.mockReturnValue({
        then: selectPromise.then.bind(selectPromise),
        catch: selectPromise.catch.bind(selectPromise),
      });

      await expect(
        checkOrThrow('dup@example.com', 'Brevo')
      ).rejects.toThrow(DuplicateLeadError);
    });

    it('should include email and source in error message', async () => {
      const selectPromise = Promise.resolve({
        data: [],
        error: null,
      });
      mockChain.select.mockReturnValue({
        then: selectPromise.then.bind(selectPromise),
        catch: selectPromise.catch.bind(selectPromise),
      });

      try {
        await checkOrThrow('dup@example.com', 'campaign-123');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('dup@example.com');
        expect((error as Error).message).toContain('campaign-123');
        expect(error).toHaveProperty('name', 'DuplicateLeadError');
        expect(error).toHaveProperty('code', 'DUPLICATE_LEAD');
      }
    });
  });

  // ===========================================
  // isDuplicate (check without marking)
  // ===========================================

  describe('isDuplicate', () => {
    it('should return false when not found', async () => {
      mockChain.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await isDuplicate('test@example.com', 'Brevo');

      expect(result).toBe(false);
      expect(mockSupabase.from).toHaveBeenCalledWith('dedup_log');
      expect(mockChain.eq).toHaveBeenCalledWith('key', 'lead:test@example.com:Brevo');
    });

    it('should return true when found', async () => {
      mockChain.maybeSingle.mockResolvedValue({
        data: { key: 'lead:existing@example.com:Brevo' },
        error: null,
      });

      const result = await isDuplicate('existing@example.com', 'Brevo');

      expect(result).toBe(true);
    });

    it('should throw AppError on DB error', async () => {
      mockChain.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'DB timeout' },
      });

      await expect(isDuplicate('test@test.com', 'Brevo')).rejects.toThrow(
        'Deduplication check failed'
      );
    });
  });

  // ===========================================
  // Feature flag disabled
  // ===========================================

  describe('feature flag disabled', () => {
    let checkAndMarkDisabled: typeof checkAndMark;
    let isDuplicateDisabled: typeof isDuplicate;
    let checkOrThrowDisabled: typeof checkOrThrow;

    beforeEach(async () => {
      vi.resetModules();

      vi.doMock('../../config/index.js', () => ({
        config: {
          features: {
            deduplication: false,
          },
        },
      }));

      const mod = await import('../../services/deduplication.service.js');
      checkAndMarkDisabled = mod.checkAndMark;
      isDuplicateDisabled = mod.isDuplicate;
      checkOrThrowDisabled = mod.checkOrThrow;
    });

    it('should return false for checkAndMark when disabled', async () => {
      const result = await checkAndMarkDisabled('any@example.com', 'Brevo');
      expect(result).toBe(false);
    });

    it('should return false for isDuplicate when disabled', async () => {
      const result = await isDuplicateDisabled('any@example.com', 'Brevo');
      expect(result).toBe(false);
    });

    it('should not throw for checkOrThrow when disabled', async () => {
      await expect(
        checkOrThrowDisabled('any@example.com', 'Brevo')
      ).resolves.not.toThrow();
    });
  });

  // ===========================================
  // Key format (AC #7)
  // ===========================================

  describe('buildDedupKey', () => {
    it('should use lead:{email}:{source} format', () => {
      expect(buildDedupKey('Test@Example.COM', 'Brevo')).toBe(
        'lead:test@example.com:Brevo'
      );
    });

    it('should use "unknown" for empty source', () => {
      expect(buildDedupKey('test@test.com', '')).toBe(
        'lead:test@test.com:unknown'
      );
    });
  });

  // ===========================================
  // getStats
  // ===========================================

  describe('getStats', () => {
    it('should return Supabase backend info', () => {
      const stats = getStats();

      expect(stats).toEqual({
        enabled: true,
        backend: 'supabase',
      });
    });
  });

  // ===========================================
  // Backward-compatible singleton export
  // ===========================================

  describe('deduplicationService (backward compat)', () => {
    it('should export singleton with all methods', () => {
      expect(deduplicationService.checkAndMark).toBe(checkAndMark);
      expect(deduplicationService.checkOrThrow).toBe(checkOrThrow);
      expect(deduplicationService.isDuplicate).toBe(isDuplicate);
      expect(deduplicationService.getStats).toBe(getStats);
    });
  });
});
