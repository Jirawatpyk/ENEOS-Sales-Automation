/**
 * ENEOS Sales Automation - Error Handler Middleware
 * Centralized error handling for Express
 */

import { Request, Response, NextFunction } from 'express';
import { logger, logError } from '../utils/logger.js';
import { AppError } from '../types/index.js';
import { config } from '../config/index.js';
import { captureException, addBreadcrumb } from '../utils/sentry.js';

// ===========================================
// Error Response Interface
// ===========================================

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  requestId?: string;
}

// ===========================================
// Error Handler Middleware
// ===========================================

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Get request ID if available
  const requestId = req.requestId || 'unknown';

  // Log the error with request context
  logError(error, {
    requestId,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Determine if this is an operational error
  const isOperational = error instanceof AppError && error.isOperational;

  // Report to Sentry (only non-operational errors or important ones)
  if (!isOperational || (error instanceof AppError && error.statusCode >= 500)) {
    addBreadcrumb({
      category: 'http',
      message: `${req.method} ${req.path}`,
      level: 'info',
      data: { requestId, statusCode: error instanceof AppError ? error.statusCode : 500 },
    });

    captureException(error, {
      tags: {
        requestId,
        path: req.path,
        method: req.method,
        errorCode: error instanceof AppError ? error.code : 'INTERNAL_ERROR',
      },
      extra: {
        isOperational,
        query: req.query,
        body: req.body ? '[PRESENT]' : undefined,
      },
    });
  }

  // Build error response
  const response: ErrorResponse = {
    success: false,
    error: {
      message: isOperational ? error.message : 'An unexpected error occurred',
      code: error instanceof AppError ? error.code : 'INTERNAL_ERROR',
    },
    requestId, // Always include request ID for tracing
  };

  // Add details in development
  if (config.isDev) {
    response.error.details = {
      stack: error.stack,
      name: error.name,
    };
  }

  // Determine status code
  let statusCode = 500;
  if (error instanceof AppError) {
    statusCode = error.statusCode;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
  }

  res.status(statusCode).json(response);
}

// ===========================================
// Not Found Handler
// ===========================================

export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
  });

  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
    },
  });
}

// ===========================================
// Async Handler Wrapper
// ===========================================

/**
 * Wrapper for async route handlers
 * Automatically catches errors and passes to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
