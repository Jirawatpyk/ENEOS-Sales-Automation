/**
 * ENEOS Sales Automation - Campaign Stats Controller
 * Handles Admin Dashboard Campaign Analytics API endpoints (Story 5-2)
 *
 * Endpoints:
 * - GET /api/admin/campaigns/stats - List all campaigns with metrics
 * - GET /api/admin/campaigns/:id/stats - Single campaign detail
 * - GET /api/admin/campaigns/:id/events - Event log for campaign
 */

import { Request, Response, NextFunction } from 'express';
import { campaignLogger as logger } from '../../utils/logger.js';
import { campaignStatsService } from '../../services/campaign-stats.service.js';
import {
  safeValidateCampaignStatsQuery,
  safeValidateCampaignEventsQuery,
  safeValidateCampaignIdParam,
} from '../../validators/campaign-stats.validator.js';
import type {
  AdminApiResponse,
  CampaignStatsListResponse,
  CampaignStatsItem,
  CampaignEventsResponse,
} from '../../types/admin.types.js';

// ===========================================
// GET /api/admin/campaigns/stats
// ===========================================

/**
 * Get all campaign stats with pagination, search, and filtering
 * Implements AC1: GET /api/admin/campaigns/stats
 */
export async function getCampaignStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate query parameters
    const validation = safeValidateCampaignStatsQuery(req.query);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: validation.errors,
        },
      });
      return;
    }

    const { page, limit, search, dateFrom, dateTo, sortBy, sortOrder } = validation.data;

    logger.info('getCampaignStats called', {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      user: req.user?.email,
    });

    // Get campaign stats from service
    const result = await campaignStatsService.getAllCampaignStats({
      page,
      limit,
      search,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    });

    const response: AdminApiResponse<CampaignStatsListResponse> = {
      success: true,
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };

    logger.info('getCampaignStats completed', {
      total: result.pagination.total,
      returned: result.data.length,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('getCampaignStats failed', { error });
    next(error);
  }
}

// ===========================================
// GET /api/admin/campaigns/:id/stats
// ===========================================

/**
 * Get single campaign stats by Campaign_ID
 * Implements AC2: GET /api/admin/campaigns/:id/stats
 */
export async function getCampaignById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate campaign ID parameter
    const validation = safeValidateCampaignIdParam(req.params);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid campaign ID',
          details: validation.errors,
        },
      });
      return;
    }

    const campaignId = validation.data.id;

    logger.info('getCampaignById called', {
      campaignId,
      user: req.user?.email,
    });

    // Get campaign stats from service
    const campaign = await campaignStatsService.getCampaignStatsById(campaignId);

    if (!campaign) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found',
          details: { campaignId },
        },
      });
      return;
    }

    const response: AdminApiResponse<CampaignStatsItem> = {
      success: true,
      data: campaign,
    };

    logger.info('getCampaignById completed', { campaignId });

    res.status(200).json(response);
  } catch (error) {
    logger.error('getCampaignById failed', { error });
    next(error);
  }
}

// ===========================================
// GET /api/admin/campaigns/:id/events
// ===========================================

/**
 * Get campaign event log with pagination and filtering
 * Implements AC3: GET /api/admin/campaigns/:id/events
 */
export async function getCampaignEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate campaign ID parameter
    const idValidation = safeValidateCampaignIdParam(req.params);
    if (!idValidation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid campaign ID',
          details: idValidation.errors,
        },
      });
      return;
    }

    // Validate query parameters
    const queryValidation = safeValidateCampaignEventsQuery(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: queryValidation.errors,
        },
      });
      return;
    }

    const campaignId = idValidation.data.id;
    const { page, limit, event, dateFrom, dateTo } = queryValidation.data;

    logger.info('getCampaignEvents called', {
      campaignId,
      page,
      limit,
      event,
      user: req.user?.email,
    });

    // First check if campaign exists
    const campaign = await campaignStatsService.getCampaignStatsById(campaignId);
    if (!campaign) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Campaign not found',
          details: { campaignId },
        },
      });
      return;
    }

    // Get campaign events from service
    const result = await campaignStatsService.getCampaignEvents(campaignId, {
      page,
      limit,
      event,
      dateFrom,
      dateTo,
    });

    const response: AdminApiResponse<CampaignEventsResponse> = {
      success: true,
      data: {
        data: result.data,
        pagination: result.pagination,
      },
    };

    logger.info('getCampaignEvents completed', {
      campaignId,
      total: result.pagination.total,
      returned: result.data.length,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('getCampaignEvents failed', { error });
    next(error);
  }
}
