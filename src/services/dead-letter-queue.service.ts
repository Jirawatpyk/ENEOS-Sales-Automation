/**
 * ENEOS Sales Automation - Dead Letter Queue Service
 * Stores failed events for later retry or manual review
 * Supports Redis persistence with in-memory fallback
 */

import { logger } from '../utils/logger.js';
import { redisService, REDIS_KEYS } from './redis.service.js';

// ===========================================
// Types
// ===========================================

export interface FailedEvent {
  id: string;
  type: 'brevo_webhook' | 'line_postback' | 'sheets_update' | 'line_notification';
  payload: unknown;
  error: {
    message: string;
    code?: string;
    stack?: string;
  };
  metadata: {
    requestId?: string;
    timestamp: string;
    retryCount: number;
    lastRetryAt?: string;
  };
}

export interface DLQStats {
  totalEvents: number;
  byType: Record<string, number>;
  oldestEvent?: string;
  newestEvent?: string;
  storageType: 'redis' | 'memory';
}

// ===========================================
// Dead Letter Queue Service
// ===========================================

class DeadLetterQueueService {
  private queue: Map<string, FailedEvent> = new Map();
  private maxQueueSize: number;
  private maxRetries: number;
  private dlqLogger = logger.child({ module: 'dlq' });

  constructor(options: { maxQueueSize?: number; maxRetries?: number } = {}) {
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Add a failed event to the queue (sync version for backward compatibility)
   */
  add(
    type: FailedEvent['type'],
    payload: unknown,
    error: Error,
    requestId?: string
  ): string {
    // Generate unique ID
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const failedEvent: FailedEvent = {
      id,
      type,
      payload,
      error: {
        message: error.message,
        code: (error as Error & { code?: string }).code,
        stack: error.stack,
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      },
    };

    // Try to save to Redis asynchronously
    if (redisService.isAvailable()) {
      redisService.hset(REDIS_KEYS.DLQ_HASH, id, JSON.stringify(failedEvent))
        .then((saved) => {
          if (saved) {
            this.dlqLogger.warn('Event added to DLQ (Redis)', {
              eventId: id,
              type,
              errorMessage: error.message,
            });
          }
        })
        .catch(() => {
          // Fallback already saved to memory
        });
    }

    // Always save to memory as fallback/backup
    if (this.queue.size >= this.maxQueueSize) {
      this.evictOldest();
    }
    this.queue.set(id, failedEvent);

    this.dlqLogger.warn('Event added to DLQ', {
      eventId: id,
      type,
      errorMessage: error.message,
      queueSize: this.queue.size,
      redisAvailable: redisService.isAvailable(),
    });

    return id;
  }

  /**
   * Get a failed event by ID
   */
  async getAsync(id: string): Promise<FailedEvent | undefined> {
    // Try Redis first
    if (redisService.isAvailable()) {
      const data = await redisService.hget(REDIS_KEYS.DLQ_HASH, id);
      if (data) {
        try {
          return JSON.parse(data) as FailedEvent;
        } catch {
          this.dlqLogger.error('Failed to parse DLQ event from Redis', { id });
        }
      }
    }

    // Fallback to in-memory
    return this.queue.get(id);
  }

  /**
   * Get a failed event by ID (sync version)
   */
  get(id: string): FailedEvent | undefined {
    return this.queue.get(id);
  }

  /**
   * Get all failed events of a specific type
   */
  getByType(type: FailedEvent['type']): FailedEvent[] {
    const events: FailedEvent[] = [];
    for (const event of this.queue.values()) {
      if (event.type === type) {
        events.push(event);
      }
    }
    return events;
  }

  /**
   * Get all failed events (with optional limit) - async version with Redis
   */
  async getAllAsync(limit?: number): Promise<FailedEvent[]> {
    const events: FailedEvent[] = [];

    // Try Redis first
    if (redisService.isAvailable()) {
      const allData = await redisService.hgetall(REDIS_KEYS.DLQ_HASH);
      if (allData) {
        for (const value of Object.values(allData)) {
          try {
            events.push(JSON.parse(value) as FailedEvent);
          } catch {
            // Skip invalid entries
          }
        }
      }
    }

    // Merge with in-memory (deduplicate by id)
    const seenIds = new Set(events.map(e => e.id));
    for (const event of this.queue.values()) {
      if (!seenIds.has(event.id)) {
        events.push(event);
      }
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) =>
      new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
    );

    return limit ? events.slice(0, limit) : events;
  }

  /**
   * Get all failed events (sync version - memory only)
   */
  getAll(limit?: number): FailedEvent[] {
    const events = Array.from(this.queue.values());

    // Sort by timestamp (newest first)
    events.sort((a, b) =>
      new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
    );

    return limit ? events.slice(0, limit) : events;
  }

  /**
   * Mark event as being retried
   */
  markRetrying(id: string): boolean {
    const event = this.queue.get(id);
    if (!event) {return false;}

    event.metadata.retryCount++;
    event.metadata.lastRetryAt = new Date().toISOString();

    // Update Redis asynchronously
    if (redisService.isAvailable()) {
      redisService.hset(REDIS_KEYS.DLQ_HASH, id, JSON.stringify(event)).catch(() => {
        // Logged internally
      });
    }

    this.dlqLogger.info('Event marked for retry', {
      eventId: id,
      retryCount: event.metadata.retryCount,
    });

    return true;
  }

