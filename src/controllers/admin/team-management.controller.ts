/**
 * Team Management Controller (Story 7-4 + 7-4b)
 * Handles admin endpoints for managing Sales Team members
 *
 * Endpoints:
 * - GET /api/admin/sales-team (list with filters)
 * - GET /api/admin/sales-team/:lineUserId (single member)
 * - PATCH /api/admin/sales-team/:lineUserId (update member)
 * - POST /api/admin/sales-team (create member) [7-4b]
 * - GET /api/admin/sales-team/unlinked-line-accounts (list unlinked) [7-4b]
 * - PATCH /api/admin/sales-team/email/:email/link (link LINE account) [7-4b]
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';
import {
  getAllSalesTeamMembers,
  getSalesTeamMemberById as getSalesTeamMemberByIdService,
  updateSalesTeamMember as updateSalesTeamMemberService,
  createSalesTeamMember as createSalesTeamMemberService,
  getUnlinkedLINEAccounts as getUnlinkedLINEAccountsService,
  linkLINEAccount as linkLINEAccountService,
  getUnlinkedDashboardMembers as getUnlinkedDashboardMembersService,
} from '../../services/sales-team.service.js';
import { formatPhone } from '../../utils/phone-formatter.js';
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

/**
 * Schema for POST /api/admin/sales-team body (Story 7-4b)
 * Create new member with email required
 * Phone accepts various Thai formats: 0812345678, 081-234-5678, 081 234 5678
 */
const CreateMemberSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(2, 'Name is required'),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .refine(
      (val) => val.endsWith('@eneos.co.th'),
      { message: 'Must be @eneos.co.th email' }
    ),
  phone: z
    .string()
    .refine((val) => {
      const digitsOnly = val.replace(/[\s-]/g, '');
      return /^0[689]\d{8}$/.test(digitsOnly);
    }, 'Invalid Thai phone number format (must be 10 digits starting with 06/08/09)')
    .optional()
    .or(z.literal('')),
  role: z.enum(['admin', 'sales'], {
    required_error: 'Role is required',
  }),
});

/**
 * Schema for PATCH /api/admin/sales-team/email/:email/link body (Story 7-4b)
 * Link a LINE account to a Dashboard member
 */
const LinkLINEAccountSchema = z.object({
  targetLineUserId: z.string({ required_error: 'targetLineUserId is required' }).min(1),
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

    const members = await getAllSalesTeamMembers(filter);

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

    const member = await getSalesTeamMemberByIdService(lineUserId);

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

    const updated = await updateSalesTeamMemberService(lineUserId, updates);

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

/**
 * POST /api/admin/sales-team (Story 7-4b)
 * Create a new sales team member manually
 *
 * Body:
 * - name: string (required, min 2 chars)
 * - email: string (required, must be @eneos.co.th)
 * - phone: string (optional, Thai format 0[689]XXXXXXXX)
 * - role: 'admin' | 'sales' (required)
 *
 * Access: Admin only (requireAdmin middleware)
 */
export async function createSalesTeamMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.info('createSalesTeamMember called', { body: req.body, user: req.user?.email });

    // Validate request body
    const bodyResult = CreateMemberSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({
        success: false,
        error: bodyResult.error.errors.map((e) => e.message).join(', '),
      });
      return;
    }

    // Normalize phone number if provided (Task 1.5)
    let normalizedPhone: string | undefined = undefined;
    if (bodyResult.data.phone && bodyResult.data.phone !== '') {
      normalizedPhone = formatPhone(bodyResult.data.phone);
    }

    // Create member via sales team service
    const memberData = {
      name: bodyResult.data.name,
      email: bodyResult.data.email,
      phone: normalizedPhone,
      role: bodyResult.data.role,
    };

    const createdMember = await createSalesTeamMemberService(memberData);

    res.status(201).json({
      success: true,
      data: createdMember,
    });

    logger.info('createSalesTeamMember completed', {
      email: createdMember.email,
      role: createdMember.role,
    });
  } catch (error) {
    logger.error('createSalesTeamMember failed', { error, body: req.body });

    // Map service error names to proper HTTP status codes (AC#6)
    if (error instanceof Error && error.name === 'DUPLICATE_EMAIL') {
      res.status(409).json({ success: false, error: error.message });
      return;
    }

    next(error);
  }
}

/**
 * GET /api/admin/sales-team/unlinked-line-accounts (Story 7-4b)
 * Get all LINE accounts that are not linked to any Dashboard member
 *
 * Returns LINE accounts where:
 * - LINE_User_ID is not null (LINE account exists)
 * - No Dashboard member has this LINE_User_ID (unlinked)
 *
 * Access: Admin only (requireAdmin middleware)
 */
export async function getUnlinkedLINEAccounts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.info('getUnlinkedLINEAccounts called', { user: req.user?.email });

    const unlinkedAccounts = await getUnlinkedLINEAccountsService();

    res.status(200).json({
      success: true,
      data: unlinkedAccounts,
      total: unlinkedAccounts.length,
    });

    logger.info('getUnlinkedLINEAccounts completed', { count: unlinkedAccounts.length });
  } catch (error) {
    logger.error('getUnlinkedLINEAccounts failed', { error });
    next(error);
  }
}

/**
 * PATCH /api/admin/sales-team/email/:email/link (Story 7-4b)
 * Link a LINE account to a Dashboard member
 *
 * Params:
 * - email: Dashboard member's email (identifier)
 *
 * Body:
 * - targetLineUserId: LINE User ID to link
 *
 * Access: Admin only (requireAdmin middleware)
 */
export async function linkLINEAccount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const email = req.params.email as string;
    logger.info('linkLINEAccount called', { email, body: req.body, user: req.user?.email });

    // Validate request body
    const bodyResult = LinkLINEAccountSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({
        success: false,
        error: bodyResult.error.errors.map((e) => e.message).join(', '),
      });
      return;
    }

    const { targetLineUserId } = bodyResult.data;

    // Link the LINE account
    const updatedMember = await linkLINEAccountService(email, targetLineUserId);

    if (!updatedMember) {
      res.status(404).json({
        success: false,
        error: 'Dashboard member not found or already linked',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: updatedMember,
    });

    logger.info('linkLINEAccount completed', { email, targetLineUserId });
  } catch (error) {
    logger.error('linkLINEAccount failed', { error, email: req.params.email });

    // Map service error names to proper HTTP status codes (AC#11, AC#15)
    if (error instanceof Error) {
      if (error.name === 'ALREADY_LINKED' || error.name === 'LINK_FAILED') {
        res.status(409).json({ success: false, error: error.message });
        return;
      }
    }

    next(error);
  }
}

/**
 * GET /api/admin/sales-team/unlinked-dashboard-members (Story 7-4b)
 * Get Dashboard members without LINE accounts (for reverse linking modal)
 *
 * Returns members with email not null and lineUserId null
 *
 * Access: Admin only (requireAdmin middleware)
 */
export async function getUnlinkedDashboardMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.info('getUnlinkedDashboardMembers called', { user: req.user?.email });

    const unlinkedMembers = await getUnlinkedDashboardMembersService();

    res.status(200).json({
      success: true,
      data: unlinkedMembers,
      total: unlinkedMembers.length,
    });

    logger.info('getUnlinkedDashboardMembers completed', { count: unlinkedMembers.length });
  } catch (error) {
    logger.error('getUnlinkedDashboardMembers failed', { error });
    next(error);
  }
}
