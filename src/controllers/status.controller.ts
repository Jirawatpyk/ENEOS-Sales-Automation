/**
 * Status API Controller
 * Check processing status of leads
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { processingStatusService } from '../services/processing-status.service.js';

/**
 * Get processing status by correlation ID
 * GET /api/leads/status/:correlationId
 */
export function getProcessingStatus(req: Request, res: Response): void {
  const correlationId = req.params.correlationId as string;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(correlationId)) {
    res.status(400).json({
      success: false,
      error: 'Invalid correlation ID format',
      message: 'Correlation ID must be a valid UUID',
    });
    return;
  }

  logger.debug('Status check requested', { correlationId });

  const status = processingStatusService.get(correlationId);

  if (!status) {
    res.status(404).json({
      success: false,
      error: 'Status not found',
      message: 'No processing status found for this correlation ID',
      correlationId,
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: status,
  });
}

/**
 * Get all processing statuses (debug only)
 * GET /api/leads/status
 */
export function getAllProcessingStatuses(_req: Request, res: Response): void {
  logger.debug('All statuses requested');

  const statuses = processingStatusService.getAll();

  res.status(200).json({
    success: true,
    total: statuses.length,
    data: statuses,
  });
}
