/**
 * LINE Routes Integration Tests
 * Tests for LINE webhook endpoints with signature verification
 *
 * @coverage P2 - Route integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import lineRoutes from '../../routes/line.routes.js';

// ===========================================
// Mock Services and Dependencies
// ===========================================

const mockVerifySignature = vi.fn();
const mockPushTextMessage = vi.fn();
const mockReplyError = vi.fn();
const mockReplySuccess = vi.fn();
const mockReplyClaimed = vi.fn();
const mockReplyStatusUpdate = vi.fn();
const mockGetUserProfile = vi.fn();
const mockGetGroupMemberProfile = vi.fn();
const mockClaimLead = vi.fn();
const mockFindLeadByUUID = vi.fn();
const mockGetRow = vi.fn();
const mockAddFailedLinePostback = vi.fn().mockReturnValue('dlq-456');
const mockValidateLineWebhook = vi.fn();
const mockParsePostbackData = vi.fn();
const mockIsPostbackEvent = vi.fn();

vi.mock('../../utils/logger.js', () => ({
  lineLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/line.service.js', () => ({
  lineService: {
    verifySignature: (...args: unknown[]) => mockVerifySignature(...args),
    pushTextMessage: (...args: unknown[]) => mockPushTextMessage(...args),
    replyError: (...args: unknown[]) => mockReplyError(...args),
    replySuccess: (...args: unknown[]) => mockReplySuccess(...args),
    replyClaimed: (...args: unknown[]) => mockReplyClaimed(...args),
    replyStatusUpdate: (...args: unknown[]) => mockReplyStatusUpdate(...args),
    getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
    getGroupMemberProfile: (...args: unknown[]) => mockGetGroupMemberProfile(...args),
  },
}));

vi.mock('../../services/sheets.service.js', () => ({
  sheetsService: {
    claimLead: (...args: unknown[]) => mockClaimLead(...args),
    findLeadByUUID: (...args: unknown[]) => mockFindLeadByUUID(...args),
    getRow: (...args: unknown[]) => mockGetRow(...args),
  },
}));

vi.mock('../../services/dead-letter-queue.service.js', () => ({
  addFailedLinePostback: (...args: unknown[]) => mockAddFailedLinePostback(...args),
}));

vi.mock('../../validators/line.validator.js', () => ({
  validateLineWebhook: (...args: unknown[]) => mockValidateLineWebhook(...args),
  parsePostbackData: (...args: unknown[]) => mockParsePostbackData(...args),
  isPostbackEvent: (...args: unknown[]) => mockIsPostbackEvent(...args),
}));

vi.mock('../../utils/metrics.js', () => ({
  leadsClaimedTotal: { inc: vi.fn() },
  raceConditionsTotal: { inc: vi.fn() },
  lineNotificationTotal: { inc: vi.fn() },
}));

// Mock config
let mockIsProd = false;
let mockSkipSignatureVerification = false;
vi.mock('../../config/index.js', () => ({
  config: {
    get isProd() {
      return mockIsProd;
    },
    get isDev() {
      return !mockIsProd;
    },
    dev: {
      get skipLineSignatureVerification() {
        return mockSkipSignatureVerification;
      },
    },
  },
}));

// ===========================================
// Test Setup
// ===========================================

describe('LINE Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsProd = false;
    mockSkipSignatureVerification = false;

    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use('/webhook/line', lineRoutes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // POST /webhook/line - Signature Verification
  // ===========================================

  describe('POST /webhook/line - Signature Verification', () => {
    it('[P2] should return 401 when x-line-signature header is missing', async () => {
      // WHEN: POST without signature header
      const response = await request(app)
        .post('/webhook/line')
        .send({ events: [] })
        .expect(401);

      // THEN: Returns missing signature error
      expect(response.body).toEqual({ error: 'Missing signature' });
      expect(mockValidateLineWebhook).not.toHaveBeenCalled();
    });

    it('[P2] should return 401 when signature is invalid', async () => {
      // GIVEN: Invalid signature
      mockVerifySignature.mockReturnValue(false);

      // WHEN: POST with invalid signature
      const response = await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'invalid-signature')
        .send({ events: [] })
        .expect(401);

      // THEN: Returns invalid signature error
      expect(response.body).toEqual({ error: 'Invalid signature' });
      expect(mockVerifySignature).toHaveBeenCalled();
    });

    it('[P2] should proceed when signature is valid', async () => {
      // GIVEN: Valid signature
      mockVerifySignature.mockReturnValue(true);
      mockValidateLineWebhook.mockReturnValue({
        success: true,
        data: { events: [] },
      });

      // WHEN: POST with valid signature
      const response = await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'valid-signature')
        .send({ events: [] })
        .expect(200);

      // THEN: Request is processed
      expect(response.body).toEqual({ success: true });
    });

    it('[P2] should skip verification when SKIP_LINE_SIGNATURE_VERIFICATION is true', async () => {
      // GIVEN: Signature verification disabled
      mockSkipSignatureVerification = true;
      mockValidateLineWebhook.mockReturnValue({
        success: true,
        data: { events: [] },
      });

      // WHEN: POST without signature header
      const response = await request(app)
        .post('/webhook/line')
        .send({ events: [] })
        .expect(200);

      // THEN: Request is processed without signature check
      expect(mockVerifySignature).not.toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  // ===========================================
  // POST /webhook/line - Payload Validation
  // ===========================================

  describe('POST /webhook/line - Payload Validation', () => {
    beforeEach(() => {
      mockVerifySignature.mockReturnValue(true);
    });

    it('[P2] should return 200 with success:false for invalid payload', async () => {
      // GIVEN: Invalid payload
      mockValidateLineWebhook.mockReturnValue({
        success: false,
        error: 'Invalid events array',
      });

      // WHEN: POST with invalid payload
      const response = await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'valid-signature')
        .send({ invalid: 'data' })
        .expect(200);

      // THEN: Returns 200 (LINE requires) but with error
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid events array',
      });
    });

    it('[P2] should handle empty events array', async () => {
      // GIVEN: Empty events array
      mockValidateLineWebhook.mockReturnValue({
        success: true,
        data: { events: [] },
      });

      // WHEN: POST with empty events
      const response = await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'valid-signature')
        .send({ events: [] })
        .expect(200);

      // THEN: Returns success
      expect(response.body).toEqual({ success: true });
    });
  });

  // ===========================================
  // POST /webhook/line - Event Processing
  // ===========================================

  describe('POST /webhook/line - Event Processing', () => {
    beforeEach(() => {
      mockVerifySignature.mockReturnValue(true);
    });

    const createPostbackEvent = (overrides = {}) => ({
      type: 'postback',
      replyToken: 'reply-token-123',
      source: {
        type: 'user',
        userId: 'U1234567890abcdef',
      },
      postback: {
        data: 'action=contacted&row_id=42',
      },
      ...overrides,
    });

    it('[P2] should respond immediately and process async (LINE < 1s requirement)', async () => {
      // GIVEN: Valid postback event with slow processing
      mockValidateLineWebhook.mockReturnValue({
        success: true,
        data: { events: [createPostbackEvent()] },
      });
      mockIsPostbackEvent.mockReturnValue(true);
      mockParsePostbackData.mockReturnValue({
        action: 'contacted',
        rowId: 42,
      });
      mockGetUserProfile.mockResolvedValue({ displayName: 'Test User' });
      mockClaimLead.mockImplementation(
        () => new Promise((resolve) => setTimeout(
          () => resolve({ isNewClaim: true, lead: { company: 'Test', customerName: 'Customer' } }),
          3000
        ))
      );

      // WHEN: POST with event
      const startTime = Date.now();
      const response = await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'valid-signature')
        .send({ events: [createPostbackEvent()] })
        .expect(200);
      const duration = Date.now() - startTime;

      // THEN: Response is fast (< 1 second)
      expect(duration).toBeLessThan(1000);
      expect(response.body).toEqual({ success: true });
    });

    it('[P2] should ignore non-postback events', async () => {
      // GIVEN: Non-postback event
      const messageEvent = {
        type: 'message',
        replyToken: 'reply-token-123',
        source: { type: 'user', userId: 'U123' },
        message: { type: 'text', text: 'Hello' },
      };
      mockValidateLineWebhook.mockReturnValue({
        success: true,
        data: { events: [messageEvent] },
      });
      mockIsPostbackEvent.mockReturnValue(false);

      // WHEN: POST with message event
      const response = await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'valid-signature')
        .send({ events: [messageEvent] })
        .expect(200);

      // THEN: Returns success but doesn't process
      expect(response.body).toEqual({ success: true });
      expect(mockClaimLead).not.toHaveBeenCalled();
    });

    it('[P2] should handle follow events gracefully', async () => {
      // GIVEN: Follow event
      const followEvent = {
        type: 'follow',
        replyToken: 'reply-token-123',
        source: { type: 'user', userId: 'U123' },
      };
      mockValidateLineWebhook.mockReturnValue({
        success: true,
        data: { events: [followEvent] },
      });
      mockIsPostbackEvent.mockReturnValue(false);

      // WHEN: POST with follow event
      const response = await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'valid-signature')
        .send({ events: [followEvent] })
        .expect(200);

      // THEN: Returns success
      expect(response.body).toEqual({ success: true });
    });

    it('[P2] should handle multiple events', async () => {
      // GIVEN: Multiple events
      const events = [
        createPostbackEvent({ replyToken: 'token-1' }),
        createPostbackEvent({ replyToken: 'token-2' }),
      ];
      mockValidateLineWebhook.mockReturnValue({
        success: true,
        data: { events },
      });
      mockIsPostbackEvent.mockReturnValue(true);
      mockParsePostbackData.mockReturnValue({ action: 'contacted', rowId: 42 });
      mockGetUserProfile.mockResolvedValue({ displayName: 'Test User' });
      mockClaimLead.mockResolvedValue({
        isNewClaim: true,
        lead: { company: 'Test', customerName: 'Customer' },
      });

      // WHEN: POST with multiple events
      const response = await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'valid-signature')
        .send({ events })
        .expect(200);

      // THEN: Returns success immediately
      expect(response.body).toEqual({ success: true });
    });
  });

  // ===========================================
  // POST /webhook/line - Error Handling
  // ===========================================

  describe('POST /webhook/line - Error Handling', () => {
    beforeEach(() => {
      mockVerifySignature.mockReturnValue(true);
    });

    it('[P2] should return 200 even when processing fails (LINE requirement)', async () => {
      // GIVEN: Processing throws error
      mockValidateLineWebhook.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // WHEN: POST with payload
      const response = await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'valid-signature')
        .send({ events: [] })
        .expect(200);

      // THEN: Returns 200 with success:false
      expect(response.body).toEqual({ success: false });
    });

    it('[P2] should add failed events to DLQ on processing error', async () => {
      // GIVEN: Event processing fails
      const event = {
        type: 'postback',
        replyToken: 'reply-token-123',
        source: { type: 'user', userId: 'U123' },
        postback: { data: 'action=contacted&row_id=42' },
      };
      mockValidateLineWebhook.mockReturnValue({
        success: true,
        data: { events: [event] },
      });
      mockIsPostbackEvent.mockReturnValue(true);
      mockParsePostbackData.mockReturnValue(null); // Invalid postback data
      mockReplyError.mockResolvedValue(undefined);

      // WHEN: POST with event
      await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'valid-signature')
        .send({ events: [event] })
        .expect(200);

      // Give async processing time to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // THEN: Error is handled and reply sent
      expect(mockReplyError).toHaveBeenCalled();
    });
  });

  // ===========================================
  // GET /webhook/line/test - Test Endpoint
  // ===========================================

  describe('GET /webhook/line/test', () => {
    it('[P2] should return 403 in production', async () => {
      // GIVEN: Production environment
      mockIsProd = true;

      // WHEN: GET test endpoint
      const response = await request(app)
        .get('/webhook/line/test')
        .expect(403);

      // THEN: Returns forbidden
      expect(response.body).toEqual({
        success: false,
        error: 'Test endpoint disabled in production',
      });
    });

    it('[P2] should return 200 after sending test notification', async () => {
      // GIVEN: Development environment
      mockIsProd = false;
      mockPushTextMessage.mockResolvedValue(undefined);

      // WHEN: GET test endpoint
      const response = await request(app)
        .get('/webhook/line/test')
        .expect(200);

      // THEN: Returns success and sends notification
      expect(response.body).toEqual({
        success: true,
        message: 'Test notification sent',
      });
      expect(mockPushTextMessage).toHaveBeenCalledWith(
        expect.stringContaining('Test notification')
      );
    });

    it('[P2] should return 500 when LINE push fails', async () => {
      // GIVEN: LINE service fails
      mockIsProd = false;
      mockPushTextMessage.mockRejectedValue(new Error('LINE API error'));

      // WHEN: GET test endpoint
      const response = await request(app)
        .get('/webhook/line/test')
        .expect(500);

      // THEN: Returns error
      expect(response.body).toEqual({
        success: false,
        error: 'LINE API error',
      });
    });
  });

  // ===========================================
  // Security Tests
  // ===========================================

  describe('Security', () => {
    it('[P2] should verify signature is checked before processing', async () => {
      // GIVEN: Invalid signature
      mockVerifySignature.mockReturnValue(false);

      // WHEN: POST with invalid signature
      await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'invalid')
        .send({ events: [] })
        .expect(401);

      // THEN: Validation never runs
      expect(mockValidateLineWebhook).not.toHaveBeenCalled();
    });

    it('[P2] should call verifySignature with raw body', async () => {
      // GIVEN: Valid signature
      mockVerifySignature.mockReturnValue(true);
      mockValidateLineWebhook.mockReturnValue({
        success: true,
        data: { events: [] },
      });

      const payload = { events: [] };

      // WHEN: POST with payload
      await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'valid-signature')
        .send(payload)
        .expect(200);

      // THEN: verifySignature called with stringified body
      expect(mockVerifySignature).toHaveBeenCalledWith(
        JSON.stringify(payload),
        'valid-signature'
      );
    });
  });

  // ===========================================
  // Source Type Handling
  // ===========================================

  describe('Source Type Handling', () => {
    beforeEach(() => {
      mockVerifySignature.mockReturnValue(true);
      mockIsPostbackEvent.mockReturnValue(true);
      mockParsePostbackData.mockReturnValue({ action: 'contacted', rowId: 42 });
      mockClaimLead.mockResolvedValue({
        isNewClaim: true,
        lead: { company: 'Test', customerName: 'Customer' },
      });
    });

    it('[P2] should handle user source type', async () => {
      // GIVEN: Event from direct user message
      const event = {
        type: 'postback',
        replyToken: 'token-123',
        source: { type: 'user', userId: 'U123' },
        postback: { data: 'action=contacted&row_id=42' },
      };
      mockValidateLineWebhook.mockReturnValue({
        success: true,
        data: { events: [event] },
      });
      mockGetUserProfile.mockResolvedValue({ displayName: 'Direct User' });

      // WHEN: POST with user source event
      await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'valid-signature')
        .send({ events: [event] })
        .expect(200);

      // Give async processing time
      await new Promise((resolve) => setTimeout(resolve, 100));

      // THEN: getUserProfile is called
      expect(mockGetUserProfile).toHaveBeenCalledWith('U123');
    });

    it('[P2] should handle group source type', async () => {
      // GIVEN: Event from group
      const event = {
        type: 'postback',
        replyToken: 'token-123',
        source: { type: 'group', groupId: 'G123', userId: 'U123' },
        postback: { data: 'action=contacted&row_id=42' },
      };
      mockValidateLineWebhook.mockReturnValue({
        success: true,
        data: { events: [event] },
      });
      mockGetGroupMemberProfile.mockResolvedValue({ displayName: 'Group User' });

      // WHEN: POST with group source event
      await request(app)
        .post('/webhook/line')
        .set('x-line-signature', 'valid-signature')
        .send({ events: [event] })
        .expect(200);

      // Give async processing time
      await new Promise((resolve) => setTimeout(resolve, 100));

      // THEN: getGroupMemberProfile is called
      expect(mockGetGroupMemberProfile).toHaveBeenCalledWith('G123', 'U123');
    });
  });
});
