/**
 * App Integration Tests
 * Tests for Express application endpoints
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';

// Prevent process.exit from being called during tests
const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);

// Store original process.on
const originalProcessOn = process.on.bind(process);

// Mock process.on to prevent exit handlers
vi.spyOn(process, 'on').mockImplementation((event: string, listener: (...args: unknown[]) => void) => {
  // Skip handlers that call process.exit
  if (event === 'uncaughtException' || event === 'unhandledRejection' || event === 'SIGTERM' || event === 'SIGINT') {
    return process;
  }
  return originalProcessOn(event, listener as (...args: unknown[]) => void);
});

// Mock all external services before importing app
vi.mock('../config/index.js', () => ({
  config: {
    env: 'test',
    port: 3001,
    isDev: true,
    google: {
      serviceAccountEmail: 'test@test.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
      sheetId: 'test-sheet-id',
      sheets: {
        leads: 'Leads',
        dedup: 'Deduplication_Log',
        salesTeam: 'Sales_Team',
      },
    },
    gemini: {
      apiKey: 'test-api-key',
      model: 'gemini-1.5-flash',
    },
    line: {
      channelAccessToken: 'test-token',
      channelSecret: 'test-secret',
      groupId: 'test-group-id',
    },
    brevo: {
      webhookSecret: 'test-brevo-secret',
    },
    security: {
      corsOrigins: ['*'],
      rateLimit: {
        windowMs: 60000,
        max: 1000, // High limit for tests
      },
      skipLineSignatureVerification: true,
    },
    features: {
      aiEnrichment: true,
      deduplication: true,
      lineNotifications: true,
    },
    sentry: {
      dsn: '',
    },
  },
}));

// Mock Sentry
vi.mock('../utils/sentry.js', () => ({
  initSentry: vi.fn(),
  flushSentry: vi.fn().mockResolvedValue(undefined),
  captureException: vi.fn(),
}));

// Mock Redis service
vi.mock('../services/redis.service.js', () => ({
  redisService: {
    isAvailable: vi.fn().mockReturnValue(false),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  webhookLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  lineLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  geminiLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  sheetsLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock services - inline to avoid hoisting issues
vi.mock('../services/sheets.service.js', () => ({
  sheetsService: {
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, latency: 50 }),
    addLead: vi.fn().mockResolvedValue(1),
    getRow: vi.fn().mockResolvedValue(null),
    checkDuplicate: vi.fn().mockResolvedValue(false),
    markAsProcessed: vi.fn().mockResolvedValue(undefined),
    claimLead: vi.fn().mockResolvedValue({ success: true, lead: {} }),
    getSalesTeamMember: vi.fn().mockResolvedValue(null),
  },
  SheetsService: vi.fn(),
}));

vi.mock('../services/gemini.service.js', () => ({
  geminiService: {
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, latency: 50 }),
    analyzeCompany: vi.fn().mockResolvedValue({
      industry: 'IT',
      talkingPoint: 'Test',
      website: null,
      registeredCapital: null,
      keywords: ['test'],
      juristicId: null,
      dbdSector: null,
      dbdSectorDescription: null,
      province: null,
      fullAddress: null,
    }),
  },
  GeminiService: vi.fn(),
}));

vi.mock('../services/line.service.js', () => ({
  lineService: {
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, latency: 50 }),
    pushLeadNotification: vi.fn().mockResolvedValue(undefined),
    pushTextMessage: vi.fn().mockResolvedValue(undefined),
    replySuccess: vi.fn().mockResolvedValue(undefined),
    replyError: vi.fn().mockResolvedValue(undefined),
    replyClaimed: vi.fn().mockResolvedValue(undefined),
    verifySignature: vi.fn().mockReturnValue(true),
  },
  LineService: vi.fn(),
}));

vi.mock('../services/deduplication.service.js', () => ({
  deduplicationService: {
    checkAndMark: vi.fn().mockResolvedValue(false),
    isDuplicate: vi.fn().mockResolvedValue(false),
    getStats: vi.fn().mockReturnValue({ cacheSize: 0, hits: 0, misses: 0 }),
  },
}));

vi.mock('../services/dead-letter-queue.service.js', () => ({
  deadLetterQueue: {
    add: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
    getStats: vi.fn().mockReturnValue({ total: 0, byType: {} }),
    remove: vi.fn().mockReturnValue(true),
    clear: vi.fn().mockReturnValue(0),
  },
}));

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => ({})),
    },
    sheets: vi.fn().mockReturnValue({
      spreadsheets: {
        values: {
          get: vi.fn().mockResolvedValue({ data: { values: [] } }),
          append: vi.fn().mockResolvedValue({ data: { updates: { updatedRange: 'Leads!A1:W1' } } }),
          update: vi.fn().mockResolvedValue({}),
        },
        get: vi.fn().mockResolvedValue({ data: { spreadsheetId: 'test' } }),
      },
    }),
  },
}));

// Mock LINE SDK
vi.mock('@line/bot-sdk', () => ({
  Client: vi.fn().mockImplementation(() => ({
    pushMessage: vi.fn().mockResolvedValue({}),
    replyMessage: vi.fn().mockResolvedValue({}),
    getBotInfo: vi.fn().mockResolvedValue({ userId: 'U123' }),
  })),
}));

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      startChat: vi.fn().mockReturnValue({
        sendMessage: vi.fn().mockResolvedValue({
          response: { text: () => '{}' },
        }),
      }),
      generateContent: vi.fn().mockResolvedValue({
        response: { text: () => 'OK' },
      }),
    }),
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  },
  HarmBlockThreshold: {
    BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
  },
}));

// Import app after all mocks
import app, { server } from '../app.js';

describe('App Integration Tests', () => {
  beforeAll(() => {
    // Allow some time for server to start
  });

  afterAll(async () => {
    // Close server after tests
    if (server && server.listening) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    // Restore mocks
    mockExit.mockRestore();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // Root Endpoint
  // ===========================================

  describe('GET /', () => {
    it('should return API info', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'ENEOS Sales Automation API');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('endpoints');
    });

    it('should include all endpoint paths in response', async () => {
      const response = await request(app).get('/');

      expect(response.body.endpoints).toHaveProperty('health', '/health');
      expect(response.body.endpoints).toHaveProperty('ready', '/ready');
      expect(response.body.endpoints).toHaveProperty('brevoWebhook', '/webhook/brevo');
      expect(response.body.endpoints).toHaveProperty('lineWebhook', '/webhook/line');
    });
  });

  // ===========================================
  // Health Endpoints
  // ===========================================

  describe('GET /ready', () => {
    it('should return ready status', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ready', true);
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /live', () => {
    it('should return alive status', async () => {
      const response = await request(app).get('/live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('alive', true);
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('GET /health', () => {
    it('should return healthy status when all services are up', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('services');
    });

    it('should include service status details', async () => {
      const response = await request(app).get('/health');

      expect(response.body.services).toHaveProperty('googleSheets');
      expect(response.body.services).toHaveProperty('geminiAI');
      expect(response.body.services).toHaveProperty('lineAPI');
      expect(response.body.services.googleSheets).toHaveProperty('status');
      expect(response.body.services.googleSheets).toHaveProperty('latency');
    });
  });

  // ===========================================
  // Metrics Endpoint
  // ===========================================

  describe('GET /metrics', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('http_requests_total');
    });
  });

  // ===========================================
  // API Documentation
  // ===========================================

  describe('GET /api-docs.json', () => {
    it('should return OpenAPI specification', async () => {
      const response = await request(app).get('/api-docs.json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
    });
  });

  // ===========================================
  // Development Endpoints (when isDev=true)
  // ===========================================

  describe('GET /stats (dev only)', () => {
    it('should return system stats', async () => {
      const response = await request(app).get('/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('deduplication');
      expect(response.body).toHaveProperty('deadLetterQueue');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
    });
  });

  describe('DLQ Endpoints (dev only)', () => {
    it('GET /dlq should return dead letter queue items', async () => {
      const response = await request(app).get('/dlq');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('stats');
    });

    it('DELETE /dlq/:id should remove specific item', async () => {
      const response = await request(app).delete('/dlq/test-id');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });

    it('DELETE /dlq should clear all items', async () => {
      const response = await request(app).delete('/dlq');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('clearedCount');
    });
  });

  // ===========================================
  // Error Handling
  // ===========================================

  describe('404 Not Found', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  // ===========================================
  // Security Headers
  // ===========================================

  describe('Security', () => {
    it('should include security headers from helmet', async () => {
      const response = await request(app).get('/');

      // Helmet sets various security headers
      expect(response.headers).toHaveProperty('x-dns-prefetch-control');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });

    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  // ===========================================
  // Request ID
  // ===========================================

  describe('Request Context', () => {
    it('should include X-Request-ID in response', async () => {
      const response = await request(app).get('/');

      expect(response.headers).toHaveProperty('x-request-id');
      expect(response.headers['x-request-id']).toBeTruthy();
    });

    it('should track response time (latency exists)', async () => {
      const start = Date.now();
      const response = await request(app).get('/');
      const duration = Date.now() - start;

      // Response should complete in reasonable time
      expect(duration).toBeLessThan(5000);
      expect(response.status).toBe(200);
    });
  });
});
