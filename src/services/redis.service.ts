/**
 * ENEOS Sales Automation - Redis Service
 * Distributed cache for deduplication and DLQ persistence
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

// ===========================================
// Types
// ===========================================

export interface RedisHealthCheck {
  healthy: boolean;
  latency?: number;
  error?: string;
}

// ===========================================
// Redis Service
// ===========================================

class RedisService {
  private client: Redis | null = null;
  private readonly enabled: boolean;
  private readonly redisLogger = logger.child({ module: 'redis' });
  private isConnected = false;

  constructor() {
    this.enabled = config.redis.enabled;
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (!this.enabled) {
      this.redisLogger.info('Redis is disabled, using in-memory fallback');
      return;
    }

    try {
      this.client = new Redis(config.redis.url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            this.redisLogger.error('Redis connection failed after 3 retries');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 200, 2000);
          return delay;
        },
        lazyConnect: true,
      });

      // Event handlers
      this.client.on('connect', () => {
        this.isConnected = true;
        this.redisLogger.info('Redis connected');
      });

      this.client.on('error', (err) => {
        this.redisLogger.error('Redis error', { error: err.message });
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.redisLogger.warn('Redis connection closed');
      });

      this.client.on('reconnecting', () => {
        this.redisLogger.info('Redis reconnecting...');
      });

      // Establish connection
      await this.client.connect();
      this.redisLogger.info('Redis connection established', { url: this.maskRedisUrl(config.redis.url) });
    } catch (error) {
      this.redisLogger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - allow fallback to in-memory
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      this.redisLogger.info('Redis disconnected');
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.enabled && this.isConnected && this.client !== null;
  }

  /**
   * Get client safely (throws if not available)
   * Use after isAvailable() check to avoid non-null assertions
   */
  private getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client is not initialized');
    }
    return this.client;
  }

  // ===========================================
  // Key-Value Operations
  // ===========================================

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }
    try {
      return await this.getClient().get(key);
    } catch (error) {
      this.redisLogger.error('Redis GET failed', { key, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Set a value with optional TTL (in seconds)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      if (ttlSeconds) {
        await this.getClient().setex(key, ttlSeconds, value);
      } else {
        await this.getClient().set(key, value);
      }
      return true;
    } catch (error) {
      this.redisLogger.error('Redis SET failed', { key, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      await this.getClient().del(key);
      return true;
    } catch (error) {
      this.redisLogger.error('Redis DEL failed', { key, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      const result = await this.getClient().exists(key);
      return result === 1;
    } catch (error) {
      this.redisLogger.error('Redis EXISTS failed', { key, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Set expiry on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      await this.getClient().expire(key, ttlSeconds);
      return true;
    } catch (error) {
      this.redisLogger.error('Redis EXPIRE failed', { key, error: (error as Error).message });
      return false;
    }
  }

  // ===========================================
  // Hash Operations (for complex objects)
  // ===========================================

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      await this.getClient().hset(key, field, value);
      return true;
    } catch (error) {
      this.redisLogger.error('Redis HSET failed', { key, field, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }
    try {
      return await this.getClient().hget(key, field);
    } catch (error) {
      this.redisLogger.error('Redis HGET failed', { key, field, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Get all hash fields
   */
  async hgetall(key: string): Promise<Record<string, string> | null> {
    if (!this.isAvailable()) {
      return null;
    }
    try {
      const result = await this.getClient().hgetall(key);
      return Object.keys(result).length > 0 ? result : null;
    } catch (error) {
      this.redisLogger.error('Redis HGETALL failed', { key, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Delete hash field
   */
  async hdel(key: string, field: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      await this.getClient().hdel(key, field);
      return true;
    } catch (error) {
      this.redisLogger.error('Redis HDEL failed', { key, field, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get all hash keys
   */
  async hkeys(key: string): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }
    try {
      return await this.getClient().hkeys(key);
    } catch (error) {
      this.redisLogger.error('Redis HKEYS failed', { key, error: (error as Error).message });
      return [];
    }
  }

  /**
   * Get hash length
   */
  async hlen(key: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }
    try {
      return await this.getClient().hlen(key);
    } catch (error) {
      this.redisLogger.error('Redis HLEN failed', { key, error: (error as Error).message });
      return 0;
    }
  }

  // ===========================================
  // List Operations (for DLQ)
  // ===========================================

  /**
   * Push to list (right)
   */
  async rpush(key: string, value: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      await this.getClient().rpush(key, value);
      return true;
    } catch (error) {
      this.redisLogger.error('Redis RPUSH failed', { key, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get list range
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }
    try {
      return await this.getClient().lrange(key, start, stop);
    } catch (error) {
      this.redisLogger.error('Redis LRANGE failed', { key, error: (error as Error).message });
      return [];
    }
  }

  /**
   * Get list length
   */
  async llen(key: string): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }
    try {
      return await this.getClient().llen(key);
    } catch (error) {
      this.redisLogger.error('Redis LLEN failed', { key, error: (error as Error).message });
      return 0;
    }
  }

  /**
   * Remove from list
   */
  async lrem(key: string, count: number, value: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      await this.getClient().lrem(key, count, value);
      return true;
    } catch (error) {
      this.redisLogger.error('Redis LREM failed', { key, error: (error as Error).message });
      return false;
    }
  }

  // ===========================================
  // Health Check
  // ===========================================

  /**
   * Health check with latency measurement
   */
  async healthCheck(): Promise<RedisHealthCheck> {
    if (!this.enabled) {
      return { healthy: true }; // If disabled, consider it healthy (fallback is in-memory)
    }

    if (!this.isAvailable()) {
      return { healthy: false, error: 'Redis not connected' };
    }

    try {
      const start = Date.now();
      await this.getClient().ping();
      const latency = Date.now() - start;

      return { healthy: true, latency };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===========================================
  // Utility Methods
  // ===========================================

  /**
   * Mask Redis URL for logging (hide password)
   */
  private maskRedisUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        parsed.password = '****';
      }
      return parsed.toString();
    } catch {
      return 'redis://****';
    }
  }

  /**
   * Flush all keys (use with caution!)
   */
  async flushAll(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    try {
      await this.getClient().flushall();
      this.redisLogger.warn('Redis FLUSHALL executed');
      return true;
    } catch (error) {
      this.redisLogger.error('Redis FLUSHALL failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }
    try {
      return await this.getClient().info();
    } catch (error) {
      this.redisLogger.error('Redis INFO failed', { error: (error as Error).message });
      return null;
    }
  }
}

// ===========================================
// Singleton Instance
// ===========================================

export const redisService = new RedisService();

// ===========================================
// Redis Key Prefixes (for namespace management)
// ===========================================

export const REDIS_KEYS = {
  // Deduplication keys (with TTL)
  DEDUP_PREFIX: 'dedup:',
  dedupKey: (key: string) => `dedup:${key}`,

  // DLQ keys
  DLQ_HASH: 'dlq:events',
  dlqEventKey: (id: string) => `dlq:event:${id}`,

  // Cache keys
  CACHE_PREFIX: 'cache:',
  cacheKey: (key: string) => `cache:${key}`,
} as const;
