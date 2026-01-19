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
import { mockLeadRow } from '../mocks/google-sheets.mock.js';

// Mock all services
vi.mock('../../services/sheets.service.js', () => ({
  sheetsService: {
    addLead: vi.fn().mockResolvedValue(42),
  },
}));

vi.mock('../../services/gemini.service.js', () => ({
  geminiService: {
    analyzeCompany: vi.fn(),
  },
}));

vi.mock('../../services/line.service.js', () => ({
  lineService: {
    pushLeadNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/deduplication.service.js', () => ({
  deduplicationService: {
    checkOrThrow: vi.fn(),
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
  let sheetsService: typeof import('../../services/sheets.service.js').sheetsService;
  let geminiService: typeof import('../../services/gemini.service.js').geminiService;
  let lineService: typeof import('../../services/line.service.js').lineService;
  let deduplicationService: typeof import('../../services/deduplication.service.js').deduplicationService;

  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import modules
    const webhookController = await import('../../controllers/webhook.controller.js');
    const sheetsModule = await import('../../services/sheets.service.js');
    const geminiModule = await import('../../services/gemini.service.js');
    const lineModule = await import('../../services/line.service.js');
    const dedupModule = await import('../../services/deduplication.service.js');

    handleBrevoWebhook = webhookController.handleBrevoWebhook;
    verifyWebhook = webhookController.verifyWebhook;
    sheetsService = sheetsModule.sheetsService;
    geminiService = geminiModule.geminiService;
    lineService = lineModule.lineService;
    deduplicationService = dedupModule.deduplicationService;

    // Setup mocks
    vi.mocked(geminiService.analyzeCompany).mockResolvedValue(mockCompanyAnalysis);
    vi.mocked(deduplicationService.checkOrThrow).mockResolvedValue(undefined);

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

      expect(deduplicationService.checkOrThrow).toHaveBeenCalled();
      expect(geminiService.analyzeCompany).toHaveBeenCalled();
      expect(sheetsService.addLead).toHaveBeenCalled();
      expect(lineService.pushLeadNotification).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Lead processed successfully',
        })
      );
    });

    it('should ignore non-click events', async () => {
      mockReq = { body: mockBrevoOpenPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(deduplicationService.checkOrThrow).not.toHaveBeenCalled();
      expect(sheetsService.addLead).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('acknowledged but not processed'),
        })
      );
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
      vi.mocked(deduplicationService.checkOrThrow).mockRejectedValue(
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

    it('should continue processing even if AI fails', async () => {
      vi.mocked(geminiService.analyzeCompany).mockRejectedValue(new Error('AI error'));

      mockReq = { body: mockBrevoClickPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Should still add lead and send notification
      expect(sheetsService.addLead).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should continue processing even if LINE notification fails', async () => {
      vi.mocked(lineService.pushLeadNotification).mockRejectedValue(
        new Error('LINE error')
      );

      mockReq = { body: mockBrevoClickPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
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
    it('should add to DLQ when sheets service throws error', async () => {
      const { addFailedBrevoWebhook } = await import('../../services/dead-letter-queue.service.js');
      vi.mocked(sheetsService.addLead).mockRejectedValueOnce(new Error('Sheets API error'));

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

    it('should re-throw non-DuplicateLeadError from deduplication', async () => {
      const genericError = new Error('Database connection failed');
      vi.mocked(deduplicationService.checkOrThrow).mockRejectedValue(genericError);

      mockReq = { body: mockBrevoClickPayload, requestId: 'req-456' };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(genericError);
    });
  });

  describe('handleBrevoWebhook - feature flags', () => {
    it('should skip AI enrichment when disabled', async () => {
      // Reset module to change config
      vi.doMock('../../config/index.js', () => ({
        config: {
          features: {
            aiEnrichment: false,
            deduplication: true,
            lineNotifications: true,
          },
          isProd: false,
        },
      }));

      // Re-import controller with new config
      vi.resetModules();
      const { handleBrevoWebhook: handler } = await import('../../controllers/webhook.controller.js');
      const geminiModule = await import('../../services/gemini.service.js');

      mockReq = { body: mockBrevoClickPayload };

      await handler(mockReq as Request, mockRes as Response, mockNext);

      // AI should not be called when disabled
      expect(geminiModule.geminiService.analyzeCompany).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Restore original mock
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
    });

    it('should skip LINE notification when disabled', async () => {
      // Reset module to change config
      vi.doMock('../../config/index.js', () => ({
        config: {
          features: {
            aiEnrichment: true,
            deduplication: true,
            lineNotifications: false,
          },
          isProd: false,
        },
      }));

      // Re-import controller with new config
      vi.resetModules();
      const { handleBrevoWebhook: handler } = await import('../../controllers/webhook.controller.js');
      const lineModule = await import('../../services/line.service.js');

      mockReq = { body: mockBrevoClickPayload };

      await handler(mockReq as Request, mockRes as Response, mockNext);

      // LINE should not be called when disabled
      expect(lineModule.lineService.pushLeadNotification).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);

      // Restore original mock
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

      // Should still process as click event
      expect(sheetsService.addLead).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should use Brevo website if provided over AI guess', async () => {
      const payloadWithWebsite = {
        ...mockBrevoClickPayload,
        website: 'https://brevo-provided.com',
      };

      mockReq = { body: payloadWithWebsite };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sheetsService.addLead).toHaveBeenCalledWith(
        expect.objectContaining({
          website: 'https://brevo-provided.com',
        })
      );
    });

    it('should format phone number correctly', async () => {
      const payloadWithPhone = {
        ...mockBrevoClickPayload,
        phone: '081-234-5678',
      };

      mockReq = { body: payloadWithPhone };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sheetsService.addLead).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: expect.any(String),
        })
      );
    });

    it('should include new Brevo contact attributes', async () => {
      const payloadWithAttributes = {
        ...mockBrevoClickPayload,
        LEAD_SOURCE: 'Facebook Ads',
        JOB_TITLE: 'CEO',
        CITY: 'Bangkok',
      };

      mockReq = { body: payloadWithAttributes };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sheetsService.addLead).toHaveBeenCalledWith(
        expect.objectContaining({
          leadSource: expect.any(String),
        })
      );
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalPayload = {
        event: 'click',
        email: 'minimal@test.com',
        campaign_id: 123,
        campaign_name: 'Test',
        'message-id': 'msg-123',
        date: '2026-01-19',
      };

      mockReq = { body: minimalPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sheetsService.addLead).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'minimal@test.com',
          customerName: expect.any(String),
          company: expect.any(String),
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
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
      // Lead should be processed successfully
      expect(sheetsService.addLead).toHaveBeenCalled();
    });

    it('should increment duplicateLeadsTotal when duplicate detected', async () => {
      const { DuplicateLeadError } = await import('../../types/index.js');
      vi.mocked(deduplicationService.checkOrThrow).mockRejectedValue(
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

    it('should track AI analysis duration and status', async () => {
      mockReq = { body: mockBrevoClickPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(geminiService.analyzeCompany).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('handleBrevoWebhook - lead creation', () => {
    it('should create lead with correct structure', async () => {
      mockReq = { body: mockBrevoClickPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sheetsService.addLead).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockBrevoClickPayload.email,
          status: 'new',
          source: 'Brevo',
        })
      );
    });

    it('should use default customer name when not provided', async () => {
      const payloadNoName = {
        ...mockBrevoClickPayload,
        firstname: undefined,
        lastname: undefined,
      };
      delete (payloadNoName as Record<string, unknown>).firstname;
      delete (payloadNoName as Record<string, unknown>).lastname;

      mockReq = { body: payloadNoName };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sheetsService.addLead).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: expect.any(String),
        })
      );
    });

    it('should use default company when not provided', async () => {
      const payloadNoCompany = { ...mockBrevoClickPayload };
      delete (payloadNoCompany as Record<string, unknown>).company;

      mockReq = { body: payloadNoCompany };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sheetsService.addLead).toHaveBeenCalledWith(
        expect.objectContaining({
          company: expect.any(String),
        })
      );
    });

    it('should return lead data in response', async () => {
      vi.mocked(sheetsService.addLead).mockResolvedValueOnce(42);
      mockReq = { body: mockBrevoClickPayload };

      await handleBrevoWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rowNumber: 42,
            email: mockBrevoClickPayload.email,
            industry: mockCompanyAnalysis.industry,
          }),
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
