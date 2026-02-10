/**
 * ENEOS Sales Automation - Admin Trend Route Integration Tests
 * Story 3.5: Individual Performance Trend
 *
 * Integration tests for GET /api/admin/sales-performance/trend endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import type { LeadRow } from '../../types/index.js';

// ===========================================
// Mock Setup
// ===========================================

// Use vi.hoisted for proper mock hoisting
const { mockSalesTeamService, mockLeadsService } = vi.hoisted(() => {
  const mockSalesTeamService = {
    getSalesTeamMember: vi.fn().mockResolvedValue(null),
  };
  const mockLeadsService = {
    getAllLeads: vi.fn().mockResolvedValue([]),
  };
  return { mockSalesTeamService, mockLeadsService };
});

// Mock logger first (including createModuleLogger used by leads.service)
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  createModuleLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock salesTeamService (extracted from sheets.service)
vi.mock('../../services/sales-team.service.js', () => ({
  ...mockSalesTeamService,
}));

// Mock leadsService (getAllLeads moved from sheetsService)
vi.mock('../../services/leads.service.js', () => mockLeadsService);

// Mock admin-auth middleware to bypass Google OAuth
vi.mock('../../middleware/admin-auth.js', () => ({
  adminAuthMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    // Simulate authenticated manager user
    req.user = {
      email: 'manager@eneos.co.th',
      name: 'Test Manager',
      role: 'manager',
      googleId: 'google-123',
    };
    next();
  },
  requireViewer: (_req: Request, _res: Response, next: NextFunction) => next(),
  requireManager: (_req: Request, _res: Response, next: NextFunction) => next(),
  requireAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
  requireRole: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

// Import after mocks
import adminRoutes from '../../routes/admin.routes.js';
import { errorHandler } from '../../middleware/error-handler.js';

// ===========================================
// Test App Setup
// ===========================================

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  app.use(errorHandler);
  return app;
}

// ===========================================
// Test Helpers
// ===========================================

const getDateISO = (daysOffset = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

const createSampleLead = (overrides: Partial<LeadRow> = {}): LeadRow => ({
  rowNumber: 2,
  date: getDateISO(),
  customerName: 'Test Customer',
  email: 'customer@test.com',
  phone: '0812345678',
  company: 'Test Company',
  industryAI: 'Manufacturing',
  website: 'https://test.com',
  capital: '10M',
  status: 'claimed',
  salesOwnerId: 'sales-001',
  salesOwnerName: 'Sales Person',
  campaignId: 'campaign-001',
  campaignName: 'Test Campaign',
  emailSubject: 'Test Subject',
  source: 'Brevo',
  leadId: 'lead-001',
  eventId: 'event-001',
  clickedAt: getDateISO(),
  talkingPoint: 'Test talking point',
  closedAt: null,
  lostAt: null,
  unreachableAt: null,
  version: 1,
  leadSource: null,
  jobTitle: null,
  city: null,
  leadUUID: null,
  createdAt: null,
  updatedAt: null,
  ...overrides,
});

// ===========================================
// Integration Tests
// ===========================================

describe('GET /api/admin/sales-performance/trend (Integration)', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLeadsService.getAllLeads.mockResolvedValue([]);
    mockSalesTeamService.getSalesTeamMember.mockResolvedValue(null);
    app = createTestApp();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('HTTP Status Codes', () => {
    it('should return 200 OK with valid request', async () => {
      const response = await request(app)
        .get('/api/admin/sales-performance/trend')
        .query({ userId: 'sales-001', days: '7' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 Bad Request when userId is missing', async () => {
      const response = await request(app)
        .get('/api/admin/sales-performance/trend')
        .query({ days: '7' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 Bad Request when days is invalid', async () => {
      const response = await request(app)
        .get('/api/admin/sales-performance/trend')
        .query({ userId: 'sales-001', days: '15' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Response Structure', () => {
    it('should return correct response structure', async () => {
      mockSalesTeamService.getSalesTeamMember.mockResolvedValue({
        name: 'John Smith',
        email: 'john@eneos.co.th',
      });

      const response = await request(app)
        .get('/api/admin/sales-performance/trend')
        .query({ userId: 'sales-001', days: '7' });

      expect(response.body).toMatchObject({
        success: true,
        data: {
          userId: 'sales-001',
          name: 'John Smith',
          period: 7,
          dailyData: expect.any(Array),
          teamAverage: expect.any(Array),
        },
      });
    });

    it('should return correct number of days in dailyData', async () => {
      const response = await request(app)
        .get('/api/admin/sales-performance/trend')
        .query({ userId: 'sales-001', days: '7' });

      expect(response.body.data.dailyData).toHaveLength(7);
      expect(response.body.data.teamAverage).toHaveLength(7);
    });

    it('should return "Unknown" name when sales member not found', async () => {
      mockSalesTeamService.getSalesTeamMember.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/admin/sales-performance/trend')
        .query({ userId: 'nonexistent', days: '7' });

      expect(response.body.data.name).toBe('Unknown');
    });
  });

  describe('Data Aggregation via HTTP', () => {
    it('should aggregate leads by date correctly', async () => {
      const yesterday = getDateISO(-1);
      mockLeadsService.getAllLeads.mockResolvedValue([
        createSampleLead({ salesOwnerId: 'sales-001', status: 'claimed', date: yesterday }),
        createSampleLead({ rowNumber: 3, salesOwnerId: 'sales-001', status: 'closed', date: yesterday, closedAt: yesterday }),
        createSampleLead({ rowNumber: 4, salesOwnerId: 'sales-002', status: 'claimed', date: yesterday }),
      ]);

      const response = await request(app)
        .get('/api/admin/sales-performance/trend')
        .query({ userId: 'sales-001', days: '7' });

      expect(response.status).toBe(200);

      // Find yesterday's data
      const yesterdayKey = new Date(yesterday).toISOString().split('T')[0];
      const yesterdayData = response.body.data.dailyData.find(
        (d: { date: string }) => d.date === yesterdayKey
      );

      expect(yesterdayData).toBeDefined();
      expect(yesterdayData.claimed).toBe(2); // 2 leads for sales-001
      expect(yesterdayData.closed).toBe(1);  // 1 closed
    });

    it('should calculate team average correctly', async () => {
      const yesterday = getDateISO(-1);
      mockLeadsService.getAllLeads.mockResolvedValue([
        // User 1: 2 leads
        createSampleLead({ salesOwnerId: 'sales-001', status: 'claimed', date: yesterday }),
        createSampleLead({ rowNumber: 3, salesOwnerId: 'sales-001', status: 'claimed', date: yesterday }),
        // User 2: 2 leads
        createSampleLead({ rowNumber: 4, salesOwnerId: 'sales-002', status: 'claimed', date: yesterday }),
        createSampleLead({ rowNumber: 5, salesOwnerId: 'sales-002', status: 'claimed', date: yesterday }),
      ]);

      const response = await request(app)
        .get('/api/admin/sales-performance/trend')
        .query({ userId: 'sales-001', days: '7' });

      const yesterdayKey = new Date(yesterday).toISOString().split('T')[0];
      const teamAvg = response.body.data.teamAverage.find(
        (d: { date: string }) => d.date === yesterdayKey
      );

      // Total 4 claimed, 2 users = average 2 per user
      expect(teamAvg.claimed).toBe(2);
    });
  });

  describe('Period Variations', () => {
    it.each([7, 30, 90])('should handle %d-day period correctly', async (days) => {
      const response = await request(app)
        .get('/api/admin/sales-performance/trend')
        .query({ userId: 'sales-001', days: String(days) });

      expect(response.status).toBe(200);
      expect(response.body.data.period).toBe(days);
      expect(response.body.data.dailyData).toHaveLength(days);
    });

    it('should default to 30 days when days param is omitted', async () => {
      const response = await request(app)
        .get('/api/admin/sales-performance/trend')
        .query({ userId: 'sales-001' });

      expect(response.status).toBe(200);
      expect(response.body.data.period).toBe(30);
      expect(response.body.data.dailyData).toHaveLength(30);
    });
  });

  describe('Content-Type', () => {
    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/admin/sales-performance/trend')
        .query({ userId: 'sales-001', days: '7' });

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully with empty data', async () => {
      // Note: getAllLeads() catches errors internally and returns empty array (graceful degradation)
      mockLeadsService.getAllLeads.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/admin/sales-performance/trend')
        .query({ userId: 'sales-001', days: '7' });

      // Should return 200 with zero values (graceful degradation)
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // All days should have 0 values
      const totalClaimed = response.body.data.dailyData.reduce(
        (sum: number, d: { claimed: number }) => sum + d.claimed, 0
      );
      expect(totalClaimed).toBe(0);
    });
  });
});
