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

  describe('preloadCache', () => {
    it('should log preload message without error', async () => {
      const { dedupLogger } = await import('../../utils/logger.js');

      await deduplicationService.preloadCache();

      expect(dedupLogger.info).toHaveBeenCalledWith(
        'Preloading deduplication cache from Google Sheets'
      );
      expect(dedupLogger.info).toHaveBeenCalledWith(
        'Cache preload not implemented - will populate on demand'
      );
    });

    it('should accept custom limit parameter', async () => {
      // Should not throw with custom limit
      await expect(deduplicationService.preloadCache(500)).resolves.not.toThrow();
    });
  });

  describe('markAsProcessed error handling', () => {
    it('should handle sheets error when persisting dedup record', async () => {
      const { dedupLogger } = await import('../../utils/logger.js');
      vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(false);
      vi.mocked(sheetsService.markAsProcessed).mockRejectedValue(new Error('Sheets API error'));

      // Should not throw - error is caught and logged
      const result = await deduplicationService.checkAndMark('error@example.com', '12345');

      expect(result).toBe(false);
      // Give time for async markAsProcessed to fail
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(dedupLogger.error).toHaveBeenCalledWith(
        'Failed to persist dedup record to sheets',
        expect.objectContaining({ key: 'error@example.com_12345' })
      );
    });
  });

  describe('DuplicateLeadError', () => {
    it('should throw error with correct message and name', async () => {
      vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(true);

      try {
        await deduplicationService.checkOrThrow('dup@example.com', 'campaign-123');
        expect.fail('Should have thrown');
      } catch (error) {
        // Check error properties directly
        expect((error as Error).message).toContain('Lead already processed');
        expect((error as Error).message).toContain('dup@example.com');
        expect((error as Error).message).toContain('campaign-123');
        expect(error).toHaveProperty('name', 'DuplicateLeadError');
        expect(error).toHaveProperty('code', 'DUPLICATE_LEAD');
      }
    });
  });
});

describe('Deduplication Service with Redis', () => {
  let deduplicationService: typeof import('../../services/deduplication.service.js').deduplicationService;
  let sheetsService: typeof import('../../services/sheets.service.js').sheetsService;
  let redisService: typeof import('../../services/redis.service.js').redisService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock Redis as available
    vi.doMock('../../services/redis.service.js', () => ({
      redisService: {
        isAvailable: vi.fn().mockReturnValue(true),
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

    const dedupModule = await import('../../services/deduplication.service.js');
    const sheetsModule = await import('../../services/sheets.service.js');
    const redisModule = await import('../../services/redis.service.js');

    deduplicationService = dedupModule.deduplicationService;
    sheetsService = sheetsModule.sheetsService;
    redisService = redisModule.redisService;
  });

  afterEach(() => {
    deduplicationService.clearCache();
  });

  it('should check Redis first when available', async () => {
    vi.mocked(redisService.exists).mockResolvedValue(true);

    const result = await deduplicationService.checkAndMark('redis@example.com', '12345');

    expect(result).toBe(true);
    expect(redisService.exists).toHaveBeenCalled();
    // Should not reach sheets check
    expect(sheetsService.checkDuplicate).not.toHaveBeenCalled();
  });

  it('should add to Redis when processing new lead', async () => {
    vi.mocked(redisService.exists).mockResolvedValue(false);
    vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(false);

    await deduplicationService.checkAndMark('new@example.com', '12345');

    expect(redisService.set).toHaveBeenCalledWith(
      'dedup:new@example.com_12345',
      expect.any(String),
      expect.any(Number)
    );
  });

  it('should sync to Redis when found in memory cache', async () => {
    // First call - add to memory cache
    vi.mocked(redisService.exists).mockResolvedValue(false);
    vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(false);
    await deduplicationService.checkAndMark('sync@example.com', '12345');

    // Clear Redis set call count
    vi.mocked(redisService.set).mockClear();

    // Second call - should be in memory cache and sync to Redis
    const result = await deduplicationService.checkAndMark('sync@example.com', '12345');

    expect(result).toBe(true);
    expect(redisService.set).toHaveBeenCalled(); // Sync to Redis
  });

  it('should add to caches when found in Google Sheets', async () => {
    vi.mocked(redisService.exists).mockResolvedValue(false);
    vi.mocked(sheetsService.checkDuplicate).mockResolvedValue(true);

    const result = await deduplicationService.checkAndMark('sheets@example.com', '12345');

    expect(result).toBe(true);
    expect(redisService.set).toHaveBeenCalled(); // Added to Redis cache
    expect(deduplicationService.getCacheSize()).toBe(1); // Added to memory cache
  });

  it('should check Redis in isDuplicate', async () => {
    vi.mocked(redisService.exists).mockResolvedValue(true);

    const result = await deduplicationService.isDuplicate('redis@example.com', '12345');

    expect(result).toBe(true);
    expect(redisService.exists).toHaveBeenCalled();
    expect(sheetsService.checkDuplicate).not.toHaveBeenCalled();
  });
});

describe('Deduplication Service - disabled', () => {
  let DeduplicationServiceClass: typeof import('../../services/deduplication.service.js').DeduplicationService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock config with deduplication disabled
    vi.doMock('../../config/index.js', () => ({
      config: {
        features: {
          deduplication: false,
        },
      },
    }));

    const dedupModule = await import('../../services/deduplication.service.js');
    DeduplicationServiceClass = dedupModule.DeduplicationService;
  });

  it('should return false for checkAndMark when disabled', async () => {
    const service = new DeduplicationServiceClass();

    const result = await service.checkAndMark('any@example.com', '12345');

    expect(result).toBe(false);
  });

  it('should return false for isDuplicate when disabled', async () => {
    const service = new DeduplicationServiceClass();

    const result = await service.isDuplicate('any@example.com', '12345');

    expect(result).toBe(false);
  });

  it('should not throw for checkOrThrow when disabled', async () => {
    const service = new DeduplicationServiceClass();

    await expect(
      service.checkOrThrow('any@example.com', '12345')
    ).resolves.not.toThrow();
  });
});
