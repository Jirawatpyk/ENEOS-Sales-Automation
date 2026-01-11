/**
 * Deduplication Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DuplicateLeadError } from '../../types/index.js';

// Mock the sheets service before importing deduplication service
vi.mock('../../services/sheets.service.js', () => ({
  sheetsService: {
    checkDuplicate: vi.fn(),
    markAsProcessed: vi.fn(),
  },
}));

// Mock config
vi.mock('../../config/index.js', () => ({
  config: {
    features: {
      deduplication: true,
    },
  },
}));

// Mock logger
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

// Mock Redis service
vi.mock('../../services/redis.service.js', () => ({
  redisService: {
    isAvailable: vi.fn().mockReturnValue(false),
    exists: vi.fn().mockResolvedValue(false),
    set: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue(null),
  },
  REDIS_KEYS: {
    DEDUP_PREFIX: 'dedup:',
    dedupKey: (key: string) => `dedup:${key}`,
    DLQ_HASH: 'dlq:events',
    dlqEventKey: (id: string) => `dlq:event:${id}`,
    CACHE_PREFIX: 'cache:',
    cacheKey: (key: string) => `cache:${key}`,
  },
}));

describe('Deduplication Service', () => {
  let deduplicationService: typeof import('../../services/deduplication.service.js').deduplicationService;
  let sheetsService: typeof import('../../services/sheets.service.js').sheetsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset modules to get fresh instance
    vi.resetModules();

    // Re-import to get fresh instances
    const dedupModule = await import('../../services/deduplication.service.js');
    const sheetsModule = await import('../../services/sheets.service.js');

    deduplicationService = dedupModule.deduplicationService;
    sheetsService = sheetsModule.sheetsService;
  });

  afterEach(() => {
    // Clear cache between tests
    deduplicationService.clearCache();
  });

  describe('checkAndMark', () => {
    it('should return false for new lead and mark as processed', async () => {
      vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(false);
      vi.mocked(sheetsService.markAsProcessed).mockResolvedValue(undefined);

      const result = await deduplicationService.checkAndMark('test@example.com', '12345');

      expect(result).toBe(false);
      expect(sheetsService.checkDuplicate).toHaveBeenCalledWith('test@example.com_12345');
    });

    it('should return true for duplicate in cache', async () => {
      // First call - new lead
      vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(false);
      await deduplicationService.checkAndMark('test@example.com', '12345');

      // Second call - should be in cache
      const result = await deduplicationService.checkAndMark('test@example.com', '12345');

      expect(result).toBe(true);
      // Should not call sheets again (in cache)
      expect(sheetsService.checkDuplicate).toHaveBeenCalledTimes(1);
    });

    it('should return true for duplicate in Google Sheets', async () => {
      vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(true);

      const result = await deduplicationService.checkAndMark('existing@example.com', '12345');

      expect(result).toBe(true);
      expect(sheetsService.markAsProcessed).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(false);

      await deduplicationService.checkAndMark('TEST@EXAMPLE.COM', '12345');

      expect(sheetsService.checkDuplicate).toHaveBeenCalledWith('test@example.com_12345');
    });
  });

  describe('checkOrThrow', () => {
    it('should not throw for new lead', async () => {
      vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(false);

      await expect(
        deduplicationService.checkOrThrow('new@example.com', '12345')
      ).resolves.not.toThrow();
    });

    it('should throw DuplicateLeadError for existing lead', async () => {
      vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(true);

      await expect(
        deduplicationService.checkOrThrow('existing@example.com', '12345')
      ).rejects.toThrow('Lead already processed');
    });
  });

  describe('isDuplicate', () => {
    it('should return false for non-duplicate', async () => {
      vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(false);

      const result = await deduplicationService.isDuplicate('test@example.com', '12345');

      expect(result).toBe(false);
    });

    it('should return true for duplicate', async () => {
      vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(true);

      const result = await deduplicationService.isDuplicate('existing@example.com', '12345');

      expect(result).toBe(true);
    });

    it('should check cache first before Google Sheets', async () => {
      // Add to cache first
      vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(false);
      await deduplicationService.checkAndMark('cached@example.com', '12345');

      // Reset mock to verify it's not called
      vi.mocked(sheetsService.checkDuplicate).mockClear();

      const result = await deduplicationService.isDuplicate('cached@example.com', '12345');

      expect(result).toBe(true);
      expect(sheetsService.checkDuplicate).not.toHaveBeenCalled();
    });
  });

  describe('cache management', () => {
    it('should track cache size correctly', async () => {
      vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(false);

      expect(deduplicationService.getCacheSize()).toBe(0);

      await deduplicationService.checkAndMark('test1@example.com', '12345');
      expect(deduplicationService.getCacheSize()).toBe(1);

      await deduplicationService.checkAndMark('test2@example.com', '12345');
      expect(deduplicationService.getCacheSize()).toBe(2);
    });

    it('should clear cache correctly', async () => {
      vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(false);

      await deduplicationService.checkAndMark('test@example.com', '12345');
      expect(deduplicationService.getCacheSize()).toBe(1);

      deduplicationService.clearCache();
      expect(deduplicationService.getCacheSize()).toBe(0);
    });

    it('should return stats correctly', () => {
      const stats = deduplicationService.getStats();

      expect(stats).toEqual({
        enabled: true,
        memoryCacheSize: expect.any(Number),
        redisAvailable: expect.any(Boolean),
        cacheTtlMs: expect.any(Number),
      });
    });
  });
});
