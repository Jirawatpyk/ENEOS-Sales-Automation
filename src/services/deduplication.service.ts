/**
 * ENEOS Sales Automation - Deduplication Service
 * Prevents duplicate lead processing with Redis + in-memory fallback + Google Sheets persistence
 */

import { sheetsService } from './sheets.service.js';
import { dedupLogger as logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { createDedupKey, normalizeEmail } from '../utils/email-parser.js';
import { DuplicateLeadError } from '../types/index.js';
import { redisService, REDIS_KEYS } from './redis.service.js';

// ===========================================
// In-Memory Cache for Fallback
// ===========================================

interface CacheEntry {
  processedAt: Date;
  expiresAt: Date;
}

// Cache TTL: 24 hours (leads from same campaign within 24 hours are considered duplicates)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours in seconds for Redis

// ===========================================
// Main Service Class
// ===========================================

export class DeduplicationService {
  private cache: Map<string, CacheEntry>;
  private readonly enabled: boolean;

  constructor() {
    this.cache = new Map();
    this.enabled = config.features.deduplication;

    // Start cache cleanup interval (only needed when Redis is unavailable)
    if (this.enabled) {
      this.startCacheCleanup();
    }
  }

  /**
   * Check if a lead is duplicate and process if new
   * Returns true if duplicate, false if new (and marks as processed)
   *
   * Priority:
   * 1. Redis (if available) - distributed cache
   * 2. In-memory cache - fallback
   * 3. Google Sheets - persistent storage
   */
  async checkAndMark(email: string, leadSource: string): Promise<boolean> {
    if (!this.enabled) {
      logger.debug('Deduplication disabled, allowing all leads');
      return false;
    }

    const normalizedEmail = normalizeEmail(email);
    const key = createDedupKey(normalizedEmail, leadSource);
    const redisKey = REDIS_KEYS.dedupKey(key);

    logger.debug('Checking deduplication', { key, redisAvailable: redisService.isAvailable() });

    // Fast path 1: Check Redis if available
    if (redisService.isAvailable()) {
      const existsInRedis = await redisService.exists(redisKey);
      if (existsInRedis) {
        logger.info('Duplicate found in Redis', { key });
        return true;
      }
    }

    // Fast path 2: Check in-memory cache (fallback or additional layer)
    if (this.isInCache(key)) {
      logger.info('Duplicate found in memory cache', { key });
      // Also add to Redis if available (sync caches)
      if (redisService.isAvailable()) {
        await redisService.set(redisKey, new Date().toISOString(), CACHE_TTL_SECONDS);
      }
      return true;
    }

    // Slow path: check Google Sheets
    const existsInSheet = await sheetsService.checkDuplicate(key);

    if (existsInSheet) {
      // Add to caches for faster future lookups
      await this.addToCaches(key);
      logger.info('Duplicate found in Google Sheets', { key });
      return true;
    }

    // Not a duplicate - mark as processed
    await this.markAsProcessed(key, normalizedEmail, leadSource);

    logger.info('New lead processed', { key });
    return false;
  }

  /**
   * Check if duplicate and throw error if true
   */
  async checkOrThrow(email: string, leadSource: string): Promise<void> {
    const isDuplicate = await this.checkAndMark(email, leadSource);

    if (isDuplicate) {
      throw new DuplicateLeadError(email, leadSource);
    }
  }

  /**
   * Check only (without marking)
   */
  async isDuplicate(email: string, leadSource: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const normalizedEmail = normalizeEmail(email);
    const key = createDedupKey(normalizedEmail, leadSource);
    const redisKey = REDIS_KEYS.dedupKey(key);

    // Check Redis first
    if (redisService.isAvailable()) {
      const existsInRedis = await redisService.exists(redisKey);
      if (existsInRedis) {
        return true;
      }
    }

    // Check in-memory cache
    if (this.isInCache(key)) {
      return true;
    }

    // Check Google Sheets
    return sheetsService.checkDuplicate(key);
  }

  // ===========================================
  // Private Methods
  // ===========================================

  /**
   * Check if key exists in in-memory cache and is not expired
   */
  private isInCache(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (new Date() > entry.expiresAt) {
      // Entry expired, remove from cache
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Add key to all available caches
   */
  private async addToCaches(key: string): Promise<void> {
    const now = new Date();

    // Add to in-memory cache
    this.cache.set(key, {
      processedAt: now,
      expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
    });

    // Add to Redis if available
    if (redisService.isAvailable()) {
      const redisKey = REDIS_KEYS.dedupKey(key);
      await redisService.set(redisKey, now.toISOString(), CACHE_TTL_SECONDS);
    }
  }

  /**
   * Mark lead as processed (all caches + Google Sheets)
   */
  private async markAsProcessed(
    key: string,
    email: string,
    leadSource: string
  ): Promise<void> {
    // Add to caches immediately
    await this.addToCaches(key);

    // Persist to Google Sheets (async, don't wait)
    sheetsService.markAsProcessed(key, email, leadSource).catch((error) => {
      logger.error('Failed to persist dedup record to sheets', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  /**
   * Start periodic in-memory cache cleanup
   * Note: Redis handles TTL automatically, so this is only for in-memory
   */
  private startCacheCleanup(): void {
    // Cleanup every 5 minutes
    setInterval(() => {
      const now = new Date();
      let cleanedCount = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.debug('In-memory cache cleanup completed', {
          cleaned: cleanedCount,
          remaining: this.cache.size,
        });
      }
    }, 5 * 60 * 1000);
  }

  // ===========================================
  // Cache Management
  // ===========================================

  /**
   * Get current in-memory cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Clear entire in-memory cache (use with caution)
   */
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.warn('Deduplication in-memory cache cleared', { clearedEntries: size });
  }

  /**
   * Preload cache from Google Sheets (for startup)
   */
  async preloadCache(_limit: number = 1000): Promise<void> {
    logger.info('Preloading deduplication cache from Google Sheets');

    try {
      // This would require adding a method to fetch recent dedup entries
      // For now, we'll just log the intention
      logger.info('Cache preload not implemented - will populate on demand');
    } catch (error) {
      logger.error('Failed to preload cache', { error });
    }
  }

  /**
   * Health check / Stats
   */
  getStats(): {
    enabled: boolean;
    memoryCacheSize: number;
    redisAvailable: boolean;
    cacheTtlMs: number;
  } {
    return {
      enabled: this.enabled,
      memoryCacheSize: this.cache.size,
      redisAvailable: redisService.isAvailable(),
      cacheTtlMs: CACHE_TTL_MS,
    };
  }
}

// Export singleton instance
export const deduplicationService = new DeduplicationService();
