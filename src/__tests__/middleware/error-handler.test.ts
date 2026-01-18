/**
 * Error Handler Middleware Tests
 * Tests for errorHandler, notFoundHandler, and asyncHandler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// ===========================================
// Mocks
// ===========================================

const mockLogError = vi.fn();
const mockLoggerWarn = vi.fn();

const mockCaptureException = vi.fn();
const mockAddBreadcrumb = vi.fn();

vi.mock('../../utils/logger.js', () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: vi.fn(),
    info: vi.fn(),
  },
  logError: (...args: unknown[]) => mockLogError(...args),
}));

vi.mock('../../utils/sentry.js', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
}));

// Mock config - need to control isDev for different test scenarios
let mockIsDev = false;
vi.mock('../../config/index.js', () => ({
  config: {
    get isDev() {
      return mockIsDev;
    },
    get isProd() {
      return !mockIsDev;
    },
  },
}));

// ===========================================
// Import after mocks
// ===========================================

import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
} from '../../middleware/error-handler.js';
import { AppError } from '../../types/index.js';

// ===========================================
// Test Helpers
// ===========================================

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    requestId: 'req-123',
    path: '/api/test',
    method: 'POST',
    ip: '127.0.0.1',
    query: {},
    body: undefined,
    ...overrides,
  } as Request;
}

function createMockResponse(): Response & { statusCode: number; jsonData: unknown } {
  const res = {
    statusCode: 200,
    jsonData: null as unknown,
    status: vi.fn(function (this: { statusCode: number }, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: { jsonData: unknown }, data: unknown) {
      this.jsonData = data;
      return this;
    }),
  };
  return res as unknown as Response & { statusCode: number; jsonData: unknown };
}

const mockNext: NextFunction = vi.fn();

// ===========================================
// errorHandler Tests
// ===========================================

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDev = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('request ID handling', () => {
    it('should use requestId from request when available', () => {
      const req = createMockRequest({ requestId: 'custom-req-id' });
      const res = createMockResponse();
      const error = new Error('Test error');

      errorHandler(error, req, res, mockNext);

      expect(mockLogError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ requestId: 'custom-req-id' })
      );
      expect(res.jsonData).toEqual(
        expect.objectContaining({ requestId: 'custom-req-id' })
      );
    });

    it('should use "unknown" when requestId is missing', () => {
      const req = createMockRequest({ requestId: undefined });
      const res = createMockResponse();
      const error = new Error('Test error');

      errorHandler(error, req, res, mockNext);

      expect(mockLogError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ requestId: 'unknown' })
      );
      expect(res.jsonData).toEqual(
        expect.objectContaining({ requestId: 'unknown' })
      );
    });
  });

  describe('logging', () => {
    it('should log error with full request context', () => {
      const req = createMockRequest({
        requestId: 'log-test-id',
        path: '/api/leads',
        method: 'GET',
        ip: '192.168.1.1',
      });
      const res = createMockResponse();
      const error = new Error('Context test');

      errorHandler(error, req, res, mockNext);

      expect(mockLogError).toHaveBeenCalledWith(error, {
        requestId: 'log-test-id',
        path: '/api/leads',
        method: 'GET',
        ip: '192.168.1.1',
      });
    });
  });

  describe('operational vs non-operational errors', () => {
    it('should expose message for operational AppError', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new AppError('Operational error message', 400, 'OP_ERROR', true);

      errorHandler(error, req, res, mockNext);

      expect(res.jsonData).toEqual({
        success: false,
        error: {
          message: 'Operational error message',
          code: 'OP_ERROR',
        },
        requestId: 'req-123',
      });
    });

    it('should hide message for non-operational AppError', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new AppError('Sensitive internal error', 500, 'INTERNAL', false);

      errorHandler(error, req, res, mockNext);

      expect(res.jsonData).toEqual({
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'INTERNAL',
        },
        requestId: 'req-123',
      });
    });

    it('should hide message for generic Error', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new Error('Raw error details');

      errorHandler(error, req, res, mockNext);

      expect(res.jsonData).toEqual({
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
        requestId: 'req-123',
      });
    });
  });

  describe('Sentry reporting', () => {
    it('should report non-operational errors to Sentry', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new AppError('Non-op error', 500, 'NON_OP', false);

      errorHandler(error, req, res, mockNext);

      expect(mockAddBreadcrumb).toHaveBeenCalledWith({
        category: 'http',
        message: 'POST /api/test',
        level: 'info',
        data: { requestId: 'req-123', statusCode: 500 },
      });

      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        tags: {
          requestId: 'req-123',
          path: '/api/test',
          method: 'POST',
          errorCode: 'NON_OP',
        },
        extra: {
          isOperational: false,
          query: {},
          body: undefined,
        },
      });
    });

    it('should report 500+ AppErrors to Sentry even if operational', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new AppError('Server error', 500, 'SERVER_ERROR', true);

      errorHandler(error, req, res, mockNext);

      expect(mockCaptureException).toHaveBeenCalled();
    });

    it('should NOT report operational 4xx errors to Sentry', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new AppError('Bad request', 400, 'BAD_REQUEST', true);

      errorHandler(error, req, res, mockNext);

      expect(mockCaptureException).not.toHaveBeenCalled();
      expect(mockAddBreadcrumb).not.toHaveBeenCalled();
    });

    it('should report generic errors to Sentry', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new Error('Unexpected crash');

      errorHandler(error, req, res, mockNext);

      expect(mockCaptureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            errorCode: 'INTERNAL_ERROR',
          }),
        })
      );
    });

    it('should include body indicator when body is present', () => {
      const req = createMockRequest({ body: { email: 'test@test.com' } });
      const res = createMockResponse();
      const error = new Error('Error with body');

      errorHandler(error, req, res, mockNext);

      expect(mockCaptureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: expect.objectContaining({
            body: '[PRESENT]',
          }),
        })
      );
    });
  });

  describe('development mode details', () => {
    it('should include stack trace in development mode', () => {
      mockIsDev = true;
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new Error('Dev error');

      errorHandler(error, req, res, mockNext);

      const response = res.jsonData as { error: { details?: { stack: string; name: string } } };
      expect(response.error.details).toBeDefined();
      expect(response.error.details?.stack).toContain('Error: Dev error');
      expect(response.error.details?.name).toBe('Error');
    });

    it('should NOT include stack trace in production mode', () => {
      mockIsDev = false;
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new Error('Prod error');

      errorHandler(error, req, res, mockNext);

      const response = res.jsonData as { error: { details?: unknown } };
      expect(response.error.details).toBeUndefined();
    });
  });

  describe('status code determination', () => {
    it('should use statusCode from AppError', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      errorHandler(new AppError('Forbidden', 403, 'FORBIDDEN'), req, res, mockNext);
      expect(res.statusCode).toBe(403);

      const res2 = createMockResponse();
      errorHandler(new AppError('Not found', 404, 'NOT_FOUND'), req, res2, mockNext);
      expect(res2.statusCode).toBe(404);

      const res3 = createMockResponse();
      errorHandler(new AppError('Conflict', 409, 'CONFLICT'), req, res3, mockNext);
      expect(res3.statusCode).toBe(409);
    });

    it('should return 400 for ValidationError', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new Error('Invalid input');
      error.name = 'ValidationError';

      errorHandler(error, req, res, mockNext);

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 for UnauthorizedError', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new Error('Not authenticated');
      error.name = 'UnauthorizedError';

      errorHandler(error, req, res, mockNext);

      expect(res.statusCode).toBe(401);
    });

    it('should return 500 for generic Error', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new Error('Something went wrong');

      errorHandler(error, req, res, mockNext);

      expect(res.statusCode).toBe(500);
    });

    it('should return 500 for unknown error types', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new Error('Custom error');
      error.name = 'CustomError';

      errorHandler(error, req, res, mockNext);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('error response structure', () => {
    it('should always include success: false', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new Error('Any error');

      errorHandler(error, req, res, mockNext);

      const response = res.jsonData as { success: boolean };
      expect(response.success).toBe(false);
    });

    it('should always include requestId', () => {
      const req = createMockRequest({ requestId: 'trace-123' });
      const res = createMockResponse();
      const error = new Error('Any error');

      errorHandler(error, req, res, mockNext);

      const response = res.jsonData as { requestId: string };
      expect(response.requestId).toBe('trace-123');
    });

    it('should include error code from AppError', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new AppError('Custom code error', 400, 'CUSTOM_CODE');

      errorHandler(error, req, res, mockNext);

      const response = res.jsonData as { error: { code: string } };
      expect(response.error.code).toBe('CUSTOM_CODE');
    });
  });
});

// ===========================================
// notFoundHandler Tests
// ===========================================

describe('notFoundHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log warning with path and method', () => {
    const req = createMockRequest({ path: '/unknown/path', method: 'DELETE' });
    const res = createMockResponse();

    notFoundHandler(req, res);

    expect(mockLoggerWarn).toHaveBeenCalledWith('Route not found', {
      path: '/unknown/path',
      method: 'DELETE',
    });
  });

  it('should return 404 status', () => {
    const req = createMockRequest();
    const res = createMockResponse();

    notFoundHandler(req, res);

    expect(res.statusCode).toBe(404);
  });

  it('should return proper error structure', () => {
    const req = createMockRequest({ path: '/api/missing', method: 'PATCH' });
    const res = createMockResponse();

    notFoundHandler(req, res);

    expect(res.jsonData).toEqual({
      success: false,
      error: {
        message: 'Route PATCH /api/missing not found',
        code: 'NOT_FOUND',
      },
    });
  });

  it('should handle various HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

    for (const method of methods) {
      const req = createMockRequest({ path: '/test', method });
      const res = createMockResponse();

      notFoundHandler(req, res);

      const response = res.jsonData as { error: { message: string } };
      expect(response.error.message).toBe(`Route ${method} /test not found`);
    }
  });
});

// ===========================================
// asyncHandler Tests
// ===========================================

describe('asyncHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call the wrapped async function', async () => {
    const mockFn = vi.fn().mockResolvedValue(undefined);
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    const wrapped = asyncHandler(mockFn);
    await wrapped(req, res as Response, next);

    expect(mockFn).toHaveBeenCalledWith(req, res, next);
  });

  it('should handle successful async operations', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    const mockFn = vi.fn(async (_req: Request, response: Response) => {
      response.status(200).json({ success: true });
    });

    const wrapped = asyncHandler(mockFn);
    await wrapped(req, res as Response, next);

    expect(res.statusCode).toBe(200);
    expect(res.jsonData).toEqual({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch and pass errors to next', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();
    const testError = new Error('Async error');

    const mockFn = vi.fn().mockRejectedValue(testError);

    const wrapped = asyncHandler(mockFn);
    await wrapped(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(testError);
  });

  it('should handle sync errors thrown in async function', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();
    const syncError = new Error('Sync throw in async');

    const mockFn = vi.fn(async () => {
      throw syncError;
    });

    const wrapped = asyncHandler(mockFn);
    await wrapped(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(syncError);
  });

  it('should work with AppError', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();
    const appError = new AppError('App error in async', 422, 'VALIDATION_FAILED');

    const mockFn = vi.fn().mockRejectedValue(appError);

    const wrapped = asyncHandler(mockFn);
    await wrapped(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(appError);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
  });

  it('should return a function (middleware signature)', () => {
    const mockFn = vi.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(mockFn);

    expect(typeof wrapped).toBe('function');
    expect(wrapped.length).toBe(3); // (req, res, next)
  });

  it('should handle function that returns Promise.resolve()', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    const mockFn = vi.fn(() => Promise.resolve());

    const wrapped = asyncHandler(mockFn);
    await wrapped(req, res as Response, next);

    expect(mockFn).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle multiple sequential calls', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();
    let callCount = 0;

    const mockFn = vi.fn(async () => {
      callCount++;
    });

    const wrapped = asyncHandler(mockFn);

    await wrapped(req, res as Response, next);
    await wrapped(req, res as Response, next);
    await wrapped(req, res as Response, next);

    expect(callCount).toBe(3);
    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});

// ===========================================
// Integration Tests
// ===========================================

describe('error handling integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDev = false;
  });

  it('should work end-to-end: asyncHandler catches error, errorHandler handles it', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const capturedErrors: Error[] = [];

    const next: NextFunction = (err?: unknown) => {
      if (err instanceof Error) {
        capturedErrors.push(err);
        errorHandler(err, req, res, next);
      }
    };

    const failingHandler = asyncHandler(async () => {
      throw new AppError('Integration test error', 418, 'TEAPOT');
    });

    await failingHandler(req, res as Response, next);

    expect(capturedErrors.length).toBe(1);
    expect(capturedErrors[0]).toBeInstanceOf(AppError);
    expect(res.statusCode).toBe(418);
    expect(res.jsonData).toEqual({
      success: false,
      error: {
        message: 'Integration test error',
        code: 'TEAPOT',
      },
      requestId: 'req-123',
    });
  });
});
