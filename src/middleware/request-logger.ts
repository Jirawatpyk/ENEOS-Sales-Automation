/**
 * ENEOS Sales Automation - Request Logger Middleware
 * HTTP request/response logging
 */

import { Request, Response, NextFunction } from 'express';
import { logRequest } from '../utils/logger.js';

// ===========================================
// Request Logger Middleware
// ===========================================

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logRequest({
      method: req.method,
      path: req.path,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      duration,
      statusCode: res.statusCode,
    });
  });

  next();
}
