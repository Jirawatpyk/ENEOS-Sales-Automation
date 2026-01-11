/**
 * LINE API Mocks
 */

import { vi } from 'vitest';

// Mock LINE user profile
export const mockLineProfile = {
  userId: 'U123456789',
  displayName: 'วิภา รักงาน',
  pictureUrl: 'https://profile.line.me/example',
  statusMessage: 'Working hard!',
};

// Mock LINE webhook event (postback)
export const mockPostbackEvent = {
  type: 'postback',
  replyToken: 'mock-reply-token-123',
  source: {
    type: 'group',
    userId: 'U123456789',
    groupId: 'G987654321',
  },
  timestamp: Date.now(),
  postback: {
    data: 'action=contacted&row_id=42',
  },
};

// Mock LINE webhook body
export const mockLineWebhookBody = {
  destination: 'U123456',
  events: [mockPostbackEvent],
};

// Create mock LINE service
export function createMockLineService() {
  return {
    pushLeadNotification: vi.fn().mockResolvedValue(undefined),
    pushTextMessage: vi.fn().mockResolvedValue(undefined),
    replySuccess: vi.fn().mockResolvedValue(undefined),
    replyClaimed: vi.fn().mockResolvedValue(undefined),
    replyStatusUpdate: vi.fn().mockResolvedValue(undefined),
    replyError: vi.fn().mockResolvedValue(undefined),
    getUserProfile: vi.fn().mockResolvedValue(mockLineProfile),
    getGroupMemberProfile: vi.fn().mockResolvedValue(mockLineProfile),
    verifySignature: vi.fn().mockReturnValue(true),
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, latency: 50 }),
    sendEscalationAlert: vi.fn().mockResolvedValue(undefined),
  };
}
