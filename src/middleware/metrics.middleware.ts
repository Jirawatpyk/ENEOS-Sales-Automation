/**
 * ENEOS Sales Automation - Metrics Middleware
 * Prometheus metrics collection for HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import {
  httpRequestDuration,
  httpRequestTotal,
  httpActiveRequests,
} from '../utils/metrics.js';

/**
 * Normalize route path for metrics labels
 * Replaces dynamic segments with placeholders
 */
function normalizeRoute(req: Request): string {
  let route = req.route?.path || req.path;

  // Replace common dynamic segments
  route = route
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/gi, '/:uuid')
    .replace(/\/[a-f0-9]{24}/gi, '/:objectId');

  // Add method prefix for better grouping
  return route || 'unknown';
}

/**
 * Middleware to collect HTTP request metrics
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip metrics endpoint itself
  if (req.path === '/metrics') {
    next();
    return;
  }

  const startTime = Date.now();

  // Track active requests
  httpActiveRequests.inc();

  // Capture response finish
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const route = normalizeRoute(req);
    const statusCode = res.statusCode.toString();

    // Record duration histogram
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      duration
    );

    // Increment request counter
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    // Decrement active requests
    httpActiveRequests.dec();
  });

  next();
}
