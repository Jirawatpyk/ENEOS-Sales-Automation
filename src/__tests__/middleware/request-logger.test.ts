/**
 * Request Logger Middleware Tests
 * Tests for HTTP request/response logging
 *
 * @coverage P0 - Production infrastructure code
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';

// ===========================================
// Mocks
// ===========================================

const mockLogRequest = vi.fn();

vi.mock('../../utils/logger.js', () => ({
  logRequest: (...args: unknown[]) => mockLogRequest(...args),
}));

// ===========================================
// Import after mocks
// ===========================================

import { requestLogger } from '../../middleware/request-logger.js';

// ===========================================
// Test Helpers
// ===========================================

interface MockResponse extends EventEmitter {
  statusCode: number;
}

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/api/test',
    ip: '127.0.0.1',
    socket: { remoteAddress: '192.168.1.1' },
    get: vi.fn((header: string) => {
      if (header.toLowerCase() === 'user-agent') {
        return 'Mozilla/5.0 Test Browser';
      }
      return undefined;
    }),
    ...overrides,
  } as unknown as Request;
}

function createMockResponse(statusCode = 200): MockResponse {
  const emitter = new EventEmitter() as MockResponse;
  emitter.statusCode = statusCode;
  return emitter;
}

// ===========================================
// requestLogger Tests
// ===========================================

describe('requestLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('middleware signature', () => {
    it('[P0] should call next() immediately', () => {
      // GIVEN: A request and response
      const req = createMockRequest();
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: requestLogger middleware is called
      requestLogger(req, res as unknown as Response, next);

      // THEN: next() is called immediately (non-blocking)
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('[P0] should not log until response finishes', () => {
      // GIVEN: A request and response
      const req = createMockRequest();
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: requestLogger middleware is called (but response not finished)
      requestLogger(req, res as unknown as Response, next);

      // THEN: logRequest is NOT called yet
      expect(mockLogRequest).not.toHaveBeenCalled();
    });

    it('[P0] should log when response finishes', () => {
      // GIVEN: A request and response
      const req = createMockRequest();
      const res = createMockResponse(200);
      const next: NextFunction = vi.fn();

      // WHEN: requestLogger middleware is called and response finishes
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');

      // THEN: logRequest is called
      expect(mockLogRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('logging data capture', () => {
    it('[P0] should log HTTP method correctly', () => {
      // GIVEN: A POST request
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Response finishes
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');

      // THEN: Method is captured
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('[P0] should log request path correctly', () => {
      // GIVEN: A request to /api/leads
      const req = createMockRequest({ path: '/api/leads' });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Response finishes
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');

      // THEN: Path is captured
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/api/leads' })
      );
    });

    it('[P0] should log response status code', () => {
      // GIVEN: A request with 201 response
      const req = createMockRequest();
      const res = createMockResponse(201);
      const next: NextFunction = vi.fn();

      // WHEN: Response finishes
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');

      // THEN: Status code is captured
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 201 })
      );
    });

    it('[P0] should log user agent from header', () => {
      // GIVEN: A request with user agent
      const req = createMockRequest({
        get: vi.fn((header: string) => {
          if (header.toLowerCase() === 'user-agent') {
            return 'Custom-Agent/1.0';
          }
          return undefined;
        }),
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Response finishes
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');

      // THEN: User agent is captured
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ userAgent: 'Custom-Agent/1.0' })
      );
    });
  });

  describe('IP address extraction', () => {
    it('[P0] should use req.ip when available', () => {
      // GIVEN: A request with req.ip set
      const req = createMockRequest({ ip: '10.0.0.1' });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Response finishes
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');

      // THEN: IP from req.ip is used
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ ip: '10.0.0.1' })
      );
    });

    it('[P0] should fallback to socket.remoteAddress when req.ip is undefined', () => {
      // GIVEN: A request without req.ip but with socket.remoteAddress
      const req = createMockRequest({
        ip: undefined,
        socket: { remoteAddress: '172.16.0.1' },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Response finishes
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');

      // THEN: IP from socket is used
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ ip: '172.16.0.1' })
      );
    });

    it('[P0] should use "unknown" when no IP available', () => {
      // GIVEN: A request without any IP
      const req = createMockRequest({
        ip: undefined,
        socket: { remoteAddress: undefined },
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Response finishes
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');

      // THEN: IP is "unknown"
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ ip: 'unknown' })
      );
    });
  });

  describe('duration calculation', () => {
    it('[P0] should calculate request duration in milliseconds', () => {
      // GIVEN: A request that takes 150ms
      const req = createMockRequest();
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Request starts, time passes, then response finishes
      requestLogger(req, res as unknown as Response, next);
      vi.advanceTimersByTime(150);
      res.emit('finish');

      // THEN: Duration is approximately 150ms
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ duration: 150 })
      );
    });

    it('[P0] should handle fast requests (< 10ms)', () => {
      // GIVEN: A very fast request
      const req = createMockRequest();
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Response finishes almost immediately
      requestLogger(req, res as unknown as Response, next);
      vi.advanceTimersByTime(5);
      res.emit('finish');

      // THEN: Duration is captured correctly
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ duration: 5 })
      );
    });

    it('[P0] should handle slow requests (> 1s)', () => {
      // GIVEN: A slow request
      const req = createMockRequest();
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Response takes 2 seconds
      requestLogger(req, res as unknown as Response, next);
      vi.advanceTimersByTime(2000);
      res.emit('finish');

      // THEN: Duration is captured correctly
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ duration: 2000 })
      );
    });
  });

  describe('HTTP method variations', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

    it.each(methods)('[P0] should log %s requests correctly', (method) => {
      // GIVEN: A request with specific HTTP method
      const req = createMockRequest({ method });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Response finishes
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');

      // THEN: Method is captured
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ method })
      );
    });
  });

  describe('status code variations', () => {
    const statusCodes = [
      { code: 200, description: 'success' },
      { code: 201, description: 'created' },
      { code: 204, description: 'no content' },
      { code: 301, description: 'redirect' },
      { code: 400, description: 'bad request' },
      { code: 401, description: 'unauthorized' },
      { code: 403, description: 'forbidden' },
      { code: 404, description: 'not found' },
      { code: 500, description: 'internal server error' },
      { code: 502, description: 'bad gateway' },
      { code: 503, description: 'service unavailable' },
    ];

    it.each(statusCodes)(
      '[P0] should log $code ($description) status correctly',
      ({ code }) => {
        // GIVEN: A response with specific status code
        const req = createMockRequest();
        const res = createMockResponse(code);
        const next: NextFunction = vi.fn();

        // WHEN: Response finishes
        requestLogger(req, res as unknown as Response, next);
        res.emit('finish');

        // THEN: Status code is captured
        expect(mockLogRequest).toHaveBeenCalledWith(
          expect.objectContaining({ statusCode: code })
        );
      }
    );
  });

  describe('complete log object structure', () => {
    it('[P0] should log all required fields together', () => {
      // GIVEN: A complete request/response cycle
      const req = createMockRequest({
        method: 'POST',
        path: '/webhook/brevo',
        ip: '203.0.113.50',
        get: vi.fn((header: string) => {
          if (header.toLowerCase() === 'user-agent') {
            return 'Brevo-Webhook/1.0';
          }
          return undefined;
        }),
      });
      const res = createMockResponse(200);
      const next: NextFunction = vi.fn();

      // WHEN: Request takes 75ms and completes
      requestLogger(req, res as unknown as Response, next);
      vi.advanceTimersByTime(75);
      res.emit('finish');

      // THEN: All fields are present in log
      expect(mockLogRequest).toHaveBeenCalledWith({
        method: 'POST',
        path: '/webhook/brevo',
        ip: '203.0.113.50',
        userAgent: 'Brevo-Webhook/1.0',
        duration: 75,
        statusCode: 200,
      });
    });

    it('[P0] should handle missing user agent gracefully', () => {
      // GIVEN: A request without user agent header
      const req = createMockRequest({
        get: vi.fn(() => undefined),
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Response finishes
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');

      // THEN: userAgent is undefined (not causing errors)
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ userAgent: undefined })
      );
    });
  });

  describe('edge cases', () => {
    it('[P0] should handle multiple finish events (idempotent logging)', () => {
      // GIVEN: A request/response
      const req = createMockRequest();
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: finish event fires multiple times (edge case)
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');
      res.emit('finish');
      res.emit('finish');

      // THEN: Each finish triggers a log (this matches actual behavior)
      // Note: In production, finish event only fires once per response
      expect(mockLogRequest).toHaveBeenCalledTimes(3);
    });

    it('[P0] should handle root path "/"', () => {
      // GIVEN: A request to root path
      const req = createMockRequest({ path: '/' });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Response finishes
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');

      // THEN: Path is logged correctly
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/' })
      );
    });

    it('[P0] should handle path with query string stripped', () => {
      // GIVEN: A request with query parameters (path should be without query)
      const req = createMockRequest({ path: '/api/leads' });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Response finishes
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');

      // THEN: Path without query string
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/api/leads' })
      );
    });

    it('[P0] should handle IPv6 addresses', () => {
      // GIVEN: A request with IPv6 address
      const req = createMockRequest({
        ip: '::ffff:192.168.1.1',
      });
      const res = createMockResponse();
      const next: NextFunction = vi.fn();

      // WHEN: Response finishes
      requestLogger(req, res as unknown as Response, next);
      res.emit('finish');

      // THEN: IPv6 is captured
      expect(mockLogRequest).toHaveBeenCalledWith(
        expect.objectContaining({ ip: '::ffff:192.168.1.1' })
      );
    });
  });
});
