/**
 * Team Management Controller (Story 7-4)
 * Handles admin endpoints for managing Sales Team members
 *
 * Endpoints:
 * - GET /api/admin/sales-team (list with filters)
 * - GET /api/admin/sales-team/:lineUserId (single member)
 * - PATCH /api/admin/sales-team/:lineUserId (update member)
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import { sheetsService } from '../../services/sheets.service.js';
import { SalesTeamFilter, SalesTeamMemberUpdate } from '../../types/index.js';

// ===========================================
// Validation Schemas
// ===========================================

/**
 * Schema for query params on GET /api/admin/sales-team
 */
const ListQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'all']).optional(),
  role: z.enum(['admin', 'sales', 'all']).optional(),
});

/**
 * Schema for PATCH /api/admin/sales-team/:lineUserId body
 * Email must be @eneos.co.th domain or null (to clear)
 */
const UpdateMemberSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .refine(
      (val) => val.endsWith('@eneos.co.th'),
      { message: 'Must be @eneos.co.th email' }
    )
    .nullable()
    .optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(['admin', 'sales']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// ===========================================
// Controllers
// ===========================================

/**
 * GET /api/admin/sales-team
 * List all sales team members with optional filters
 *
 * Query params:
 * - status: active | inactive | all (default: active)
 * - role: admin | sales | all (default: all)
 *
 * Access: Admin only (requireAdmin middleware)
 */
export async function getSalesTeamList(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.info('getSalesTeamList called', { user: req.user?.email, query: req.query });

    // Validate query params
    const queryResult = ListQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      res.status(400).json({
        success: false,
        error: queryResult.error.errors.map((e) => e.message).join(', '),
      });
      return;
    }

    // Build filter - default status to 'active'
    const filter: SalesTeamFilter = {
      status: queryResult.data.status || 'active',
      role: queryResult.data.role,
    };

    const members = await sheetsService.getAllSalesTeamMembers(filter);

    res.status(200).json({
      success: true,
      data: members,
      total: members.length,
    });

    logger.info('getSalesTeamList completed', { count: members.length });
  } catch (error) {
    logger.error('getSalesTeamList failed', { error });
    next(error);
  }
}

/**
 * GET /api/admin/sales-team/:lineUserId
 * Get a single sales team member by LINE User ID
 *
 * Params:
 * - lineUserId: LINE User ID
 *
 * Access: Admin only (requireAdmin middleware)
 */
export async function getSalesTeamMemberById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const lineUserId = req.params.lineUserId as string;
    logger.info('getSalesTeamMemberById called', { lineUserId, user: req.user?.email });

    const member = await sheetsService.getSalesTeamMemberById(lineUserId);

    if (!member) {
      res.status(404).json({
        success: false,
        error: 'Sales team member not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: member,
    });

    logger.info('getSalesTeamMemberById completed', { lineUserId });
  } catch (error) {
    logger.error('getSalesTeamMemberById failed', { error, lineUserId: req.params.lineUserId });
    next(error);
  }
}

/**
 * PATCH /api/admin/sales-team/:lineUserId
 * Update a sales team member's details
 *
 * Params:
 * - lineUserId: LINE User ID
 *
 * Body (all optional):
 * - email: string | null (must be @eneos.co.th if string)
 * - phone: string | null
 * - role: 'admin' | 'sales'
 * - status: 'active' | 'inactive'
 *
 * Access: Admin only (requireAdmin middleware)
 */
export async function updateSalesTeamMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const lineUserId = req.params.lineUserId as string;
    logger.info('updateSalesTeamMember called', {
      lineUserId,
      body: req.body,
      user: req.user?.email,
    });

    // Validate request body
    const bodyResult = UpdateMemberSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({
        success: false,
        error: bodyResult.error.errors.map((e) => e.message).join(', '),
      });
      return;
    }

    // Build updates object - only include fields that were provided
    const updates: SalesTeamMemberUpdate = {};
    if (bodyResult.data.email !== undefined) {
      updates.email = bodyResult.data.email;
    }
    if (bodyResult.data.phone !== undefined) {
      updates.phone = bodyResult.data.phone;
    }
    if (bodyResult.data.role !== undefined) {
      updates.role = bodyResult.data.role;
    }
    if (bodyResult.data.status !== undefined) {
      updates.status = bodyResult.data.status;
    }

    const updated = await sheetsService.updateSalesTeamMember(lineUserId, updates);

    if (!updated) {
      res.status(404).json({
        success: false,
        error: 'Sales team member not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updated,
    });

    logger.info('updateSalesTeamMember completed', { lineUserId, updates });
  } catch (error) {
    logger.error('updateSalesTeamMember failed', {
      error,
      lineUserId: req.params.lineUserId,
    });
    next(error);
  }
}
