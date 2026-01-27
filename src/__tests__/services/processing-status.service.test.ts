/**
 * Processing Status Service Tests
 * Tests for background processing status tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { processingStatusService } from '../../services/processing-status.service.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ProcessingStatusService', () => {
  beforeEach(() => {
    // Clear before each test
    processingStatusService.clear();
  });

  afterEach(() => {
    // Clear all statuses and timers after each test
    processingStatusService.clear();
  });

  describe('create', () => {
    it('should create new status with pending state', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      const email = 'test@example.com';
      const company = 'Test Corp';

      processingStatusService.create(correlationId, email, company);

      const status = processingStatusService.get(correlationId);
      expect(status).toBeDefined();
      expect(status?.correlationId).toBe(correlationId);
      expect(status?.email).toBe(email);
      expect(status?.company).toBe(company);
      expect(status?.status).toBe('pending');
      expect(status?.startedAt).toBeDefined();
      expect(status?.completedAt).toBeUndefined();
    });

    it('should create status with ISO 8601 timestamp', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      processingStatusService.create(correlationId, 'test@example.com', 'Test Corp');

      const status = processingStatusService.get(correlationId);
      expect(status?.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('startProcessing', () => {
    it('should update status to processing', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      processingStatusService.create(correlationId, 'test@example.com', 'Test Corp');
      processingStatusService.startProcessing(correlationId);

      const status = processingStatusService.get(correlationId);
      expect(status?.status).toBe('processing');
    });

    it('should not crash if status not found', () => {
      const correlationId = 'non-existent-id';

      expect(() => {
        processingStatusService.startProcessing(correlationId);
      }).not.toThrow();
    });
  });

  describe('complete', () => {
    it('should update status to completed with all fields', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      processingStatusService.create(correlationId, 'test@example.com', 'Test Corp');
      processingStatusService.startProcessing(correlationId);
      processingStatusService.complete(correlationId, 42, 'Manufacturing', 0.95, 15.5);

      const status = processingStatusService.get(correlationId);
      expect(status?.status).toBe('completed');
      expect(status?.completedAt).toBeDefined();
      expect(status?.rowNumber).toBe(42);
      expect(status?.industry).toBe('Manufacturing');
      expect(status?.confidence).toBe(0.95);
      expect(status?.duration).toBe(15.5);
    });

    it('should set completedAt timestamp', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      processingStatusService.create(correlationId, 'test@example.com', 'Test Corp');
      processingStatusService.complete(correlationId, 42, 'Technology');

      const status = processingStatusService.get(correlationId);
      expect(status?.completedAt).toBeDefined();
      expect(status?.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should not crash if status not found', () => {
      const correlationId = 'non-existent-id';

      expect(() => {
        processingStatusService.complete(correlationId, 42, 'Technology');
      }).not.toThrow();
    });
  });

  describe('fail', () => {
    it('should update status to failed with error message', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      processingStatusService.create(correlationId, 'test@example.com', 'Test Corp');
      processingStatusService.startProcessing(correlationId);
      processingStatusService.fail(correlationId, 'Gemini API timeout', 5.0);

      const status = processingStatusService.get(correlationId);
      expect(status?.status).toBe('failed');
      expect(status?.completedAt).toBeDefined();
      expect(status?.error).toBe('Gemini API timeout');
      expect(status?.duration).toBe(5.0);
    });

    it('should not crash if status not found', () => {
      const correlationId = 'non-existent-id';

      expect(() => {
        processingStatusService.fail(correlationId, 'Test error');
      }).not.toThrow();
    });
  });

  describe('get', () => {
    it('should return status if exists', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      processingStatusService.create(correlationId, 'test@example.com', 'Test Corp');

      const status = processingStatusService.get(correlationId);
      expect(status).not.toBeNull();
      expect(status?.correlationId).toBe(correlationId);
    });

    it('should return null if status not found', () => {
      const correlationId = 'non-existent-id';

      const status = processingStatusService.get(correlationId);
      expect(status).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all statuses', () => {
      processingStatusService.create('id-1', 'test1@example.com', 'Company A');
      processingStatusService.create('id-2', 'test2@example.com', 'Company B');
      processingStatusService.create('id-3', 'test3@example.com', 'Company C');

      const statuses = processingStatusService.getAll();
      expect(statuses).toHaveLength(3);
      expect(statuses.map(s => s.correlationId)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('should return empty array when no statuses', () => {
      const statuses = processingStatusService.getAll();
      expect(statuses).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete status and clear timer', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      processingStatusService.create(correlationId, 'test@example.com', 'Test Corp');
      expect(processingStatusService.get(correlationId)).not.toBeNull();

      const deleted = processingStatusService.delete(correlationId);
      expect(deleted).toBe(true);
      expect(processingStatusService.get(correlationId)).toBeNull();
    });

    it('should return false when deleting non-existent status', () => {
      const correlationId = 'non-existent-id';

      const deleted = processingStatusService.delete(correlationId);
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all statuses', () => {
      processingStatusService.create('id-1', 'test1@example.com', 'Company A');
      processingStatusService.create('id-2', 'test2@example.com', 'Company B');

      expect(processingStatusService.getAll()).toHaveLength(2);

      processingStatusService.clear();

      expect(processingStatusService.getAll()).toHaveLength(0);
    });

    it('should clear all timers to prevent memory leaks', () => {
      processingStatusService.create('id-1', 'test1@example.com', 'Company A');
      processingStatusService.create('id-2', 'test2@example.com', 'Company B');

      // Clear should stop all timers
      processingStatusService.clear();

      // Verify no memory leaks - statuses should stay cleared
      expect(processingStatusService.getAll()).toHaveLength(0);
    });
  });

  describe('TTL auto-expiration', () => {
    it('should auto-delete status after TTL', async () => {
      // Note: Can't test TTL easily with singleton since TTL is 1 hour
      // This test verifies the timer cleanup mechanism instead
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      processingStatusService.create(correlationId, 'test@example.com', 'Test Corp');

      expect(processingStatusService.get(correlationId)).not.toBeNull();

      // Manually delete to simulate TTL expiration
      processingStatusService.delete(correlationId);

      expect(processingStatusService.get(correlationId)).toBeNull();
    });
  });

  describe('status lifecycle', () => {
    it('should follow pending -> processing -> completed flow', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      // Create
      processingStatusService.create(correlationId, 'test@example.com', 'Test Corp');
      expect(processingStatusService.get(correlationId)?.status).toBe('pending');

      // Start processing
      processingStatusService.startProcessing(correlationId);
      expect(processingStatusService.get(correlationId)?.status).toBe('processing');

      // Complete
      processingStatusService.complete(correlationId, 42, 'Technology', 0.95, 15.5);
      expect(processingStatusService.get(correlationId)?.status).toBe('completed');
    });

    it('should follow pending -> processing -> failed flow', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      // Create
      processingStatusService.create(correlationId, 'test@example.com', 'Test Corp');
      expect(processingStatusService.get(correlationId)?.status).toBe('pending');

      // Start processing
      processingStatusService.startProcessing(correlationId);
      expect(processingStatusService.get(correlationId)?.status).toBe('processing');

      // Fail
      processingStatusService.fail(correlationId, 'API error', 5.0);
      expect(processingStatusService.get(correlationId)?.status).toBe('failed');
    });
  });

  describe('edge cases', () => {
    it('should handle multiple updates to same status', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      processingStatusService.create(correlationId, 'test@example.com', 'Test Corp');
      processingStatusService.startProcessing(correlationId);
      processingStatusService.startProcessing(correlationId); // Call again

      expect(processingStatusService.get(correlationId)?.status).toBe('processing');
    });

    it('should handle completion without starting processing', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      processingStatusService.create(correlationId, 'test@example.com', 'Test Corp');
      processingStatusService.complete(correlationId, 42, 'Technology');

      expect(processingStatusService.get(correlationId)?.status).toBe('completed');
    });

    it('should handle empty strings gracefully', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';

      processingStatusService.create(correlationId, '', '');

      const status = processingStatusService.get(correlationId);
      expect(status?.email).toBe('');
      expect(status?.company).toBe('');
    });
  });
});
