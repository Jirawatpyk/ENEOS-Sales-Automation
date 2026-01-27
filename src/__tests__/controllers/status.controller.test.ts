/**
 * Status Controller Tests
 * Tests for background processing status API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import {
  getProcessingStatus,
  getAllProcessingStatuses,
} from '../../controllers/status.controller.js';
import type { ProcessingStatus } from '../../services/processing-status.service.js';

// Mock processing status service
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

describe('Status Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let processingStatusService: typeof import('../../services/processing-status.service.js').processingStatusService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const statusModule = await import('../../services/processing-status.service.js');
    processingStatusService = statusModule.processingStatusService;

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('getProcessingStatus', () => {
    it('should return status for valid UUID', () => {
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
        duration: 15.5,
      };

      vi.mocked(processingStatusService.get).mockReturnValue(mockStatus);

      mockReq = {
        params: { correlationId: '550e8400-e29b-41d4-a716-446655440000' },
      };

      getProcessingStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus,
      });
    });

    it('should return 400 for invalid UUID format', () => {
      mockReq = {
        params: { correlationId: 'not-a-valid-uuid' },
      };

      getProcessingStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid correlation ID format',
        message: 'Correlation ID must be a valid UUID',
      });
    });

    it('should return 404 when status not found', () => {
      vi.mocked(processingStatusService.get).mockReturnValue(null);

      mockReq = {
        params: { correlationId: '550e8400-e29b-41d4-a716-446655440000' },
      };

      getProcessingStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Status not found',
        message: 'No processing status found for this correlation ID',
        correlationId: '550e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('should accept UUID in uppercase', () => {
      const mockStatus: ProcessingStatus = {
        correlationId: '550E8400-E29B-41D4-A716-446655440000',
        email: 'test@example.com',
        company: 'Test Corp',
        status: 'pending',
        startedAt: '2024-01-15T10:00:00.000Z',
      };

      vi.mocked(processingStatusService.get).mockReturnValue(mockStatus);

      mockReq = {
        params: { correlationId: '550E8400-E29B-41D4-A716-446655440000' },
      };

      getProcessingStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus,
      });
    });

    it('should reject UUID with wrong format (missing dashes)', () => {
      mockReq = {
        params: { correlationId: '550e8400e29b41d4a716446655440000' },
      };

      getProcessingStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid correlation ID format',
        message: 'Correlation ID must be a valid UUID',
      });
    });

    it('should handle processing status', () => {
      const mockStatus: ProcessingStatus = {
        correlationId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        company: 'Test Corp',
        status: 'processing',
        startedAt: '2024-01-15T10:00:00.000Z',
      };

      vi.mocked(processingStatusService.get).mockReturnValue(mockStatus);

      mockReq = {
        params: { correlationId: '550e8400-e29b-41d4-a716-446655440000' },
      };

      getProcessingStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStatus,
      });
      // Verify completedAt is not set for processing status
      expect((mockRes.json as ReturnType<typeof vi.fn>).mock.calls[0][0].data.completedAt).toBeUndefined();
    });

    it('should handle failed status with error message', () => {
      const mockStatus: ProcessingStatus = {
        correlationId: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        company: 'Test Corp',
        status: 'failed',
        startedAt: '2024-01-15T10:00:00.000Z',
        completedAt: '2024-01-15T10:00:05.000Z',
        error: 'Gemini API timeout',
        duration: 5.0,
      };

      vi.mocked(processingStatusService.get).mockReturnValue(mockStatus);

      mockReq = {
        params: { correlationId: '550e8400-e29b-41d4-a716-446655440000' },
      };

      getProcessingStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          status: 'failed',
          error: 'Gemini API timeout',
        }),
      });
    });
  });

  describe('getAllProcessingStatuses', () => {
    it('should return all statuses', () => {
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
        {
          correlationId: '770e8400-e29b-41d4-a716-446655440002',
          email: 'test3@example.com',
          company: 'Company C',
          status: 'pending',
          startedAt: '2024-01-15T10:02:00.000Z',
        },
      ];

      vi.mocked(processingStatusService.getAll).mockReturnValue(mockStatuses);

      mockReq = {};

      getAllProcessingStatuses(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 3,
        data: mockStatuses,
      });
    });

    it('should return empty array when no statuses', () => {
      vi.mocked(processingStatusService.getAll).mockReturnValue([]);

      mockReq = {};

      getAllProcessingStatuses(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        data: [],
      });
    });

    it('should return correct count', () => {
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
          status: 'failed',
          startedAt: '2024-01-15T10:01:00.000Z',
          error: 'Test error',
        },
      ];

      vi.mocked(processingStatusService.getAll).mockReturnValue(mockStatuses);

      mockReq = {};

      getAllProcessingStatuses(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 2,
        })
      );
    });
  });
});
