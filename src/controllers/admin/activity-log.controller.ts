/**
 * Activity Log Controller (Story 7-7)
 * Handles admin endpoint for viewing activity log (Status_History)
 *
 * Endpoints:
 * - GET /api/admin/activity-log (list with filters and pagination)
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import { sheetsService } from '../../services/sheets.service.js';
import { VALID_LEAD_STATUSES } from '../../types/index.js';
import { leadRowToLeadItem } from './helpers/transform.helpers.js';

// ===========================================
// Validation Schemas
// ===========================================

/**
 * Schema for query params on GET /api/admin/activity-log
 */
const ActivityLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  from: z.string().optional(), // ISO date
  to: z.string().optional(), // ISO date
  status: z.string().optional(), // Comma-separated status values
  changedBy: z.string().optional(), // LINE User ID or 'System'
});

// ===========================================
// Controllers
// ===========================================

/**
 * GET /api/admin/activity-log
 * Get all activity log entries with pagination and filters
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - from: ISO date (start date filter)
 * - to: ISO date (end date filter)
 * - status: Comma-separated status values (e.g., 'contacted,closed')
 * - changedBy: LINE User ID or 'System'
 *
 * Access: Admin only (requireAdmin middleware)
 */
export async function getActivityLog(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.info('getActivityLog called', { user: req.user?.email, query: req.query });

    // Validate query params
    const queryResult = ActivityLogQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: queryResult.error.errors.map((e) => e.message).join(', '),
        },
      });
      return;
    }

    const { page, limit, from, to, status, changedBy } = queryResult.data;

    // Parse and validate status filter
    let statusArray: string[] | undefined;
    if (status) {
      statusArray = status.split(',').map((s) => s.trim());
      // Validate each status value
      const invalidStatuses = statusArray.filter(
        (s) => !VALID_LEAD_STATUSES.includes(s as (typeof VALID_LEAD_STATUSES)[number])
      );
      if (invalidStatuses.length > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status values: ${invalidStatuses.join(', ')}. Valid values: ${VALID_LEAD_STATUSES.join(', ')}`,
          },
        });
        return;
      }
    }

    // Fetch activity log from sheets service
    const result = await sheetsService.getAllStatusHistory({
      page,
      limit,
      from,
      to,
      status: statusArray,
      changedBy,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(result.total / limit);

    // Transform LeadRow to LeadItem for each entry
    const transformedEntries = result.entries.map((entry) => ({
      ...entry,
      lead: leadRowToLeadItem(entry.lead),
    }));

    res.status(200).json({
      success: true,
      data: {
        entries: transformedEntries,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        filters: {
          changedByOptions: result.changedByOptions,
        },
      },
    });

    logger.info('getActivityLog completed', {
      total: result.total,
      page,
      limit,
      returned: result.entries.length,
    });
  } catch (error) {
    logger.error('getActivityLog failed', { error, query: req.query });
    next(error);
  }
}
