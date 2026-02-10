/**
 * Webhook Controller Tests (Scenario A)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  mockBrevoClickPayload,
  mockBrevoOpenPayload,
  mockInvalidPayload,
} from '../mocks/brevo.mock.js';
import { mockCompanyAnalysis } from '../mocks/gemini.mock.js';
import { mockLeadRow } from '../mocks/leads.mock.js';

// Mock all services
vi.mock('../../services/deduplication.service.js', () => ({
  checkOrThrow: vi.fn(),
}));

vi.mock('../../services/background-processor.service.js', () => ({
  processLeadAsync: vi.fn(),
}));

vi.mock('../../services/processing-status.service.js', () => ({
  processingStatusService: {
    create: vi.fn(),
    startProcessing: vi.fn(),
    complete: vi.fn(),
    fail: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
  },
}));

vi.mock('../../config/index.js', () => ({
  config: {
    features: {
      aiEnrichment: true,
      deduplication: true,
      lineNotifications: true,
    },
    isProd: false,
  },
}));

vi.mock('../../utils/logger.js', () => ({
  webhookLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('../../services/dead-letter-queue.service.js', () => ({
  addFailedBrevoWebhook: vi.fn().mockReturnValue('dlq-123'),
  deadLetterQueue: {
    add: vi.fn().mockReturnValue('dlq-123'),
    getStats: vi.fn().mockReturnValue({ totalEvents: 0, byType: {} }),
  },
}));

describe('Webhook Controller', () => {
  let handleBrevoWebhook: typeof import('../../controllers/webhook.controller.js').handleBrevoWebhook;
  let verifyWebhook: typeof import('../../controllers/webhook.controller.js').verifyWebhook;
  let checkOrThrow: typeof import('../../services/deduplication.service.js').checkOrThrow;
  let processLeadAsync: typeof import('../../services/background-processor.service.js').processLeadAsync;
  let processingStatusService: typeof import('../../services/processing-status.service.js').processingStatusService;

  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import modules
    const webhookController = await import('../../controllers/webhook.controller.js');
    const dedupModule = await import('../../services/deduplication.service.js');
    const bgProcessorModule = await import('../../services/background-processor.service.js');
    const statusModule = await import('../../services/processing-status.service.js');

    handleBrevoWebhook = webhookController.handleBrevoWebhook;
    verifyWebhook = webhookController.verifyWebhook;
    checkOrThrow = dedupModule.checkOrThrow;
    processLeadAsync = bgProcessorModule.processLeadAsync;
    processingStatusService = statusModule.processingStatusService;

    // Setup mocks
    vi.mocked(checkOrThrow).mockResolvedValue(undefined);
    vi.mocked(processLeadAsync).mockReturnValue(undefined);
    vi.mocked(processingStatusService.create).mockReturnValue(undefined);

    // Setup request/response mocks
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('handleBrevoWebhook', () => {
    it('should process valid click event successfully', async () => {
      mockReq = { body: mockBrevoClickPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(checkOrThrow).toHaveBeenCalled();
      expect(processingStatusService.create).toHaveBeenCalled();
      expect(processLeadAsync).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Lead received and processing',
          processing: 'background',
          correlationId: expect.any(String),
        })
      );
    });

    it('should ignore requests with event field (campaign event)', async () => {
      mockReq = { body: mockBrevoOpenPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(checkOrThrow).not.toHaveBeenCalled();
      expect(processLeadAsync).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Acknowledged',
      });
    });

    it('should ignore click events with event field (campaign event)', async () => {
      // Brevo Campaign sends click event with event field
      mockReq = { body: { ...mockBrevoClickPayload, event: 'click' } };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(checkOrThrow).not.toHaveBeenCalled();
      expect(processLeadAsync).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Acknowledged',
      });
    });

    it('should return 400 for invalid payload', async () => {
      mockReq = { body: mockInvalidPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid payload',
        })
      );
    });

    it('should handle duplicate lead gracefully', async () => {
      const { DuplicateLeadError } = await import('../../types/index.js');
      vi.mocked(checkOrThrow).mockRejectedValue(
        new DuplicateLeadError('test@example.com', '12345')
      );

      mockReq = { body: mockBrevoClickPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Duplicate lead - already processed',
        })
      );
    });

  });

  describe('verifyWebhook', () => {
    it('should return success for GET request', () => {
      mockReq = {};

      verifyWebhook(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Webhook endpoint is active',
        })
      );
    });

    it('should include timestamp in response', () => {
      mockReq = {};

      verifyWebhook(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('handleBrevoWebhook - error handling', () => {
    it('should add to DLQ when validation or deduplication throws error', async () => {
      const { addFailedBrevoWebhook } = await import('../../services/dead-letter-queue.service.js');
      const genericError = new Error('Database connection failed');
      vi.mocked(checkOrThrow).mockRejectedValueOnce(genericError);

      mockReq = { body: mockBrevoClickPayload, requestId: 'req-test-123' };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(addFailedBrevoWebhook).toHaveBeenCalledWith(
        mockBrevoClickPayload,
        expect.any(Error),
        'req-test-123'
      );
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

  });

  describe('handleBrevoWebhook - feature flags', () => {
    it('should queue background processing regardless of feature flags', async () => {
      // Feature flags are checked in background processor, not webhook controller
      mockReq = { body: mockBrevoClickPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Webhook should always queue background processing
      expect(processLeadAsync).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('handleBrevoWebhook - payload handling', () => {
    it('should handle payload without event field (defaults to click)', async () => {
      const payloadWithoutEvent = { ...mockBrevoClickPayload };
      delete (payloadWithoutEvent as Record<string, unknown>).event;

      mockReq = { body: payloadWithoutEvent };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Should still process as click event and queue background processing
      expect(processLeadAsync).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should pass payload to background processor', async () => {
      mockReq = { body: mockBrevoClickPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Background processor should receive normalized payload and correlationId
      expect(processLeadAsync).toHaveBeenCalled();
      const callArgs = vi.mocked(processLeadAsync).mock.calls[0];

      // Check first argument is normalized payload with required fields
      expect(callArgs[0]).toHaveProperty('email', mockBrevoClickPayload.email);
      expect(callArgs[0]).toHaveProperty('company', 'SCG'); // Normalized from COMPANY
      expect(callArgs[0]).toHaveProperty('campaignId');
      expect(callArgs[0]).toHaveProperty('firstname');
      expect(callArgs[0]).toHaveProperty('lastname');

      // Check second argument is correlationId (UUID string)
      expect(callArgs[1]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('handleBrevoWebhook - metrics', () => {
    it('should increment leadsProcessed counter on success', async () => {
      mockReq = { body: mockBrevoClickPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      // Lead should be queued for background processing
      expect(processLeadAsync).toHaveBeenCalled();
    });

    it('should increment duplicateLeadsTotal when duplicate detected', async () => {
      const { DuplicateLeadError } = await import('../../types/index.js');
      vi.mocked(checkOrThrow).mockRejectedValue(
        new DuplicateLeadError('test@example.com', '12345')
      );

      mockReq = { body: mockBrevoClickPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Duplicate lead - already processed',
        })
      );
    });
  });

  describe('testWebhook', () => {
    it('should return 403 in production mode', async () => {
      // Mock production config
      vi.doMock('../../config/index.js', () => ({
        config: {
          features: {
            aiEnrichment: true,
            deduplication: true,
            lineNotifications: true,
          },
          isProd: true,
        },
      }));

      vi.resetModules();
      const { testWebhook: prodTestWebhook } = await import('../../controllers/webhook.controller.js');

      const prodMockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      mockReq = { body: {} };

      await prodTestWebhook(mockReq as Request, prodMockRes as unknown as Response);

      expect(prodMockRes.status).toHaveBeenCalledWith(403);
      expect(prodMockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Test endpoint disabled in production',
        })
      );
    });

    it('should return mock payload in development mode', async () => {
      // Reset to dev config
      vi.doMock('../../config/index.js', () => ({
        config: {
          features: {
            aiEnrichment: true,
            deduplication: true,
            lineNotifications: true,
          },
          isProd: false,
        },
      }));

      vi.resetModules();
      const { testWebhook: devTestWebhook } = await import('../../controllers/webhook.controller.js');

      const devMockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      mockReq = { body: {} };

      await devTestWebhook(mockReq as Request, devMockRes as unknown as Response);

      expect(devMockRes.status).toHaveBeenCalledWith(200);
      expect(devMockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Test webhook processed',
          mockPayload: expect.objectContaining({
            event: 'click',
            email: 'test@example.com',
          }),
        })
      );
    });

    it('should inject mock payload into request body', async () => {
      // Reset to dev config
      vi.doMock('../../config/index.js', () => ({
        config: {
          features: {
            aiEnrichment: true,
            deduplication: true,
            lineNotifications: true,
          },
          isProd: false,
        },
      }));

      vi.resetModules();
      const { testWebhook: devTestWebhook } = await import('../../controllers/webhook.controller.js');

      const devMockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      mockReq = { body: {} };

      await devTestWebhook(mockReq as Request, devMockRes as unknown as Response);

      expect(mockReq.body).toEqual(
        expect.objectContaining({
          event: 'click',
          email: 'test@example.com',
          firstname: 'Test',
          lastname: 'User',
        })
      );
    });
  });
});
