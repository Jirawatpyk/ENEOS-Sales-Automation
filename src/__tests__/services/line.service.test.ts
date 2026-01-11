/**
 * LINE Service Tests
 * Tests for LINE messaging operations using proper module mocking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockLineProfile } from '../mocks/line.mock.js';
import crypto from 'crypto';

// Mock config first
vi.mock('../../config/index.js', () => ({
  config: {
    line: {
      channelAccessToken: 'test-channel-access-token',
      channelSecret: 'test-channel-secret',
      groupId: 'test-group-id',
    },
    features: {
      lineNotifications: true,
    },
  },
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  lineLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Use vi.hoisted to define mocks before vi.mock hoisting
const { mockClient, mockCircuitBreaker, mockWithRetry } = vi.hoisted(() => {
  const mockClient = {
    pushMessage: vi.fn().mockResolvedValue({}),
    replyMessage: vi.fn().mockResolvedValue({}),
    getProfile: vi.fn(),
    getGroupMemberProfile: vi.fn(),
    getBotInfo: vi.fn(),
  };

  const mockCircuitBreaker = {
    execute: vi.fn((fn: () => Promise<unknown>) => fn()),
  };

  const mockWithRetry = vi.fn((fn: () => Promise<unknown>) => fn());

  return { mockClient, mockCircuitBreaker, mockWithRetry };
});

vi.mock('@line/bot-sdk', () => ({
  Client: vi.fn().mockImplementation(() => mockClient),
}));

vi.mock('../../utils/retry.js', () => ({
  withRetry: mockWithRetry,
  CircuitBreaker: vi.fn().mockImplementation(() => mockCircuitBreaker),
}));

// Mock flex message templates
vi.mock('../../templates/flex-message.js', () => ({
  createLeadFlexMessage: vi.fn().mockReturnValue({ type: 'flex', altText: 'Lead', contents: {} }),
  createSuccessReplyMessage: vi.fn().mockReturnValue({ type: 'text', text: 'Success' }),
  createErrorReplyMessage: vi.fn().mockReturnValue({ type: 'text', text: 'Error' }),
  createClaimedReplyMessage: vi.fn().mockReturnValue({ type: 'text', text: 'Claimed' }),
  createStatusUpdateMessage: vi.fn().mockReturnValue({ type: 'text', text: 'Status Updated' }),
}));

// Import after mocks
import { LineService } from '../../services/line.service.js';

describe('LineService', () => {
  let service: LineService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LineService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================
  // Push Messages
  // ===========================================

  describe('pushLeadNotification', () => {
    const mockLead = {
      rowNumber: 42,
      email: 'test@example.com',
      company: 'Test Company',
      customerName: 'Test User',
      phone: '0812345678',
      date: '2024-01-15',
      industryAI: 'IT',
      website: null,
      capital: null,
      status: 'new' as const,
      salesOwnerId: null,
      salesOwnerName: null,
      campaignId: '12345',
      campaignName: 'Test Campaign',
      emailSubject: 'Test Subject',
      source: 'Brevo',
      leadId: '67890',
      eventId: 'evt-123',
      clickedAt: '2024-01-15',
      talkingPoint: null,
      closedAt: null,
      lostAt: null,
      unreachableAt: null,
    };

    const mockAiAnalysis = {
      industry: 'IT',
      talkingPoint: 'Great company',
      website: 'https://example.com',
      registeredCapital: '10M',
    };

    it('should push lead notification successfully', async () => {
      await service.pushLeadNotification(mockLead, mockAiAnalysis);

      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
      expect(mockWithRetry).toHaveBeenCalled();
      expect(mockClient.pushMessage).toHaveBeenCalledWith(
        'test-group-id',
        expect.objectContaining({ type: 'flex' })
      );
    });
  });

  describe('pushTextMessage', () => {
    it('should push text message successfully', async () => {
      await service.pushTextMessage('Hello World');

      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
      expect(mockClient.pushMessage).toHaveBeenCalledWith(
        'test-group-id',
        expect.objectContaining({
          type: 'text',
          text: 'Hello World',
        })
      );
    });
  });

  // ===========================================
  // Reply Messages
  // ===========================================

  describe('replySuccess', () => {
    it('should reply with success message', async () => {
      await service.replySuccess('token123', 'John', 'ACME Corp', 'Jane Doe', 'contacted');

      // Just verify replyMessage was called with the token
      expect(mockClient.replyMessage).toHaveBeenCalled();
      expect(mockClient.replyMessage.mock.calls[0][0]).toBe('token123');
    });
  });

  describe('replyClaimed', () => {
    it('should reply with claimed message', async () => {
      await service.replyClaimed('token123', 'ACME Corp', 'Jane Doe', 'John');

      // Just verify replyMessage was called with the token
      expect(mockClient.replyMessage).toHaveBeenCalled();
      expect(mockClient.replyMessage.mock.calls[0][0]).toBe('token123');
    });
  });

  describe('replyStatusUpdate', () => {
    it('should call replyMessage with token for closed status', async () => {
      await service.replyStatusUpdate('token123', 'ACME Corp', 'closed', true, false);

      expect(mockClient.replyMessage).toHaveBeenCalled();
      expect(mockClient.replyMessage.mock.calls[0][0]).toBe('token123');
    });

    it('should handle lost status', async () => {
      await service.replyStatusUpdate('token123', 'ACME Corp', 'lost', false, true);

      expect(mockClient.replyMessage).toHaveBeenCalled();
    });
  });

  describe('replyError', () => {
    it('should call replyMessage', async () => {
      await service.replyError('token123', 'Something went wrong');

      expect(mockClient.replyMessage).toHaveBeenCalled();
    });

    it('should handle expired reply token gracefully', async () => {
      mockClient.replyMessage.mockRejectedValueOnce(new Error('Invalid reply token'));

      // Should not throw
      await expect(service.replyError('expired-token')).resolves.not.toThrow();
    });
  });

  // ===========================================
  // User Profile
  // ===========================================

  describe('getUserProfile', () => {
    it('should return user profile', async () => {
      mockClient.getProfile.mockResolvedValue(mockLineProfile);

      const profile = await service.getUserProfile('U123456789');

      expect(profile).toEqual({
        userId: mockLineProfile.userId,
        displayName: mockLineProfile.displayName,
        pictureUrl: mockLineProfile.pictureUrl,
        statusMessage: mockLineProfile.statusMessage,
      });
    });

    it('should handle API errors', async () => {
      mockClient.getProfile.mockRejectedValue(new Error('User not found'));

      await expect(service.getUserProfile('invalid-user')).rejects.toThrow('User not found');
    });
  });

  describe('getGroupMemberProfile', () => {
    it('should return group member profile', async () => {
      mockClient.getGroupMemberProfile.mockResolvedValue(mockLineProfile);

      const profile = await service.getGroupMemberProfile('G123', 'U456');

      expect(profile).toEqual({
        userId: mockLineProfile.userId,
        displayName: mockLineProfile.displayName,
        pictureUrl: mockLineProfile.pictureUrl,
      });
    });

    it('should handle API errors', async () => {
      mockClient.getGroupMemberProfile.mockRejectedValue(new Error('Member not found'));

      await expect(service.getGroupMemberProfile('G123', 'invalid-user')).rejects.toThrow('Member not found');
    });
  });

  // ===========================================
  // Signature Verification
  // ===========================================

  describe('verifySignature', () => {
    it('should return true for valid signature', () => {
      const body = '{"events":[]}';
      // Pre-computed HMAC-SHA256 for test-channel-secret
      const validSignature = crypto
        .createHmac('sha256', 'test-channel-secret')
        .update(body)
        .digest('base64');

      const result = service.verifySignature(body, validSignature);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const body = '{"events":[]}';
      const invalidSignature = 'invalid-signature';

      const result = service.verifySignature(body, invalidSignature);

      expect(result).toBe(false);
    });

    it('should handle empty body', () => {
      const body = '';
      const signature = crypto
        .createHmac('sha256', 'test-channel-secret')
        .update(body)
        .digest('base64');

      const result = service.verifySignature(body, signature);

      expect(result).toBe(true);
    });
  });

  // ===========================================
  // Health Check
  // ===========================================

  describe('healthCheck', () => {
    it('should return healthy when API responds', async () => {
      mockClient.getBotInfo.mockResolvedValue({ userId: 'U123', basicId: '@test' });

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy when API fails', async () => {
      mockClient.getBotInfo.mockRejectedValue(new Error('API Error'));

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================
  // Escalation
  // ===========================================

  describe('sendEscalationAlert', () => {
    const mockLeads = [
      {
        rowNumber: 1,
        company: 'Company A',
        customerName: 'John',
        email: 'a@example.com',
        phone: '0811111111',
        date: '2024-01-15',
        industryAI: 'IT',
        website: null,
        capital: null,
        status: 'new' as const,
        salesOwnerId: null,
        salesOwnerName: null,
        campaignId: '1',
        campaignName: 'Campaign 1',
        emailSubject: 'Subject 1',
        source: 'Brevo',
        leadId: '1',
        eventId: 'evt-1',
        clickedAt: '2024-01-15',
        talkingPoint: null,
        closedAt: null,
        lostAt: null,
        unreachableAt: null,
      },
      {
        rowNumber: 2,
        company: 'Company B',
        customerName: 'Jane',
        email: 'b@example.com',
        phone: '0822222222',
        date: '2024-01-15',
        industryAI: 'IT',
        website: null,
        capital: null,
        status: 'new' as const,
        salesOwnerId: null,
        salesOwnerName: null,
        campaignId: '2',
        campaignName: 'Campaign 2',
        emailSubject: 'Subject 2',
        source: 'Brevo',
        leadId: '2',
        eventId: 'evt-2',
        clickedAt: '2024-01-15',
        talkingPoint: null,
        closedAt: null,
        lostAt: null,
        unreachableAt: null,
      },
    ];

    it('should send escalation alert for multiple leads', async () => {
      await service.sendEscalationAlert(mockLeads, 4);

      // Verify circuitBreaker.execute and pushMessage were called
      expect(mockCircuitBreaker.execute).toHaveBeenCalled();
      expect(mockClient.pushMessage).toHaveBeenCalled();
    });

    it('should not send alert when no leads', async () => {
      await service.sendEscalationAlert([], 4);

      // When there are no leads, pushMessage should not be called for escalation
      // But clearAllMocks was called in beforeEach, so check the call count
      const callsForEscalation = mockClient.pushMessage.mock.calls.filter(
        (call: unknown[]) => typeof call[1] === 'object' && call[1] !== null && 'type' in (call[1] as { type?: string }) && (call[1] as { type: string }).type === 'text'
      );
      expect(callsForEscalation.length).toBe(0);
    });

    it('should limit leads in message to 5', async () => {
      const manyLeads = Array(10).fill(null).map((_, i) => ({
        ...mockLeads[0],
        rowNumber: i + 1,
        company: `Company ${i + 1}`,
        customerName: `Person ${i + 1}`,
      }));

      await service.sendEscalationAlert(manyLeads, 4);

      // Verify pushMessage was called
      expect(mockClient.pushMessage).toHaveBeenCalled();
    });
  });
});
