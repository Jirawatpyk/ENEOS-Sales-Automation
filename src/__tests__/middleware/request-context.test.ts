/**
 * Request Context Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  requestIdMiddleware,
  timeoutMiddleware,
  responseTimeMiddleware,
} from '../../middleware/request-context.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Request Context Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      path: '/test',
      method: 'GET',
    };
    mockRes = {
      setHeader: vi.fn(),
      on: vi.fn(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('requestIdMiddleware', () => {
    it('should generate a new request ID if not provided', () => {
      requestIdMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.requestId).toBeDefined();
      expect(typeof mockReq.requestId).toBe('string');
      expect(mockReq.requestId!.length).toBeGreaterThan(0);
      expect(mockReq.startTime).toBeDefined();
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', mockReq.requestId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing request ID from header', () => {
      const existingId = 'existing-request-id-123';
      mockReq.headers = { 'x-request-id': existingId };

      requestIdMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.requestId).toBe(existingId);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', existingId);
    });

    it('should set startTime', () => {
      const beforeTime = Date.now();

      requestIdMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      const afterTime = Date.now();
      expect(mockReq.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(mockReq.startTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('timeoutMiddleware', () => {
    it('should call next for excluded paths', () => {
      mockReq.path = '/health';

      const middleware = timeoutMiddleware({
        timeoutMs: 1000,
        excludePaths: ['/health', '/ready'],
      });

      middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should setup timeout for non-excluded paths', () => {
      mockReq.path = '/api/test';
      mockReq.requestId = 'test-id';
      mockReq.startTime = Date.now();

      const middleware = timeoutMiddleware({
        timeoutMs: 5000,
        excludePaths: ['/health'],
      });

      middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(mockRes.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should use default timeout if not specified', () => {
      mockReq.path = '/api/test';
      mockReq.requestId = 'test-id';
      mockReq.startTime = Date.now();

      const middleware = timeoutMiddleware();

      middleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('responseTimeMiddleware', () => {
    it('should register finish event listener', () => {
      mockReq.requestId = 'test-id';
      mockReq.startTime = Date.now();

      responseTimeMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
