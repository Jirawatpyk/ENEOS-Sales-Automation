/**
 * ENEOS Sales Automation - Campaign Webhook Controller Tests
 * Unit tests for Brevo Campaign Events webhook handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// ===========================================
// Mock Setup (Hoisted)
// ===========================================

const { mockRecordCampaignEvent } = vi.hoisted(() => ({
  mockRecordCampaignEvent: vi.fn(),
}));

const { mockAddFailedCampaignWebhook } = vi.hoisted(() => ({
  mockAddFailedCampaignWebhook: vi.fn(),
}));

vi.mock('../../services/campaign-stats.service.js', () => ({
  campaignStatsService: {
    recordCampaignEvent: mockRecordCampaignEvent,
  },
}));

vi.mock('../../services/dead-letter-queue.service.js', () => ({
  addFailedBrevoWebhook: mockAddFailedCampaignWebhook,
  deadLetterQueue: {
    getStats: vi.fn().mockReturnValue({ total: 0 }),
    getAll: vi.fn().mockReturnValue([]),
    remove: vi.fn().mockReturnValue(true),
    clear: vi.fn().mockReturnValue(0),
  },
}));

vi.mock('../../config/index.js', () => ({
  config: {
    isProd: false,
    isDev: true,
    logLevel: 'error',
  },
}));

// Helper to wait for async processing
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// ===========================================
// Import Controller After Mocks
// ===========================================

import {
  handleCampaignWebhook,
  verifyCampaignWebhook,
} from '../../controllers/campaign-webhook.controller.js';

// ===========================================
// Test Helpers
// ===========================================

function createMockRequest(body: unknown = {}): Partial<Request> {
  return {
    body,
    requestId: 'test-request-id',
  };
}

function createMockResponse(): {
  res: Partial<Response>;
  statusMock: ReturnType<typeof vi.fn>;
  jsonMock: ReturnType<typeof vi.fn>;
} {
  const jsonMock = vi.fn();
  const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
  return {
    res: {
      status: statusMock,
      json: jsonMock,
    },
    statusMock,
    jsonMock,
  };
}

// ===========================================
// Test Data
// ===========================================

const validPayload = {
  camp_id: 123,
  'campaign name': 'Test Campaign',
  email: 'test@example.com',
  event: 'click',
  id: 456,
  URL: 'https://example.com/link',
  date_event: '2026-01-30 10:00:00',
  date_sent: '2026-01-30 09:00:00',
  segment_ids: [1, 2],
  tag: 'promo',
};

// ===========================================
// Controller Tests
// ===========================================

describe('Campaign Webhook Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('handleCampaignWebhook', () => {
    it('should return 200 immediately for valid payload (non-blocking)', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: true,
        duplicate: false,
        eventId: 456,
        campaignId: 123,
      });

      const req = createMockRequest(validPayload);
      const { res, statusMock, jsonMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      // Response should be sent immediately (non-blocking pattern)
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Event received',
        })
      );

      // Wait for async processing
      await vi.runAllTimersAsync();
    });

    it('should return 400 for invalid payload (missing required fields)', async () => {
      const invalidPayload = { foo: 'bar' };

      const req = createMockRequest(invalidPayload);
      const { res, statusMock, jsonMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid payload',
        })
      );
    });

    it('should return 400 for invalid email format', async () => {
      const invalidPayload = {
        camp_id: 123,
        email: 'not-an-email',
        event: 'click',
        id: 456,
      };

      const req = createMockRequest(invalidPayload);
      const { res, statusMock, jsonMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid payload',
        })
      );
    });

    it('should return 200 immediately even for duplicate events', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: true,
        duplicate: true,
        eventId: 456,
        campaignId: 123,
      });

      const req = createMockRequest(validPayload);
      const { res, statusMock, jsonMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      // Response is sent immediately (non-blocking pattern)
      // Duplicate detection happens in async processing
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Event received',
        })
      );

      await vi.runAllTimersAsync();
    });

    it('should return 200 OK for disabled event types', async () => {
      const disabledEventPayload = {
        camp_id: 123,
        email: 'test@example.com',
        event: 'hard_bounce', // Not in ENABLED_EVENTS
        id: 789,
      };

      const req = createMockRequest(disabledEventPayload);
      const { res, statusMock, jsonMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('not enabled'),
        })
      );
      // Should NOT call recordCampaignEvent for disabled events
      expect(mockRecordCampaignEvent).not.toHaveBeenCalled();
    });

    it('should handle delivered event', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: true,
        duplicate: false,
        eventId: 100,
        campaignId: 123,
      });

      const deliveredPayload = {
        camp_id: 123,
        email: 'test@example.com',
        event: 'delivered',
        id: 100,
      };

      const req = createMockRequest(deliveredPayload);
      const { res, statusMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(200);

      // Wait for async processing
      await vi.runAllTimersAsync();

      expect(mockRecordCampaignEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'delivered',
          campaignId: 123,
        })
      );
    });

    it('should handle opened event', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: true,
        duplicate: false,
        eventId: 200,
        campaignId: 123,
      });

      const openedPayload = {
        camp_id: 123,
        email: 'test@example.com',
        event: 'opened',
        id: 200,
      };

      const req = createMockRequest(openedPayload);
      const { res, statusMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(200);

      // Wait for async processing
      await vi.runAllTimersAsync();

      expect(mockRecordCampaignEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'opened',
        })
      );
    });

    it('should handle click event with URL', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: true,
        duplicate: false,
        eventId: 456,
        campaignId: 123,
      });

      const req = createMockRequest(validPayload);
      const { res } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      // Wait for async processing
      await vi.runAllTimersAsync();

      expect(mockRecordCampaignEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'click',
          url: 'https://example.com/link',
        })
      );
    });

    it('should normalize campaign name field with space', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: true,
        duplicate: false,
        eventId: 456,
        campaignId: 123,
      });

      const req = createMockRequest(validPayload);
      const { res } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      // Wait for async processing
      await vi.runAllTimersAsync();

      expect(mockRecordCampaignEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignName: 'Test Campaign',
        })
      );
    });

    it('should add to DLQ on service failure (async)', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: false,
        duplicate: false,
        error: 'Google Sheets API error',
        eventId: 456,
        campaignId: 123,
      });
      mockAddFailedCampaignWebhook.mockReturnValue('dlq-123');

      const req = createMockRequest(validPayload);
      const { res, statusMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      // Response is sent immediately (non-blocking)
      expect(statusMock).toHaveBeenCalledWith(200);

      // Wait for async processing where DLQ add happens
      await vi.runAllTimersAsync();

      expect(mockAddFailedCampaignWebhook).toHaveBeenCalled();
    });

    it('should not throw on async errors (fire and forget)', async () => {
      const error = new Error('Unexpected error');
      mockRecordCampaignEvent.mockRejectedValue(error);

      const req = createMockRequest(validPayload);
      const { res, statusMock } = createMockResponse();
      const next = vi.fn();

      // Should not throw - errors are caught in async handler
      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      // Response should still be 200 (non-blocking pattern)
      expect(statusMock).toHaveBeenCalledWith(200);

      // Wait for async processing
      await vi.runAllTimersAsync();

      // next() should NOT be called because error is in async context
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('verifyCampaignWebhook', () => {
    it('should return 200 with success message', () => {
      const req = createMockRequest();
      const { res, statusMock, jsonMock } = createMockResponse();

      verifyCampaignWebhook(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Campaign webhook endpoint is active',
        })
      );
    });

    it('should include timestamp in response', () => {
      const req = createMockRequest();
      const { res, jsonMock } = createMockResponse();

      verifyCampaignWebhook(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });
  });

  // ===========================================
  // Guardrail Tests - Edge Cases & Security
  // ===========================================

  describe('handleCampaignWebhook - Guardrail: DLQ Arguments', () => {
    it('[P1] should pass correct arguments to DLQ on service failure', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: false,
        duplicate: false,
        error: 'Sheets API timeout',
        eventId: 456,
        campaignId: 123,
      });
      mockAddFailedCampaignWebhook.mockReturnValue('dlq-456');

      const req = createMockRequest(validPayload);
      const { res } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      await vi.runAllTimersAsync();

      // Verify DLQ receives the raw payload, error, and requestId
      expect(mockAddFailedCampaignWebhook).toHaveBeenCalledWith(
        validPayload,
        expect.any(Error),
        'test-request-id'
      );
    });
  });

  describe('handleCampaignWebhook - Guardrail: Edge Cases', () => {
    it('[P2] should handle undefined requestId gracefully', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: false,
        duplicate: false,
        error: 'Failure',
        eventId: 456,
        campaignId: 123,
      });
      mockAddFailedCampaignWebhook.mockReturnValue('dlq-789');

      const req = {
        body: validPayload,
        requestId: undefined,
      } as Partial<Request>;
      const { res, statusMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(200);

      await vi.runAllTimersAsync();

      expect(mockAddFailedCampaignWebhook).toHaveBeenCalledWith(
        validPayload,
        expect.any(Error),
        undefined
      );
    });

    it('[P1] should return 400 for empty string event type (rejected by validator)', async () => {
      const emptyEventPayload = {
        camp_id: 1,
        email: 'test@example.com',
        event: '',
        id: 100,
      };

      const req = createMockRequest(emptyEventPayload);
      const { res, statusMock, jsonMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      // Empty event is now rejected by Zod .min(1) constraint
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid payload',
        })
      );
      expect(mockRecordCampaignEvent).not.toHaveBeenCalled();
    });

    it('[P1] should return 200 with eventId and campaignId in response body', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: true,
        duplicate: false,
        eventId: 456,
        campaignId: 123,
      });

      const req = createMockRequest(validPayload);
      const { res, jsonMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 456,
          campaignId: 123,
        })
      );

      await vi.runAllTimersAsync();
    });

    it('[P1] should handle all disabled event types without calling service', async () => {
      const disabledEvents = ['hard_bounce', 'soft_bounce', 'unsubscribe', 'spam', 'unknown_type'];

      for (const eventType of disabledEvents) {
        vi.clearAllMocks();
        const payload = {
          camp_id: 1,
          email: 'test@example.com',
          event: eventType,
          id: 1,
        };

        const req = createMockRequest(payload);
        const { res, statusMock } = createMockResponse();
        const next = vi.fn();

        await handleCampaignWebhook(
          req as Request,
          res as Response,
          next as NextFunction
        );

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(mockRecordCampaignEvent).not.toHaveBeenCalled();
      }
    });
  });
});
