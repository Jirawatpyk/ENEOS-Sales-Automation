/**
 * Team Controller
 * Handles GET /api/admin/sales-team
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';
import { salesTeamService } from '../../services/sales-team.service.js';
import { AdminApiResponse } from '../../types/admin.types.js';

/**
 * GET /api/admin/sales-team
 * ดึงรายชื่อ Sales Team ทั้งหมด
 * ใช้สำหรับ Lead Filter by Owner dropdown
 */
export async function getSalesTeam(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    logger.info('getSalesTeam called', { user: req.user?.email });

    const salesTeam = await salesTeamService.getSalesTeamAll();

    // Transform to frontend format
    const teamMembers = salesTeam.map((member) => ({
      id: member.lineUserId,
      name: member.name,
      email: member.email || null,
    }));

    const response: AdminApiResponse<{ team: typeof teamMembers }> = {
      success: true,
      data: {
        team: teamMembers,
      },
    };

    logger.info('getSalesTeam completed', { count: teamMembers.length });

    res.status(200).json(response);
  } catch (error) {
    logger.error('getSalesTeam failed', { error });
    next(error);
  }
}
