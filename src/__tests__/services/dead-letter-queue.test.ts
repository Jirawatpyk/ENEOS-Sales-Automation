/**
 * Dead Letter Queue Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  deadLetterQueue,
  addFailedBrevoWebhook,
  addFailedLinePostback,
  addFailedSheetsUpdate,
  addFailedLineNotification,
} from '../../services/dead-letter-queue.service.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    child: () => ({
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Mock Redis service
vi.mock('../../services/redis.service.js', () => ({
  redisService: {
    isAvailable: vi.fn().mockReturnValue(false),
    hset: vi.fn().mockResolvedValue(true),
    hget: vi.fn().mockResolvedValue(null),
    hgetall: vi.fn().mockResolvedValue(null),
    hdel: vi.fn().mockResolvedValue(true),
    hkeys: vi.fn().mockResolvedValue([]),
  },
  REDIS_KEYS: {
    DLQ_HASH: 'dlq:events',
    dlqEventKey: (id: string) => `dlq:event:${id}`,
  },
}));

describe('DeadLetterQueueService', () => {
  beforeEach(() => {
    // Clear the queue before each test
    deadLetterQueue.clear();
  });

  describe('add', () => {
    it('should add a failed event to the queue', () => {
      const id = deadLetterQueue.add(
        'brevo_webhook',
        { email: 'test@example.com' },
        new Error('Test error'),
        'req-123'
      );

      expect(id).toBeDefined();
      expect(id).toContain('brevo_webhook');

      const event = deadLetterQueue.get(id);
      expect(event).toBeDefined();
      expect(event?.type).toBe('brevo_webhook');
      expect(event?.payload).toEqual({ email: 'test@example.com' });
      expect(event?.error.message).toBe('Test error');
      expect(event?.metadata.requestId).toBe('req-123');
      expect(event?.metadata.retryCount).toBe(0);
    });

    it('should generate unique IDs for each event', () => {
      const id1 = deadLetterQueue.add(
        'brevo_webhook',
        { email: 'test1@example.com' },
        new Error('Error 1')
      );

      const id2 = deadLetterQueue.add(
        'brevo_webhook',
        { email: 'test2@example.com' },
        new Error('Error 2')
      );

      expect(id1).not.toBe(id2);
    });

    it('should include error code if available', () => {
      const error = new Error('Test error') as Error & { code: string };
      error.code = 'ECONNRESET';

      const id = deadLetterQueue.add('line_postback', {}, error);
      const event = deadLetterQueue.get(id);

      expect(event?.error.code).toBe('ECONNRESET');
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent event', () => {
      const event = deadLetterQueue.get('non-existent-id');
      expect(event).toBeUndefined();
    });
  });

  describe('getByType', () => {
    it('should return events of specific type', () => {
      deadLetterQueue.add('brevo_webhook', { id: 1 }, new Error('Error 1'));
      deadLetterQueue.add('line_postback', { id: 2 }, new Error('Error 2'));
      deadLetterQueue.add('brevo_webhook', { id: 3 }, new Error('Error 3'));

      const brevoEvents = deadLetterQueue.getByType('brevo_webhook');
      expect(brevoEvents).toHaveLength(2);
      expect(brevoEvents.every(e => e.type === 'brevo_webhook')).toBe(true);

      const lineEvents = deadLetterQueue.getByType('line_postback');
      expect(lineEvents).toHaveLength(1);
    });

    it('should return empty array if no events of type exist', () => {
      deadLetterQueue.add('brevo_webhook', {}, new Error('Error'));
      const events = deadLetterQueue.getByType('sheets_update');
      expect(events).toHaveLength(0);
    });
  });

  describe('getAll', () => {
    it('should return all events sorted by timestamp (newest first)', () => {
      deadLetterQueue.add('brevo_webhook', { order: 1 }, new Error('Error 1'));
      deadLetterQueue.add('line_postback', { order: 2 }, new Error('Error 2'));
      deadLetterQueue.add('sheets_update', { order: 3 }, new Error('Error 3'));

      const events = deadLetterQueue.getAll();
      expect(events).toHaveLength(3);
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        deadLetterQueue.add('brevo_webhook', { i }, new Error(`Error ${i}`));
      }

      const events = deadLetterQueue.getAll(5);
      expect(events).toHaveLength(5);
    });
  });

  describe('markRetrying', () => {
    it('should increment retry count', () => {
      const id = deadLetterQueue.add('brevo_webhook', {}, new Error('Error'));

      expect(deadLetterQueue.markRetrying(id)).toBe(true);
      expect(deadLetterQueue.get(id)?.metadata.retryCount).toBe(1);

      expect(deadLetterQueue.markRetrying(id)).toBe(true);
      expect(deadLetterQueue.get(id)?.metadata.retryCount).toBe(2);
    });

    it('should set lastRetryAt timestamp', () => {
      const id = deadLetterQueue.add('brevo_webhook', {}, new Error('Error'));

      deadLetterQueue.markRetrying(id);
      const event = deadLetterQueue.get(id);

      expect(event?.metadata.lastRetryAt).toBeDefined();
    });

    it('should return false for non-existent event', () => {
      expect(deadLetterQueue.markRetrying('non-existent')).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove event from queue', () => {
      const id = deadLetterQueue.add('brevo_webhook', {}, new Error('Error'));

      expect(deadLetterQueue.remove(id)).toBe(true);
      expect(deadLetterQueue.get(id)).toBeUndefined();
    });

    it('should return false for non-existent event', () => {
      expect(deadLetterQueue.remove('non-existent')).toBe(false);
    });
  });

  describe('shouldRetry', () => {
    it('should return true when retry count is below max', () => {
      const id = deadLetterQueue.add('brevo_webhook', {}, new Error('Error'));

      expect(deadLetterQueue.shouldRetry(id)).toBe(true);

      deadLetterQueue.markRetrying(id);
      expect(deadLetterQueue.shouldRetry(id)).toBe(true);

      deadLetterQueue.markRetrying(id);
      expect(deadLetterQueue.shouldRetry(id)).toBe(true);
    });

    it('should return false when retry count reaches max', () => {
      const id = deadLetterQueue.add('brevo_webhook', {}, new Error('Error'));

      // Max retries is 3 by default
      deadLetterQueue.markRetrying(id);
      deadLetterQueue.markRetrying(id);
      deadLetterQueue.markRetrying(id);

      expect(deadLetterQueue.shouldRetry(id)).toBe(false);
    });

    it('should return false for non-existent event', () => {
      expect(deadLetterQueue.shouldRetry('non-existent')).toBe(false);
    });
  });

  describe('getRetryableEvents', () => {
    it('should return only events that can be retried', () => {
      const id1 = deadLetterQueue.add('brevo_webhook', { id: 1 }, new Error('Error 1'));
      const id2 = deadLetterQueue.add('brevo_webhook', { id: 2 }, new Error('Error 2'));

      // Max out retries on id2
      deadLetterQueue.markRetrying(id2);
      deadLetterQueue.markRetrying(id2);
      deadLetterQueue.markRetrying(id2);

      const retryable = deadLetterQueue.getRetryableEvents();
      expect(retryable).toHaveLength(1);
      expect(retryable[0].id).toBe(id1);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      deadLetterQueue.add('brevo_webhook', {}, new Error('Error 1'));
      deadLetterQueue.add('brevo_webhook', {}, new Error('Error 2'));
      deadLetterQueue.add('line_postback', {}, new Error('Error 3'));

      const stats = deadLetterQueue.getStats();

      expect(stats.totalEvents).toBe(3);
      expect(stats.byType['brevo_webhook']).toBe(2);
      expect(stats.byType['line_postback']).toBe(1);
      expect(stats.oldestEvent).toBeDefined();
      expect(stats.newestEvent).toBeDefined();
    });

    it('should return empty stats for empty queue', () => {
      const stats = deadLetterQueue.getStats();

      expect(stats.totalEvents).toBe(0);
      expect(stats.byType).toEqual({});
      expect(stats.oldestEvent).toBeUndefined();
      expect(stats.newestEvent).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should remove all events and return count', () => {
      deadLetterQueue.add('brevo_webhook', {}, new Error('Error 1'));
      deadLetterQueue.add('line_postback', {}, new Error('Error 2'));

      const count = deadLetterQueue.clear();

      expect(count).toBe(2);
      expect(deadLetterQueue.getStats().totalEvents).toBe(0);
    });
  });

  describe('export and import', () => {
    it('should export all events', () => {
      deadLetterQueue.add('brevo_webhook', { id: 1 }, new Error('Error 1'));
      deadLetterQueue.add('line_postback', { id: 2 }, new Error('Error 2'));

      const exported = deadLetterQueue.export();

      expect(exported).toHaveLength(2);
    });

    it('should import events', () => {
      const events = [
        {
          id: 'test-1',
          type: 'brevo_webhook' as const,
          payload: { id: 1 },
          error: { message: 'Error 1' },
          metadata: {
            timestamp: new Date().toISOString(),
            retryCount: 0,
          },
        },
        {
          id: 'test-2',
          type: 'line_postback' as const,
          payload: { id: 2 },
          error: { message: 'Error 2' },
          metadata: {
            timestamp: new Date().toISOString(),
            retryCount: 0,
          },
        },
      ];

      const imported = deadLetterQueue.import(events);

      expect(imported).toBe(2);
      expect(deadLetterQueue.get('test-1')).toBeDefined();
      expect(deadLetterQueue.get('test-2')).toBeDefined();
    });

    it('should not import duplicate IDs', () => {
      const id = deadLetterQueue.add('brevo_webhook', {}, new Error('Error'));
      const event = deadLetterQueue.get(id)!;

      const imported = deadLetterQueue.import([event]);
      expect(imported).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status with stats', () => {
      deadLetterQueue.add('brevo_webhook', {}, new Error('Error'));

      const health = deadLetterQueue.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.stats.totalEvents).toBe(1);
    });
  });

  describe('helper functions', () => {
    it('addFailedBrevoWebhook should add brevo_webhook type', () => {
      const id = addFailedBrevoWebhook({ email: 'test@example.com' }, new Error('Error'));
      const event = deadLetterQueue.get(id);

      expect(event?.type).toBe('brevo_webhook');
    });

    it('addFailedLinePostback should add line_postback type', () => {
      const id = addFailedLinePostback({ userId: 'U123' }, new Error('Error'));
      const event = deadLetterQueue.get(id);

      expect(event?.type).toBe('line_postback');
    });

    it('addFailedSheetsUpdate should add sheets_update type', () => {
      const id = addFailedSheetsUpdate({ rowId: 1 }, new Error('Error'));
      const event = deadLetterQueue.get(id);

      expect(event?.type).toBe('sheets_update');
    });

    it('addFailedLineNotification should add line_notification type', () => {
      const id = addFailedLineNotification({ message: 'test' }, new Error('Error'));
      const event = deadLetterQueue.get(id);

      expect(event?.type).toBe('line_notification');
    });
  });
});
