/**
 * LINE Controller Tests (Scenario B)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  mockPostbackEventWithUUID,
  mockPostbackEventUUIDOnly,
  mockPostbackEvent,
  mockLineWebhookBody,
  mockLineProfile,
} from '../mocks/line.mock.js';
import { mockLeadRow, mockClaimedLeadRow } from '../mocks/leads.mock.js';

// Mock leads service (replaces sheetsService for lead operations)
vi.mock('../../services/leads.service.js', () => ({
  getLeadById: vi.fn(),
  claimLead: vi.fn(),
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

vi.mock('../../services/sales-team.service.js', () => ({
  ensureSalesTeamMember: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/dead-letter-queue.service.js', () => ({
  addFailedLinePostback: vi.fn().mockReturnValue('dlq-123'),
  deadLetterQueue: {
    add: vi.fn().mockReturnValue('dlq-123'),
    getStats: vi.fn().mockReturnValue({ totalEvents: 0, byType: {} }),
  },
}));

// Webhook body using UUID-based postback (legacy row_id not supported after Supabase migration)
const mockLineWebhookBodyUUID = {
  destination: 'U123456',
  events: [mockPostbackEventUUIDOnly],
};

describe('LINE Controller', () => {
  let handleLineWebhook: typeof import('../../controllers/line.controller.js').handleLineWebhook;
  let verifyLineSignature: typeof import('../../controllers/line.controller.js').verifyLineSignature;
  let leadsService: typeof import('../../services/leads.service.js');
  let lineService: typeof import('../../services/line.service.js').lineService;

  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import modules
    const lineController = await import('../../controllers/line.controller.js');
    const leadsModule = await import('../../services/leads.service.js');
    const lineModule = await import('../../services/line.service.js');

    handleLineWebhook = lineController.handleLineWebhook;
    verifyLineSignature = lineController.verifyLineSignature;
    leadsService = leadsModule;
    lineService = lineModule.lineService;

    // Setup default mocks
    vi.mocked(lineService.getGroupMemberProfile).mockResolvedValue(mockLineProfile);
    vi.mocked(lineService.getUserProfile).mockResolvedValue(mockLineProfile);
    vi.mocked(leadsService.getLeadById).mockResolvedValue({
      id: 'lead_550e8400-e29b-41d4-a716-446655440000',
      customer_name: mockLeadRow.customerName,
      email: mockLeadRow.email,
      phone: mockLeadRow.phone,
      company: mockLeadRow.company,
      status: 'new',
      version: 1,
      created_at: '2026-01-15T08:00:00.000Z',
      updated_at: '2026-01-15T08:00:00.000Z',
    } as any);
    vi.mocked(leadsService.claimLead).mockResolvedValue({
      success: true,
      lead: mockLeadRow,
      alreadyClaimed: false,
      isNewClaim: true,
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
    it('should claim lead successfully via UUID', async () => {
      mockReq = { body: mockLineWebhookBodyUUID };

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
      expect(leadsService.claimLead).toHaveBeenCalledWith(
        'lead_550e8400-e29b-41d4-a716-446655440000',
        'U123456789',
        'วิภา รักงาน',
        'contacted'
      );
    });

    it('should handle already claimed lead', async () => {
      vi.mocked(leadsService.claimLead).mockResolvedValue({
        success: false,
        lead: mockClaimedLeadRow,
        alreadyClaimed: true,
        isNewClaim: false,
        owner: 'คนอื่น',
      });

      mockReq = { body: mockLineWebhookBodyUUID };

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

      expect(leadsService.claimLead).not.toHaveBeenCalled();
    });

    it('should handle profile fetch error gracefully', async () => {
      vi.mocked(lineService.getGroupMemberProfile).mockRejectedValue(
        new Error('Profile error')
      );

      mockReq = { body: mockLineWebhookBodyUUID };

      await handleLineWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still try to claim with partial userId
      expect(leadsService.claimLead).toHaveBeenCalled();
    });

    it('should reply error for legacy row_id-only postback', async () => {
      // Legacy mockLineWebhookBody uses row_id=42 only (no lead_id)
      mockReq = { body: mockLineWebhookBody };

      await handleLineWebhook(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Legacy row_id not supported in Supabase — should reply error
      expect(lineService.replyError).toHaveBeenCalled();
      expect(leadsService.claimLead).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // UUID-based Postback Processing
  // ===========================================

  describe('UUID-based postback processing', () => {
    it('should use getLeadById when lead_id is provided', async () => {
      vi.mocked(leadsService.claimLead).mockResolvedValue({
        success: true,
        lead: {
          ...mockLeadRow,
          leadUUID: 'lead_550e8400-e29b-41d4-a716-446655440000',
          createdAt: '2026-01-15T08:00:00.000Z',
          updatedAt: '2026-01-15T08:00:00.000Z',
        },
        alreadyClaimed: false,
        isNewClaim: true,
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

      // Should call getLeadById with the UUID from postback
      expect(leadsService.getLeadById).toHaveBeenCalledWith(
        'lead_550e8400-e29b-41d4-a716-446655440000'
      );
      // Should claim the lead using the UUID
      expect(leadsService.claimLead).toHaveBeenCalledWith(
        'lead_550e8400-e29b-41d4-a716-446655440000',
        'U123456789',
        'วิภา รักงาน',
        'contacted'
      );
    });

    it('should handle UUID-only postback (no row_id fallback)', async () => {
      vi.mocked(leadsService.claimLead).mockResolvedValue({
        success: true,
        lead: {
          ...mockLeadRow,
          rowNumber: 99,
          leadUUID: 'lead_550e8400-e29b-41d4-a716-446655440000',
          createdAt: '2026-01-15T08:00:00.000Z',
          updatedAt: '2026-01-15T08:00:00.000Z',
        },
        alreadyClaimed: false,
        isNewClaim: true,
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

      expect(leadsService.getLeadById).toHaveBeenCalled();
      expect(leadsService.claimLead).toHaveBeenCalledWith(
        'lead_550e8400-e29b-41d4-a716-446655440000',
        'U123456789',
        'วิภา รักงาน',
        'contacted'
      );
    });

    it('should reply error when UUID not found', async () => {
      vi.mocked(leadsService.getLeadById).mockResolvedValue(null);

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

      expect(leadsService.getLeadById).toHaveBeenCalled();
      expect(lineService.replyError).toHaveBeenCalled();
      expect(leadsService.claimLead).not.toHaveBeenCalled();
    });

    it('should use UUID when both lead_id and row_id present', async () => {
      vi.mocked(leadsService.claimLead).mockResolvedValue({
        success: true,
        lead: {
          ...mockLeadRow,
          leadUUID: 'lead_550e8400-e29b-41d4-a716-446655440000',
        },
        alreadyClaimed: false,
        isNewClaim: true,
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
      expect(leadsService.getLeadById).toHaveBeenCalled();
    });
  });
});
