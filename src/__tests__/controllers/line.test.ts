/**
 * LINE Controller Tests (Scenario B)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  mockPostbackEvent,
  mockLineWebhookBody,
  mockLineProfile,
} from '../mocks/line.mock.js';
import { mockLeadRow, mockClaimedLeadRow } from '../mocks/google-sheets.mock.js';

// Mock all services
vi.mock('../../services/sheets.service.js', () => ({
  sheetsService: {
    claimLead: vi.fn(),
    getRow: vi.fn(),
    updateLeadStatus: vi.fn(),
  },
}));

vi.mock('../../services/line.service.js', () => ({
  lineService: {
    replySuccess: vi.fn().mockResolvedValue(undefined),
    replyClaimed: vi.fn().mockResolvedValue(undefined),
    replyStatusUpdate: vi.fn().mockResolvedValue(undefined),
    replyError: vi.fn().mockResolvedValue(undefined),
    getUserProfile: vi.fn(),
    getGroupMemberProfile: vi.fn(),
    verifySignature: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('../../config/index.js', () => ({
  config: {
    isDev: true,
    dev: {
      skipLineSignatureVerification: true,
    },
  },
}));

vi.mock('../../utils/logger.js', () => ({
  lineLogger: {
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
  addFailedLinePostback: vi.fn().mockReturnValue('dlq-123'),
  deadLetterQueue: {
    add: vi.fn().mockReturnValue('dlq-123'),
    getStats: vi.fn().mockReturnValue({ totalEvents: 0, byType: {} }),
  },
}));

describe('LINE Controller', () => {
  let handleLineWebhook: typeof import('../../controllers/line.controller.js').handleLineWebhook;
  let verifyLineSignature: typeof import('../../controllers/line.controller.js').verifyLineSignature;
  let sheetsService: typeof import('../../services/sheets.service.js').sheetsService;
  let lineService: typeof import('../../services/line.service.js').lineService;

  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import modules
    const lineController = await import('../../controllers/line.controller.js');
    const sheetsModule = await import('../../services/sheets.service.js');
    const lineModule = await import('../../services/line.service.js');

    handleLineWebhook = lineController.handleLineWebhook;
    verifyLineSignature = lineController.verifyLineSignature;
    sheetsService = sheetsModule.sheetsService;
    lineService = lineModule.lineService;

    // Setup default mocks
    vi.mocked(lineService.getGroupMemberProfile).mockResolvedValue(mockLineProfile);
    vi.mocked(lineService.getUserProfile).mockResolvedValue(mockLineProfile);
    vi.mocked(sheetsService.claimLead).mockResolvedValue({
      success: true,
      lead: mockLeadRow,
      alreadyClaimed: false,
    });

    // Setup request/response mocks
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('handleLineWebhook', () => {
    it('should respond immediately with 200', async () => {
      mockReq = { body: mockLineWebhookBody };

      await handleLineWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it('should return 200 even for invalid payload', async () => {
      mockReq = { body: { invalid: true } };

      await handleLineWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should handle empty events array', async () => {
      mockReq = { body: { destination: 'U123', events: [] } };

      await handleLineWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(lineService.replySuccess).not.toHaveBeenCalled();
    });
  });

  describe('verifyLineSignature', () => {
    it('should pass through in development mode', () => {
      mockReq = {
        get: vi.fn().mockReturnValue('mock-signature'),
        body: mockLineWebhookBody,
      };

      verifyLineSignature(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('postback event processing', () => {
    it('should claim lead successfully', async () => {
      mockReq = { body: mockLineWebhookBody };

      await handleLineWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(lineService.getGroupMemberProfile).toHaveBeenCalledWith(
        'G987654321',
        'U123456789'
      );
      expect(sheetsService.claimLead).toHaveBeenCalledWith(
        42,
        'U123456789',
        'วิภา รักงาน',
        'contacted'
      );
    });

    it('should handle already claimed lead', async () => {
      vi.mocked(sheetsService.claimLead).mockResolvedValue({
        success: false,
        lead: mockClaimedLeadRow,
        alreadyClaimed: true,
        owner: 'คนอื่น',
      });

      mockReq = { body: mockLineWebhookBody };

      await handleLineWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(lineService.replyClaimed).toHaveBeenCalled();
    });

    it('should ignore non-postback events', async () => {
      const messageEvent = {
        ...mockPostbackEvent,
        type: 'message',
        postback: undefined,
        message: {
          type: 'text',
          id: '123',
          text: 'Hello',
        },
      };

      mockReq = {
        body: {
          destination: 'U123',
          events: [messageEvent],
        },
      };

      await handleLineWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(sheetsService.claimLead).not.toHaveBeenCalled();
    });

    it('should handle profile fetch error gracefully', async () => {
      vi.mocked(lineService.getGroupMemberProfile).mockRejectedValue(
        new Error('Profile error')
      );

      mockReq = { body: mockLineWebhookBody };

      await handleLineWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still try to claim with partial userId
      expect(sheetsService.claimLead).toHaveBeenCalled();
    });
  });
});
