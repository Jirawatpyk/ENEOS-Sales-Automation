/**
 * ENEOS Sales Automation - Campaign Webhook Controller Tests
 * Story 9-2: Updated for Supabase migration + Campaign_Contacts removal
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
  recordCampaignEvent: mockRecordCampaignEvent,
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

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Event received',
        })
      );

      await vi.runAllTimersAsync();
    });

    it('should return 400 for invalid payload (missing required fields)', async () => {
      // Must have `event` key to enter campaign event flow (otherwise → automation handler → 200)
      const invalidPayload = { event: 'click', foo: 'bar' };

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
        event: 'hard_bounce',
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
        error: 'Supabase API error',
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

      expect(statusMock).toHaveBeenCalledWith(200);
      await vi.runAllTimersAsync();

      expect(mockAddFailedCampaignWebhook).toHaveBeenCalled();
    });

    it('should not throw on async errors (fire and forget)', async () => {
      const error = new Error('Unexpected error');
      mockRecordCampaignEvent.mockRejectedValue(error);

      const req = createMockRequest(validPayload);
      const { res, statusMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      await vi.runAllTimersAsync();
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
  // Guardrail Tests
  // ===========================================

  describe('handleCampaignWebhook - Guardrail: DLQ Arguments', () => {
    it('[P1] should pass correct arguments to DLQ on service failure', async () => {
      mockRecordCampaignEvent.mockResolvedValue({
        success: false,
        duplicate: false,
        error: 'Supabase timeout',
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

  // ===========================================
  // Story 9-2: Automation Contact Tests (AC #4)
  // ===========================================

  describe('handleAutomationContact (AC #4)', () => {
    const automationPayload = {
      email: 'john@example.com',
      attributes: {
        FIRSTNAME: 'John',
        LASTNAME: 'Doe',
        COMPANY: 'Acme Corp',
      },
      workflow_id: 100,
      step_id: 1,
    };

    it('AC4: should return 200 OK + Acknowledged for automation webhook', async () => {
      const req = createMockRequest(automationPayload);
      const { res, statusMock, jsonMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Acknowledged',
      });
    });

    it('AC4: should NOT call recordCampaignEvent for automation webhook', async () => {
      const req = createMockRequest(automationPayload);
      const { res } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(mockRecordCampaignEvent).not.toHaveBeenCalled();
    });

    it('AC4: should NOT call DLQ for automation webhook', async () => {
      const req = createMockRequest(automationPayload);
      const { res } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(mockAddFailedCampaignWebhook).not.toHaveBeenCalled();
    });

    it('AC4: should NOT do any background processing for automation webhook', async () => {
      const req = createMockRequest(automationPayload);
      const { res, statusMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      // No async calls expected
      expect(mockRecordCampaignEvent).not.toHaveBeenCalled();
      expect(mockAddFailedCampaignWebhook).not.toHaveBeenCalled();
    });

    it('AC1: should route to Campaign handler when payload has event field', async () => {
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

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Event received',
        })
      );

      await vi.runAllTimersAsync();
    });

    // Edge cases for 'event' in rawPayload detection
    it('AC1: should route to Campaign handler when event is null (key exists)', async () => {
      const nullEventPayload = {
        camp_id: 1,
        email: 'test@example.com',
        event: null,
        id: 100,
      };

      const req = createMockRequest(nullEventPayload);
      const { res, statusMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      // 'event' key exists (value is null), so routes to Campaign handler
      // Validator rejects null → 400
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('AC1: should route to Campaign handler when event is 0 (key exists)', async () => {
      const zeroEventPayload = {
        camp_id: 1,
        email: 'test@example.com',
        event: 0,
        id: 100,
      };

      const req = createMockRequest(zeroEventPayload);
      const { res, statusMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('AC1: should route to Campaign handler when event is false (key exists)', async () => {
      const falseEventPayload = {
        camp_id: 1,
        email: 'test@example.com',
        event: false,
        id: 100,
      };

      const req = createMockRequest(falseEventPayload);
      const { res, statusMock } = createMockResponse();
      const next = vi.fn();

      await handleCampaignWebhook(
        req as Request,
        res as Response,
        next as NextFunction
      );

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });
});
