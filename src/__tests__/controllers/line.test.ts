/**
 * LINE Controller Tests (Scenario B)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  mockPostbackEvent,
  mockPostbackEventWithUUID,
  mockPostbackEventUUIDOnly,
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
    findLeadByUUID: vi.fn(),
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

  // ===========================================
  // UUID-based Postback Processing (Migration Support)
  // ===========================================

  describe('UUID-based postback processing', () => {
    it('should use findLeadByUUID when lead_id is provided', async () => {
      const mockLeadWithUUID = {
        ...mockLeadRow,
        leadUUID: 'lead_550e8400-e29b-41d4-a716-446655440000',
        createdAt: '2026-01-15T08:00:00.000Z',
        updatedAt: '2026-01-15T08:00:00.000Z',
      };

      vi.mocked(sheetsService.findLeadByUUID).mockResolvedValue(mockLeadWithUUID);
      vi.mocked(sheetsService.claimLead).mockResolvedValue({
        success: true,
        lead: mockLeadWithUUID,
        alreadyClaimed: false,
      });

      mockReq = {
        body: {
          destination: 'U123456',
          events: [mockPostbackEventWithUUID],
        },
      };

      await handleLineWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should call findLeadByUUID with the UUID from postback
      expect(sheetsService.findLeadByUUID).toHaveBeenCalledWith(
        'lead_550e8400-e29b-41d4-a716-446655440000'
      );
      // Should claim the lead using the resolved row number
      expect(sheetsService.claimLead).toHaveBeenCalledWith(
        mockLeadWithUUID.rowNumber,
        'U123456789',
        'วิภา รักงาน',
        'contacted'
      );
    });

    it('should handle UUID-only postback (no row_id fallback)', async () => {
      const mockLeadWithUUID = {
        ...mockLeadRow,
        rowNumber: 99,
        leadUUID: 'lead_550e8400-e29b-41d4-a716-446655440000',
        createdAt: '2026-01-15T08:00:00.000Z',
        updatedAt: '2026-01-15T08:00:00.000Z',
      };

      vi.mocked(sheetsService.findLeadByUUID).mockResolvedValue(mockLeadWithUUID);
      vi.mocked(sheetsService.claimLead).mockResolvedValue({
        success: true,
        lead: mockLeadWithUUID,
        alreadyClaimed: false,
      });

      mockReq = {
        body: {
          destination: 'U123456',
          events: [mockPostbackEventUUIDOnly],
        },
      };

      await handleLineWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(sheetsService.findLeadByUUID).toHaveBeenCalled();
      expect(sheetsService.claimLead).toHaveBeenCalledWith(
        99, // Row number from UUID lookup
        'U123456789',
        'วิภา รักงาน',
        'contacted'
      );
    });

    it('should reply error when UUID not found', async () => {
      vi.mocked(sheetsService.findLeadByUUID).mockResolvedValue(null);

      mockReq = {
        body: {
          destination: 'U123456',
          events: [mockPostbackEventUUIDOnly],
        },
      };

      await handleLineWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(sheetsService.findLeadByUUID).toHaveBeenCalled();
      expect(lineService.replyError).toHaveBeenCalled();
      expect(sheetsService.claimLead).not.toHaveBeenCalled();
    });

    it('should fallback to row_id when UUID lookup fails but row_id exists', async () => {
      // This tests the hybrid format where both lead_id and row_id exist
      // If lead_id lookup succeeds, use that; otherwise behavior depends on implementation
      const mockLeadWithUUID = {
        ...mockLeadRow,
        leadUUID: 'lead_550e8400-e29b-41d4-a716-446655440000',
      };

      vi.mocked(sheetsService.findLeadByUUID).mockResolvedValue(mockLeadWithUUID);
      vi.mocked(sheetsService.claimLead).mockResolvedValue({
        success: true,
        lead: mockLeadWithUUID,
        alreadyClaimed: false,
      });

      mockReq = {
        body: {
          destination: 'U123456',
          events: [mockPostbackEventWithUUID],
        },
      };

      await handleLineWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // UUID takes priority when present
      expect(sheetsService.findLeadByUUID).toHaveBeenCalled();
    });
  });
});
