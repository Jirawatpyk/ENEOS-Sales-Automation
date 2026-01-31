/**
 * Background Processing Integration Tests
 * End-to-end tests for async lead processing flow
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { processingStatusService } from '../../services/processing-status.service.js';

// Mock all external services with vi.hoisted
const {
  mockAnalyzeCompany,
  mockAddLead,
  mockPushLeadNotification,
  mockCheckOrThrow,
} = vi.hoisted(() => ({
  mockAnalyzeCompany: vi.fn(),
  mockAddLead: vi.fn(),
  mockPushLeadNotification: vi.fn(),
  mockCheckOrThrow: vi.fn(),
}));

vi.mock('../../services/gemini.service.js', () => ({
  GeminiService: vi.fn().mockImplementation(() => ({
    analyzeCompany: mockAnalyzeCompany,
  })),
}));

vi.mock('../../services/sheets.service.js', () => ({
  SheetsService: vi.fn().mockImplementation(() => ({
    addLead: mockAddLead,
  })),
}));

vi.mock('../../services/line.service.js', () => ({
  LineService: vi.fn().mockImplementation(() => ({
    pushLeadNotification: mockPushLeadNotification,
  })),
}));

vi.mock('../../services/deduplication.service.js', () => ({
  deduplicationService: {
    checkOrThrow: mockCheckOrThrow,
  },
}));

vi.mock('../../services/dead-letter-queue.service.js', () => ({
  addFailedBrevoWebhook: vi.fn(),
  deadLetterQueue: {
    add: vi.fn(),
    getStats: vi.fn().mockReturnValue({ totalEvents: 0, byType: {} }),
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

vi.mock('../../middleware/admin-auth.js', () => ({
  adminAuthMiddleware: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer valid-admin-token') {
      next();
    } else {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
  },
}));

describe('Background Processing Integration Tests', () => {
  let app: express.Application;
  let webhookRoutes: any;
  let statusRoutes: any;

  // Note: Brevo Automation ไม่ส่ง event field มา
  const mockBrevoPayload = {
    // NO event field - simulates Brevo Automation webhook
    email: 'integration@test.com',
    FIRSTNAME: 'Integration',
    LASTNAME: 'Test',
    PHONE: '0812345678',
    COMPANY: 'Test Corp',
    campaign_id: 99999,
    campaign_name: 'Integration Test Campaign',
    subject: 'Integration Test Email',
    'message-id': 'integration-test-123',
    date: new Date().toISOString(),
  };

  const mockAIAnalysis = {
    industry: 'Technology',
    talkingPoint: 'Tech innovation company',
    website: 'https://test.com',
    registeredCapital: 5000000,
    keywords: ['B2B', 'Tech'],
    juristicId: '0123456789012',
    dbdSector: 'Software',
    province: 'Bangkok',
    fullAddress: '123 Test St, Bangkok',
    confidence: 0.9,
    confidenceFactors: {
      hasRealDomain: true,
      hasDBDData: true,
      keywordMatch: true,
      geminiConfident: true,
      dataCompleteness: 0.9,
    },
  };

  // Import routes ONCE in beforeAll (expensive dynamic imports should not repeat per test)
  beforeAll(async () => {
    const webhookModule = await import('../../routes/webhook.routes.js');
    const statusModule = await import('../../routes/status.routes.js');
    webhookRoutes = webhookModule.default;
    statusRoutes = statusModule.default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    processingStatusService.clear();

    // Setup Express app (cheap - just wiring routes)
    app = express();
    app.use(express.json());
    app.use('/webhook', webhookRoutes);
    app.use('/api/leads/status', statusRoutes);

    // Setup default mocks
    mockCheckOrThrow.mockResolvedValue(undefined);
    mockAnalyzeCompany.mockResolvedValue(mockAIAnalysis);
    mockAddLead.mockResolvedValue(42);
    mockPushLeadNotification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    processingStatusService.clear();
  });

  describe('Successful End-to-End Flow', () => {
    it('should complete full background processing flow', async () => {
      // Step 1: Send webhook request
      const webhookResponse = await request(app)
        .post('/webhook/brevo')
        .send(mockBrevoPayload)
        .expect(200);

      // Verify immediate response
      expect(webhookResponse.body).toMatchObject({
        success: true,
        message: 'Lead received and processing',
        processing: 'background',
      });

      // Extract correlation ID
      const correlationId = webhookResponse.body.correlationId;
      expect(correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      // Step 2: Check initial status (could already be completed with mocked services)
      const initialStatusResponse = await request(app)
        .get(`/api/leads/status/${correlationId}`)
        .expect(200);

      expect(initialStatusResponse.body.success).toBe(true);
      expect(['pending', 'processing', 'completed']).toContain(initialStatusResponse.body.data.status);

      // Step 3: Wait for background processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 4: Check final status (should be completed)
      const finalStatusResponse = await request(app)
        .get(`/api/leads/status/${correlationId}`)
        .expect(200);

      expect(finalStatusResponse.body).toMatchObject({
        success: true,
        data: {
          correlationId,
          email: 'integration@test.com',
          company: 'Test Corp',
          status: 'completed',
          rowNumber: 42,
          industry: 'Technology',
          confidence: 0.9,
        },
      });

      // Verify all services were called
      expect(mockCheckOrThrow).toHaveBeenCalledWith('integration@test.com', expect.anything());
      expect(mockAnalyzeCompany).toHaveBeenCalled();
      expect(mockAddLead).toHaveBeenCalled();
      expect(mockPushLeadNotification).toHaveBeenCalled();
    });

    it('should track status transitions correctly', async () => {
      const webhookResponse = await request(app)
        .post('/webhook/brevo')
        .send(mockBrevoPayload)
        .expect(200);

      const correlationId = webhookResponse.body.correlationId;

      // Poll status multiple times to catch transitions
      const statuses: string[] = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get(`/api/leads/status/${correlationId}`)
          .expect(200);

        statuses.push(response.body.data.status);

        if (response.body.data.status === 'completed') {break;}
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      // Should eventually reach completed status
      expect(statuses).toContain('completed');
      // First status should be one of the valid states (mocked services are very fast)
      expect(['pending', 'processing', 'completed']).toContain(statuses[0]);
    });

    it('should include processing duration in completed status', async () => {
      const webhookResponse = await request(app)
        .post('/webhook/brevo')
        .send(mockBrevoPayload)
        .expect(200);

      const correlationId = webhookResponse.body.correlationId;

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));

      const statusResponse = await request(app)
        .get(`/api/leads/status/${correlationId}`)
        .expect(200);

      expect(statusResponse.body.data.duration).toBeDefined();
      expect(typeof statusResponse.body.data.duration).toBe('number');
      expect(statusResponse.body.data.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Failure Scenarios', () => {
    it('should handle AI analysis failure gracefully', async () => {
      mockAnalyzeCompany.mockRejectedValue(new Error('Gemini API timeout'));

      const webhookResponse = await request(app)
        .post('/webhook/brevo')
        .send(mockBrevoPayload)
        .expect(200);

      const correlationId = webhookResponse.body.correlationId;

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));

      const statusResponse = await request(app)
        .get(`/api/leads/status/${correlationId}`)
        .expect(200);

      // Should still complete with defaults
      expect(statusResponse.body.data.status).toBe('completed');
      expect(statusResponse.body.data.industry).toBe('Unknown'); // Default fallback
    });

    it('should mark as failed when Sheets save fails', async () => {
      mockAddLead.mockRejectedValue(new Error('Google Sheets API error'));

      const webhookResponse = await request(app)
        .post('/webhook/brevo')
        .send(mockBrevoPayload)
        .expect(200);

      const correlationId = webhookResponse.body.correlationId;

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const statusResponse = await request(app)
        .get(`/api/leads/status/${correlationId}`)
        .expect(200);

      // Should be marked as failed
      expect(statusResponse.body.data.status).toBe('failed');
      expect(statusResponse.body.data.error).toContain('Google Sheets API error');
    });

    it('should continue processing when LINE notification fails', async () => {
      mockPushLeadNotification.mockRejectedValue(new Error('LINE API error'));

      const webhookResponse = await request(app)
        .post('/webhook/brevo')
        .send(mockBrevoPayload)
        .expect(200);

      const correlationId = webhookResponse.body.correlationId;

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));

      const statusResponse = await request(app)
        .get(`/api/leads/status/${correlationId}`)
        .expect(200);

      // Should still complete (LINE is non-critical)
      expect(statusResponse.body.data.status).toBe('completed');
      expect(statusResponse.body.data.rowNumber).toBe(42);
    });
  });

  describe('Admin Status API', () => {
    it('should show all processing statuses for admin', async () => {
      // Create 3 leads
      const responses = await Promise.all([
        request(app).post('/webhook/brevo').send(mockBrevoPayload),
        request(app).post('/webhook/brevo').send({ ...mockBrevoPayload, email: 'test2@example.com' }),
        request(app).post('/webhook/brevo').send({ ...mockBrevoPayload, email: 'test3@example.com' }),
      ]);

      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(200);
      expect(responses[2].status).toBe(200);

      // Wait a bit for statuses to be created
      await new Promise(resolve => setTimeout(resolve, 50));

      // Get all statuses (admin only)
      const adminResponse = await request(app)
        .get('/api/leads/status')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200);

      expect(adminResponse.body.success).toBe(true);
      expect(adminResponse.body.count).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(adminResponse.body.data)).toBe(true);
    });

    it('should reject unauthorized access to admin endpoint', async () => {
      await request(app)
        .get('/api/leads/status')
        .expect(401);
    });
  });

  describe('Concurrent Processing', () => {
    it('should handle multiple concurrent webhook requests', async () => {
      const payloads = Array.from({ length: 5 }, (_, i) => ({
        ...mockBrevoPayload,
        email: `concurrent${i}@test.com`,
      }));

      // Send all webhooks concurrently
      const responses = await Promise.all(
        payloads.map(payload =>
          request(app).post('/webhook/brevo').send(payload)
        )
      );

      // All should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);

      // All should have unique correlation IDs
      const correlationIds = responses.map(r => r.body.correlationId);
      const uniqueIds = new Set(correlationIds);
      expect(uniqueIds.size).toBe(5);

      // Wait for all to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check all statuses
      const statusChecks = await Promise.all(
        correlationIds.map(id =>
          request(app).get(`/api/leads/status/${id}`)
        )
      );

      // All should be completed
      expect(statusChecks.every(r => r.status === 200)).toBe(true);
      expect(statusChecks.every(r => r.body.data.status === 'completed')).toBe(true);
    });
  });

  describe('Status Expiration', () => {
    it('should return 404 for expired/deleted status', async () => {
      const webhookResponse = await request(app)
        .post('/webhook/brevo')
        .send(mockBrevoPayload)
        .expect(200);

      const correlationId = webhookResponse.body.correlationId;

      // Verify status exists
      await request(app)
        .get(`/api/leads/status/${correlationId}`)
        .expect(200);

      // Manually delete status (simulating TTL expiration)
      processingStatusService.delete(correlationId);

      // Should return 404
      const response = await request(app)
        .get(`/api/leads/status/${correlationId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Status not found',
      });
    });
  });

  describe('Webhook Response Time', () => {
    it('should respond within 1 second (async processing)', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/webhook/brevo')
        .send(mockBrevoPayload)
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Should respond almost immediately (< 1000ms)
      expect(responseTime).toBeLessThan(1000);
      expect(response.body.processing).toBe('background');
    });
  });
});
