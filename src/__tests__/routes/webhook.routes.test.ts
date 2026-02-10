/**
 * Webhook Routes Integration Tests
 * Tests for Brevo webhook endpoints
 *
 * @coverage P2 - Route integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import webhookRoutes from '../../routes/webhook.routes.js';

// ===========================================
// Mock Services and Dependencies
// ===========================================

const mockCheckOrThrow = vi.fn();
const mockAddFailedBrevoWebhook = vi.fn().mockReturnValue('dlq-123');
const mockProcessLeadAsync = vi.fn();
const mockCreate = vi.fn();
const mockValidateBrevoWebhook = vi.fn();

vi.mock('../../utils/logger.js', () => ({
  webhookLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/deduplication.service.js', () => ({
  checkOrThrow: (...args: unknown[]) => mockCheckOrThrow(...args),
}));

vi.mock('../../services/dead-letter-queue.service.js', () => ({
  addFailedBrevoWebhook: (...args: unknown[]) => mockAddFailedBrevoWebhook(...args),
}));

vi.mock('../../services/background-processor.service.js', () => ({
  processLeadAsync: (...args: unknown[]) => mockProcessLeadAsync(...args),
}));

vi.mock('../../services/processing-status.service.js', () => ({
  processingStatusService: {
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

vi.mock('../../validators/brevo.validator.js', () => ({
  validateBrevoWebhook: (...args: unknown[]) => mockValidateBrevoWebhook(...args),
}));

vi.mock('../../utils/metrics.js', () => ({
  leadsProcessed: { inc: vi.fn() },
  duplicateLeadsTotal: { inc: vi.fn() },
}));

vi.mock('../../utils/date-formatter.js', () => ({
  formatDateForSheets: vi.fn().mockReturnValue('2026-01-31'),
}));

// Mock config
let mockIsProd = false;
vi.mock('../../config/index.js', () => ({
  config: {
    get isProd() {
      return mockIsProd;
    },
    get isDev() {
      return !mockIsProd;
    },
  },
}));

// ===========================================
// Test Setup
// ===========================================

describe('Webhook Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsProd = false;

    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use('/webhook', webhookRoutes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // GET /webhook/brevo - Verification
  // ===========================================

  describe('GET /webhook/brevo', () => {
    it('[P2] should return 200 with verification response', async () => {
      // WHEN: GET request to verification endpoint
      const response = await request(app)
        .get('/webhook/brevo')
        .expect(200);

      // THEN: Returns verification message
      expect(response.body).toMatchObject({
        success: true,
        message: 'Webhook endpoint is active',
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('[P2] should include ISO timestamp', async () => {
      // WHEN: GET request to verification endpoint
      const response = await request(app)
        .get('/webhook/brevo')
        .expect(200);

      // THEN: Timestamp is valid ISO format
      const timestamp = response.body.timestamp;
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });

  // ===========================================
  // POST /webhook/brevo - Main Handler
  // ===========================================

  describe('POST /webhook/brevo', () => {
    const validPayload = {
      email: 'test@company.com',
      firstname: 'Test',
      lastname: 'User',
      phone: '0812345678',
      company: 'Test Corp',
      campaign_id: 12345,
      campaign_name: 'Q1 Campaign',
      subject: 'Welcome Email',
      contact_id: 99999,
      'message-id': 'msg-001',
    };

    describe('validation', () => {
      it('[P2] should return 400 for invalid payload', async () => {
        // GIVEN: Invalid payload (validation fails)
        mockValidateBrevoWebhook.mockReturnValue({
          success: false,
          error: 'Missing required field: email',
        });

        // WHEN: POST with invalid payload
        const response = await request(app)
          .post('/webhook/brevo')
          .send({ invalid: 'data' })
          .expect(400);

        // THEN: Returns validation error
        expect(response.body).toEqual({
          success: false,
          error: 'Invalid payload',
          details: 'Missing required field: email',
        });
      });

      it('[P2] should return 400 when validation data is missing', async () => {
        // GIVEN: Validation succeeds but returns no data
        mockValidateBrevoWebhook.mockReturnValue({
          success: true,
          data: null,
        });

        // WHEN: POST with payload
        const response = await request(app)
          .post('/webhook/brevo')
          .send(validPayload)
          .expect(400);

        // THEN: Returns error
        expect(response.body.success).toBe(false);
      });
    });

    describe('event field filtering', () => {
      it('[P2] should skip processing when event field is present (Campaign webhook)', async () => {
        // GIVEN: Valid payload but with event field (Campaign, not Automation)
        mockValidateBrevoWebhook.mockReturnValue({
          success: true,
          data: { ...validPayload, event: 'click' },
        });

        // WHEN: POST with event field
        const response = await request(app)
          .post('/webhook/brevo')
          .send({ ...validPayload, event: 'click' })
          .expect(200);

        // THEN: Returns acknowledged but doesn't process
        expect(response.body).toEqual({
          success: true,
          message: 'Acknowledged',
        });
        expect(mockCheckOrThrow).not.toHaveBeenCalled();
        expect(mockProcessLeadAsync).not.toHaveBeenCalled();
      });

      it('[P2] should process when no event field (Automation webhook)', async () => {
        // GIVEN: Valid payload without event field
        mockValidateBrevoWebhook.mockReturnValue({
          success: true,
          data: validPayload,
        });
        mockCheckOrThrow.mockResolvedValue(undefined);

        // WHEN: POST without event field
        const response = await request(app)
          .post('/webhook/brevo')
          .send(validPayload)
          .expect(200);

        // THEN: Processes the lead
        expect(response.body.success).toBe(true);
        expect(response.body.processing).toBe('background');
        expect(response.body.correlationId).toBeDefined();
        expect(mockProcessLeadAsync).toHaveBeenCalled();
      });
    });

    describe('deduplication', () => {
      it('[P2] should return 200 for duplicate leads', async () => {
        // GIVEN: Payload is a duplicate
        const { DuplicateLeadError } = await import('../../types/index.js');
        mockValidateBrevoWebhook.mockReturnValue({
          success: true,
          data: validPayload,
        });
        mockCheckOrThrow.mockRejectedValue(
          new DuplicateLeadError('Already processed', validPayload.email)
        );

        // WHEN: POST with duplicate
        const response = await request(app)
          .post('/webhook/brevo')
          .send(validPayload)
          .expect(200);

        // THEN: Returns duplicate message
        expect(response.body).toEqual({
          success: true,
          message: 'Duplicate lead - already processed',
        });
        expect(mockProcessLeadAsync).not.toHaveBeenCalled();
      });

      it('[P2] should re-throw non-duplicate errors', async () => {
        // GIVEN: Non-duplicate error during dedup check
        mockValidateBrevoWebhook.mockReturnValue({
          success: true,
          data: validPayload,
        });
        mockCheckOrThrow.mockRejectedValue(new Error('Database connection failed'));

        // WHEN: POST with payload
        const response = await request(app)
          .post('/webhook/brevo')
          .send(validPayload)
          .expect(500);

        // THEN: Error is propagated
        expect(mockAddFailedBrevoWebhook).toHaveBeenCalled();
      });
    });

    describe('successful processing', () => {
      beforeEach(() => {
        mockValidateBrevoWebhook.mockReturnValue({
          success: true,
          data: validPayload,
        });
        mockCheckOrThrow.mockResolvedValue(undefined);
      });

      it('[P2] should return 200 with correlationId', async () => {
        // WHEN: POST with valid payload
        const response = await request(app)
          .post('/webhook/brevo')
          .send(validPayload)
          .expect(200);

        // THEN: Returns success with tracking info
        expect(response.body).toMatchObject({
          success: true,
          message: 'Lead received and processing',
          processing: 'background',
        });
        expect(response.body.correlationId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      });

      it('[P2] should create processing status', async () => {
        // WHEN: POST with valid payload
        await request(app)
          .post('/webhook/brevo')
          .send(validPayload)
          .expect(200);

        // THEN: Processing status is created
        expect(mockCreate).toHaveBeenCalledWith(
          expect.any(String), // correlationId
          validPayload.email,
          validPayload.company
        );
      });

      it('[P2] should trigger background processing', async () => {
        // WHEN: POST with valid payload
        await request(app)
          .post('/webhook/brevo')
          .send(validPayload)
          .expect(200);

        // THEN: Background processor is called
        expect(mockProcessLeadAsync).toHaveBeenCalledWith(
          validPayload,
          expect.any(String) // correlationId
        );
      });

      it('[P2] should respond quickly (non-blocking)', async () => {
        // GIVEN: Slow background process
        mockProcessLeadAsync.mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 5000))
        );

        // WHEN: POST with valid payload
        const startTime = Date.now();
        await request(app)
          .post('/webhook/brevo')
          .send(validPayload)
          .expect(200);
        const duration = Date.now() - startTime;

        // THEN: Response is fast (< 1 second, not waiting for background)
        expect(duration).toBeLessThan(1000);
      });
    });

    describe('error handling', () => {
      it('[P2] should add failed webhook to DLQ on error', async () => {
        // GIVEN: Validation throws unexpected error
        mockValidateBrevoWebhook.mockImplementation(() => {
          throw new Error('Unexpected validation error');
        });

        // WHEN: POST with payload
        await request(app)
          .post('/webhook/brevo')
          .send(validPayload)
          .expect(500);

        // THEN: Added to DLQ
        expect(mockAddFailedBrevoWebhook).toHaveBeenCalledWith(
          validPayload,
          expect.any(Error),
          undefined // requestId
        );
      });
    });
  });

  // ===========================================
  // POST /webhook/brevo/test - Test Endpoint
  // ===========================================

  describe('POST /webhook/brevo/test', () => {
    it('[P2] should return 403 in production', async () => {
      // GIVEN: Production environment
      mockIsProd = true;

      // WHEN: POST to test endpoint
      const response = await request(app)
        .post('/webhook/brevo/test')
        .expect(403);

      // THEN: Returns forbidden
      expect(response.body).toEqual({
        success: false,
        error: 'Test endpoint disabled in production',
      });
    });

    it('[P2] should return 200 with mock payload in development', async () => {
      // GIVEN: Development environment
      mockIsProd = false;

      // WHEN: POST to test endpoint
      const response = await request(app)
        .post('/webhook/brevo/test')
        .expect(200);

      // THEN: Returns mock payload
      expect(response.body).toMatchObject({
        success: true,
        message: 'Test webhook processed',
      });
      expect(response.body.mockPayload).toBeDefined();
      expect(response.body.mockPayload.event).toBe('click');
      expect(response.body.mockPayload.email).toBe('test@example.com');
    });
  });

  // ===========================================
  // Content-Type Handling
  // ===========================================

  describe('Content-Type handling', () => {
    it('[P2] should accept application/json', async () => {
      // GIVEN: Valid JSON payload
      mockValidateBrevoWebhook.mockReturnValue({
        success: true,
        data: { email: 'test@test.com', company: 'Test' },
      });
      mockCheckOrThrow.mockResolvedValue(undefined);

      // WHEN: POST with JSON content type
      const response = await request(app)
        .post('/webhook/brevo')
        .set('Content-Type', 'application/json')
        .send({ email: 'test@test.com', company: 'Test' })
        .expect(200);

      // THEN: Processes successfully
      expect(response.body.success).toBe(true);
    });
  });
});
