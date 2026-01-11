/**
 * ENEOS Sales Automation - Request Context Middleware
 * Adds request ID tracking and timeout handling
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { AppError } from '../types/index.js';

// ===========================================
// Types
// ===========================================

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

// ===========================================
// Request ID Middleware
// ===========================================

/**
 * Adds a unique request ID to each request
 * Can be passed in header 'X-Request-ID' or auto-generated
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Use existing request ID from header or generate new one
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  req.requestId = requestId;
  req.startTime = Date.now();

  // Add to response headers for tracing
  res.setHeader('X-Request-ID', requestId);

  next();
}

// ===========================================
// Request Timeout Middleware
// ===========================================

export interface TimeoutOptions {
  /** Timeout in milliseconds (default: 30000 = 30 seconds) */
  timeoutMs?: number;
  /** Custom error message */
  message?: string;
  /** Paths to exclude from timeout */
  excludePaths?: string[];
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Request timeout middleware
 * Automatically times out requests that take too long
 */
export function timeoutMiddleware(options: TimeoutOptions = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT,
    message = 'Request timeout',
    excludePaths = [],
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip timeout for excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      next();
      return;
    }

    // Track if response has been sent
    let timedOut = false;

    // Set timeout
    const timeout = setTimeout(() => {
      timedOut = true;

      logger.warn('Request timeout', {
        requestId: req.requestId,
        path: req.path,
        method: req.method,
        timeoutMs,
        elapsedMs: Date.now() - req.startTime,
      });

      // Only send response if not already sent
      if (!res.headersSent) {
        const error = new AppError(message, 408, 'REQUEST_TIMEOUT');
        next(error);
      }
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    // Override res.json and res.send to check for timeout
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function(body: unknown) {
      if (timedOut) {
        logger.warn('Attempted to send response after timeout', {
          requestId: req.requestId,
          path: req.path,
        });
        return res;
      }
      clearTimeout(timeout);
      return originalJson(body);
    };

    res.send = function(body: unknown) {
      if (timedOut) {
        logger.warn('Attempted to send response after timeout', {
          requestId: req.requestId,
          path: req.path,
        });
        return res;
      }
      clearTimeout(timeout);
      return originalSend(body);
    };

    next();
  };
}

// ===========================================
// Response Time Logger
// ===========================================

/**
 * Logs response time when request completes
 */
export function responseTimeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;

    // Log slow requests (> 5 seconds)
    if (duration > 5000) {
      logger.warn('Slow request detected', {
        requestId: req.requestId,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        durationMs: duration,
      });
    }
  });

  next();
}
