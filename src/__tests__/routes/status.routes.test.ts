/**
 * Status Routes Integration Tests
 * Tests for Status API endpoints with authentication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import statusRoutes from '../../routes/status.routes.js';
import type { ProcessingStatus } from '../../services/processing-status.service.js';

// Mock services
vi.mock('../../services/processing-status.service.js', () => ({
  processingStatusService: {
    get: vi.fn(),
    getAll: vi.fn(),
  },
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock admin auth middleware
vi.mock('../../middleware/admin-auth.js', () => ({
  adminAuthMiddleware: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer valid-admin-token') {
      next();
    } else {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Admin authentication required',
      });
    }
  },
}));

describe('Status Routes', () => {
  let app: express.Application;
  let processingStatusService: typeof import('../../services/processing-status.service.js').processingStatusService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const statusModule = await import('../../services/processing-status.service.js');
    processingStatusService = statusModule.processingStatusService;

    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/leads/status', statusRoutes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/leads/status/:correlationId', () => {
    it('should return 200 with status for valid UUID', async () => {
      const mockStatus: ProcessingStatus = {
        correlationId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        company: 'Test Corp',
        status: 'completed',
        startedAt: '2024-01-15T10:00:00.000Z',
        completedAt: '2024-01-15T10:00:15.000Z',
        rowNumber: 42,
        industry: 'Technology',
        confidence: 0.95,
      };

      vi.mocked(processingStatusService.get).mockReturnValue(mockStatus);

      const response = await request(app)
        .get('/api/leads/status/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStatus,
      });
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/leads/status/not-a-uuid')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid correlation ID format',
        message: 'Correlation ID must be a valid UUID',
      });
    });

    it('should return 404 when status not found', async () => {
      vi.mocked(processingStatusService.get).mockReturnValue(null);

      const response = await request(app)
        .get('/api/leads/status/550e8400-e29b-41d4-a716-446655440000')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Status not found',
        message: 'No processing status found for this correlation ID',
        correlationId: '550e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('should work without authentication (public endpoint)', async () => {
      const mockStatus: ProcessingStatus = {
        correlationId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        company: 'Test Corp',
        status: 'pending',
        startedAt: '2024-01-15T10:00:00.000Z',
      };

      vi.mocked(processingStatusService.get).mockReturnValue(mockStatus);

      // No Authorization header
      const response = await request(app)
        .get('/api/leads/status/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should accept UUID with uppercase letters', async () => {
      const mockStatus: ProcessingStatus = {
        correlationId: '550E8400-E29B-41D4-A716-446655440000',
        email: 'test@example.com',
        company: 'Test Corp',
        status: 'processing',
        startedAt: '2024-01-15T10:00:00.000Z',
      };

      vi.mocked(processingStatusService.get).mockReturnValue(mockStatus);

      const response = await request(app)
        .get('/api/leads/status/550E8400-E29B-41D4-A716-446655440000')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return failed status with error message', async () => {
      const mockStatus: ProcessingStatus = {
        correlationId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        company: 'Test Corp',
        status: 'failed',
        startedAt: '2024-01-15T10:00:00.000Z',
        completedAt: '2024-01-15T10:00:05.000Z',
        error: 'Google Sheets API error',
        duration: 5.0,
      };

      vi.mocked(processingStatusService.get).mockReturnValue(mockStatus);

      const response = await request(app)
        .get('/api/leads/status/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(response.body.data).toMatchObject({
        status: 'failed',
        error: 'Google Sheets API error',
      });
    });
  });

  describe('GET /api/leads/status', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/leads/status')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Unauthorized',
        message: 'Admin authentication required',
      });
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/leads/status')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Unauthorized',
        message: 'Admin authentication required',
      });
    });

    it('should return 200 with all statuses when authenticated', async () => {
      const mockStatuses: ProcessingStatus[] = [
        {
          correlationId: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test1@example.com',
          company: 'Company A',
          status: 'completed',
          startedAt: '2024-01-15T10:00:00.000Z',
          completedAt: '2024-01-15T10:00:15.000Z',
        },
        {
          correlationId: '660e8400-e29b-41d4-a716-446655440001',
          email: 'test2@example.com',
          company: 'Company B',
          status: 'processing',
          startedAt: '2024-01-15T10:01:00.000Z',
        },
      ];

      vi.mocked(processingStatusService.getAll).mockReturnValue(mockStatuses);

      const response = await request(app)
        .get('/api/leads/status')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        total: 2,
        data: mockStatuses,
      });
    });

    it('should return empty array when no statuses', async () => {
      vi.mocked(processingStatusService.getAll).mockReturnValue([]);

      const response = await request(app)
        .get('/api/leads/status')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        total: 0,
        data: [],
      });
    });

    it('should return correct count matching data length', async () => {
      const mockStatuses: ProcessingStatus[] = [
        {
          correlationId: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test1@example.com',
          company: 'Company A',
          status: 'completed',
          startedAt: '2024-01-15T10:00:00.000Z',
        },
        {
          correlationId: '660e8400-e29b-41d4-a716-446655440001',
          email: 'test2@example.com',
          company: 'Company B',
          status: 'pending',
          startedAt: '2024-01-15T10:01:00.000Z',
        },
        {
          correlationId: '770e8400-e29b-41d4-a716-446655440002',
          email: 'test3@example.com',
          company: 'Company C',
          status: 'failed',
          startedAt: '2024-01-15T10:02:00.000Z',
          error: 'Test error',
        },
      ];

      vi.mocked(processingStatusService.getAll).mockReturnValue(mockStatuses);

      const response = await request(app)
        .get('/api/leads/status')
        .set('Authorization', 'Bearer valid-admin-token')
        .expect(200);

      expect(response.body.total).toBe(3);
      expect(response.body.data.length).toBe(3);
    });
  });

  describe('Route ordering', () => {
    it('should match /:correlationId before / route', async () => {
      const mockStatus: ProcessingStatus = {
        correlationId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        company: 'Test Corp',
        status: 'completed',
        startedAt: '2024-01-15T10:00:00.000Z',
      };

      vi.mocked(processingStatusService.get).mockReturnValue(mockStatus);

      // Should hit /:correlationId route, not / route
      const response = await request(app)
        .get('/api/leads/status/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.count).toBeUndefined(); // count only in / route
    });
  });
});
