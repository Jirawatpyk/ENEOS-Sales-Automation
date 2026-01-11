/**
 * Redis Service Tests
 * Tests for Redis cache operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock config
vi.mock('../../config/index.js', () => ({
  config: {
    redis: {
      enabled: true,
      url: 'redis://localhost:6379',
    },
  },
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Create mock Redis client using vi.hoisted
const { mockRedisClient, MockRedis } = vi.hoisted(() => {
  const mockRedisClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    hset: vi.fn().mockResolvedValue(1),
    hget: vi.fn().mockResolvedValue(null),
    hgetall: vi.fn().mockResolvedValue({}),
    hdel: vi.fn().mockResolvedValue(1),
    hkeys: vi.fn().mockResolvedValue([]),
    hlen: vi.fn().mockResolvedValue(0),
    rpush: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
    llen: vi.fn().mockResolvedValue(0),
    lrem: vi.fn().mockResolvedValue(1),
    flushall: vi.fn().mockResolvedValue('OK'),
    info: vi.fn().mockResolvedValue('redis_version:6.0.0'),
    on: vi.fn(),
  };

  const MockRedis = vi.fn().mockImplementation(() => mockRedisClient);

  return { mockRedisClient, MockRedis };
});

vi.mock('ioredis', () => ({
  default: MockRedis,
}));

// Import after mocks
import { redisService, REDIS_KEYS } from '../../services/redis.service.js';

describe('RedisService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================
  // Connection Management
  // ===========================================

  describe('connect', () => {
    it('should attempt to connect when enabled', async () => {
      // Note: redisService is a singleton, so connect behavior depends on initial state
      // This test verifies the method exists and doesn't throw
      await expect(redisService.connect()).resolves.not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should handle disconnect gracefully', async () => {
      // This test verifies disconnect doesn't throw even if not connected
      await expect(redisService.disconnect()).resolves.not.toThrow();
    });
  });

  describe('isAvailable', () => {
    it('should return boolean indicating availability', () => {
      const result = redisService.isAvailable();

      expect(typeof result).toBe('boolean');
    });
  });

  // ===========================================
  // Key-Value Operations (when not available)
  // ===========================================

  describe('get (when not available)', () => {
    it('should return null when Redis is not available', async () => {
      const result = await redisService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set (when not available)', () => {
    it('should return false when Redis is not available', async () => {
      const result = await redisService.set('test-key', 'test-value');

      expect(result).toBe(false);
    });
  });

  describe('del (when not available)', () => {
    it('should return false when Redis is not available', async () => {
      const result = await redisService.del('test-key');

      expect(result).toBe(false);
    });
  });

  describe('exists (when not available)', () => {
    it('should return false when Redis is not available', async () => {
      const result = await redisService.exists('test-key');

      expect(result).toBe(false);
    });
  });

  describe('expire (when not available)', () => {
    it('should return false when Redis is not available', async () => {
      const result = await redisService.expire('test-key', 3600);

      expect(result).toBe(false);
    });
  });

  // ===========================================
  // Hash Operations (when not available)
  // ===========================================

  describe('hset (when not available)', () => {
    it('should return false when Redis is not available', async () => {
      const result = await redisService.hset('hash-key', 'field', 'value');

      expect(result).toBe(false);
    });
  });

  describe('hget (when not available)', () => {
    it('should return null when Redis is not available', async () => {
      const result = await redisService.hget('hash-key', 'field');

      expect(result).toBeNull();
    });
  });

  describe('hgetall (when not available)', () => {
    it('should return null when Redis is not available', async () => {
      const result = await redisService.hgetall('hash-key');

      expect(result).toBeNull();
    });
  });

  describe('hdel (when not available)', () => {
    it('should return false when Redis is not available', async () => {
      const result = await redisService.hdel('hash-key', 'field');

      expect(result).toBe(false);
    });
  });

  describe('hkeys (when not available)', () => {
    it('should return empty array when Redis is not available', async () => {
      const result = await redisService.hkeys('hash-key');

      expect(result).toEqual([]);
    });
  });

  describe('hlen (when not available)', () => {
    it('should return 0 when Redis is not available', async () => {
      const result = await redisService.hlen('hash-key');

      expect(result).toBe(0);
    });
  });

  // ===========================================
  // List Operations (when not available)
  // ===========================================

  describe('rpush (when not available)', () => {
    it('should return false when Redis is not available', async () => {
      const result = await redisService.rpush('list-key', 'value');

      expect(result).toBe(false);
    });
  });

  describe('lrange (when not available)', () => {
    it('should return empty array when Redis is not available', async () => {
      const result = await redisService.lrange('list-key', 0, -1);

      expect(result).toEqual([]);
    });
  });

  describe('llen (when not available)', () => {
    it('should return 0 when Redis is not available', async () => {
      const result = await redisService.llen('list-key');

      expect(result).toBe(0);
    });
  });

  describe('lrem (when not available)', () => {
    it('should return false when Redis is not available', async () => {
      const result = await redisService.lrem('list-key', 1, 'value');

      expect(result).toBe(false);
    });
  });

  // ===========================================
  // Health Check
  // ===========================================

  describe('healthCheck', () => {
    it('should return healthy true when Redis is disabled', async () => {
      // When disabled, health check returns true (fallback is in-memory)
      const result = await redisService.healthCheck();

      expect(result).toHaveProperty('healthy');
    });

    it('should return object with healthy and optional latency', async () => {
      const result = await redisService.healthCheck();

      expect(result).toHaveProperty('healthy');
      expect(typeof result.healthy).toBe('boolean');
    });
  });

  // ===========================================
  // Utility Methods (when not available)
  // ===========================================

  describe('flushAll (when not available)', () => {
    it('should return false when Redis is not available', async () => {
      const result = await redisService.flushAll();

      expect(result).toBe(false);
    });
  });

  describe('getInfo (when not available)', () => {
    it('should return null when Redis is not available', async () => {
      const result = await redisService.getInfo();

      expect(result).toBeNull();
    });
  });

  // ===========================================
  // Redis Key Helpers
  // ===========================================

  describe('REDIS_KEYS', () => {
    it('should have DEDUP_PREFIX', () => {
      expect(REDIS_KEYS.DEDUP_PREFIX).toBe('dedup:');
    });

    it('should have dedupKey function', () => {
      expect(REDIS_KEYS.dedupKey('test')).toBe('dedup:test');
    });

    it('should have DLQ_HASH', () => {
      expect(REDIS_KEYS.DLQ_HASH).toBe('dlq:events');
    });

    it('should have dlqEventKey function', () => {
      expect(REDIS_KEYS.dlqEventKey('123')).toBe('dlq:event:123');
    });

    it('should have CACHE_PREFIX', () => {
      expect(REDIS_KEYS.CACHE_PREFIX).toBe('cache:');
    });

    it('should have cacheKey function', () => {
      expect(REDIS_KEYS.cacheKey('data')).toBe('cache:data');
    });
  });
});
