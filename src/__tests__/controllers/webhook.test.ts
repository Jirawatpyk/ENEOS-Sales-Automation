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
  });
});