  /**
   * Remove event from queue (after successful retry)
   */
  remove(id: string): boolean {
    const removed = this.queue.delete(id);

    // Also remove from Redis
    if (redisService.isAvailable()) {
      redisService.hdel(REDIS_KEYS.DLQ_HASH, id).catch(() => {
        // Logged internally
      });
    }

    if (removed) {
      this.dlqLogger.info('Event removed from DLQ', {
        eventId: id,
        remainingSize: this.queue.size,
      });
    }

    return removed;
  }

  /**
   * Check if event should be retried
   */
  shouldRetry(id: string): boolean {
    const event = this.queue.get(id);
    if (!event) {return false;}
    return event.metadata.retryCount < this.maxRetries;
  }

  /**
   * Get events eligible for retry
   */
  getRetryableEvents(): FailedEvent[] {
    const events: FailedEvent[] = [];
    for (const event of this.queue.values()) {
      if (event.metadata.retryCount < this.maxRetries) {
        events.push(event);
      }
    }
    return events;
  }

  /**
   * Get statistics about the queue
   */
  getStats(): DLQStats {
    const events = Array.from(this.queue.values());

    const byType: Record<string, number> = {};
    let oldestTimestamp: string | undefined;
    let newestTimestamp: string | undefined;

    for (const event of events) {
      byType[event.type] = (byType[event.type] || 0) + 1;

      if (!oldestTimestamp || event.metadata.timestamp < oldestTimestamp) {
        oldestTimestamp = event.metadata.timestamp;
      }
      if (!newestTimestamp || event.metadata.timestamp > newestTimestamp) {
        newestTimestamp = event.metadata.timestamp;
      }
    }

    return {
      totalEvents: this.queue.size,
      byType,
      oldestEvent: oldestTimestamp,
      newestEvent: newestTimestamp,
      storageType: redisService.isAvailable() ? 'redis' : 'memory',
    };
  }

  /**
   * Clear all events from queue
   */
  clear(): number {
    const count = this.queue.size;
    this.queue.clear();

    // Also clear Redis
    if (redisService.isAvailable()) {
      redisService.hkeys(REDIS_KEYS.DLQ_HASH).then(keys => {
        for (const key of keys) {
          redisService.hdel(REDIS_KEYS.DLQ_HASH, key).catch(() => {
            // Logged internally
          });
        }
      }).catch(() => {
        // Logged internally
      });
    }

    this.dlqLogger.warn('DLQ cleared', { clearedCount: count });

    return count;
  }

  /**
   * Export queue for persistence (e.g., to file or external storage)
   */
  export(): FailedEvent[] {
    return Array.from(this.queue.values());
  }

  /**
   * Import events into queue (e.g., from file on startup)
   */
  import(events: FailedEvent[]): number {
    let imported = 0;

    for (const event of events) {
      if (this.queue.size >= this.maxQueueSize) {break;}

      if (!this.queue.has(event.id)) {
        this.queue.set(event.id, event);
        imported++;

        // Also save to Redis
        if (redisService.isAvailable()) {
          redisService.hset(REDIS_KEYS.DLQ_HASH, event.id, JSON.stringify(event)).catch(() => {
            // Logged internally
          });
        }
      }
    }

    this.dlqLogger.info('Events imported to DLQ', {
      importedCount: imported,
      queueSize: this.queue.size,
    });

    return imported;
  }

  /**
   * Evict oldest event when at capacity
   */
  private evictOldest(): void {
    let oldestId: string | undefined;
    let oldestTimestamp: string | undefined;

    for (const [id, event] of this.queue.entries()) {
      if (!oldestTimestamp || event.metadata.timestamp < oldestTimestamp) {
        oldestTimestamp = event.metadata.timestamp;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.queue.delete(oldestId);
      this.dlqLogger.warn('Evicted oldest event from DLQ', {
        eventId: oldestId,
        timestamp: oldestTimestamp,
      });
    }
  }

  /**
   * Health check for the service
   */
  healthCheck(): { healthy: boolean; stats: DLQStats } {
    return {
      healthy: true,
      stats: this.getStats(),
    };
  }
}

// ===========================================
// Singleton Instance
// ===========================================

export const deadLetterQueue = new DeadLetterQueueService({
  maxQueueSize: 1000,
  maxRetries: 3,
});

// ===========================================
// Helper Functions
// ===========================================

/**
 * Add a failed Brevo webhook to DLQ
 */
export function addFailedBrevoWebhook(
  payload: unknown,
  error: Error,
  requestId?: string
): string {
  return deadLetterQueue.add('brevo_webhook', payload, error, requestId);
}

/**
 * Add a failed LINE postback to DLQ
 */
export function addFailedLinePostback(
  payload: unknown,
  error: Error,
  requestId?: string
): string {
  return deadLetterQueue.add('line_postback', payload, error, requestId);
}

/**
 * Add a failed Sheets update to DLQ
 */
export function addFailedSheetsUpdate(
  payload: unknown,
  error: Error,
  requestId?: string
): string {
  return deadLetterQueue.add('sheets_update', payload, error, requestId);
}

/**
 * Add a failed LINE notification to DLQ
 */
export function addFailedLineNotification(
  payload: unknown,
  error: Error,
  requestId?: string
): string {
  return deadLetterQueue.add('line_notification', payload, error, requestId);
}
