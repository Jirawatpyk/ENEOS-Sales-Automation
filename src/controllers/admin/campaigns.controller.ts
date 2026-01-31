/**
 * Campaigns Controller
 * Handles GET /api/admin/campaigns and GET /api/admin/campaigns/:campaignId
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';
import { parseDateFromSheets, extractDateKey } from '../../utils/date-formatter.js';
import {
  AdminApiResponse,
  CampaignItem,
  CampaignsResponse,
  CampaignDetailResponse,
} from '../../types/admin.types.js';
import { LeadRow } from '../../types/index.js';
import { EXPORT } from '../../constants/admin.constants.js';
import {
  campaignsQuerySchema,
  campaignIdSchema,
  safeValidateQuery,
} from '../../validators/admin.validators.js';
import {
  parsePeriod,
  getPreviousPeriod,
  getAllLeads,
  filterByPeriod,
  countByStatus,
  calculateChange,
  getWeekNumber,
} from './helpers/index.js';

/**
 * GET /api/admin/campaigns
 * ดึงข้อมูล campaign analytics
 */
export async function getCampaigns(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validation = safeValidateQuery(campaignsQuerySchema, req.query);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'พารามิเตอร์ไม่ถูกต้อง',
          details: validation.errors,
        },
      });
      return;
    }

    const { period: periodType, startDate, endDate, sortBy, sortOrder } = validation.data;

    logger.info('getCampaigns called', {
      period: periodType,
      user: req.user?.email,
    });

    const period = parsePeriod(periodType, startDate, endDate);
    const allLeads = await getAllLeads();
    const leads = filterByPeriod(allLeads, period);

    // Group by campaign
    const AVERAGE_DEAL_SIZE = EXPORT.AVERAGE_DEAL_SIZE;

    const campaignMap = new Map<string, LeadRow[]>();
    leads.forEach((lead) => {
      if (!campaignMap.has(lead.campaignId)) {
        campaignMap.set(lead.campaignId, []);
      }
      campaignMap.get(lead.campaignId)?.push(lead);
    });

    // สร้าง campaign items
    const campaigns: CampaignItem[] = Array.from(campaignMap.entries()).map(([id, campaignLeads]) => {
      const totalLeads = campaignLeads.length;
      const claimed = campaignLeads.filter((l) => l.salesOwnerId).length;
      const contacted = campaignLeads.filter((l) => l.status === 'contacted').length;
      const closed = campaignLeads.filter((l) => l.status === 'closed').length;
      const lost = campaignLeads.filter((l) => l.status === 'lost').length;
      const unreachable = campaignLeads.filter((l) => l.status === 'unreachable').length;

      const conversionRate = totalLeads > 0 ? (closed / totalLeads) * 100 : 0;
      const claimRate = totalLeads > 0 ? (claimed / totalLeads) * 100 : 0;
      const estimatedRevenue = closed * AVERAGE_DEAL_SIZE;

      // Get earliest lead date as startDate
      const startDateCampaign = campaignLeads.reduce((earliest, lead) => {
        const leadDate = parseDateFromSheets(lead.date);
        return leadDate < earliest ? leadDate : earliest;
      }, new Date(campaignLeads[0].date));

      // Create weekly trend
      const trendMap = new Map<string, { leads: number; closed: number }>();
      campaignLeads.forEach((lead) => {
        const weekNum = getWeekNumber(parseDateFromSheets(lead.date));
        const weekKey = `W${weekNum}`;
        if (!trendMap.has(weekKey)) {
          trendMap.set(weekKey, { leads: 0, closed: 0 });
        }
        const trend = trendMap.get(weekKey);
        if (trend) {
          trend.leads++;
          if (lead.status === 'closed') {trend.closed++;}
        }
      });

      const trend = Array.from(trendMap.entries()).map(([week, data]) => ({
        week,
        leads: data.leads,
        closed: data.closed,
      }));

      return {
        id,
        name: campaignLeads[0].campaignName,
        subject: campaignLeads[0].emailSubject,
        startDate: startDateCampaign.toISOString(),
        stats: {
          leads: totalLeads,
          claimed,
          contacted,
          closed,
          lost,
          unreachable,
          conversionRate: Number(conversionRate.toFixed(2)),
          claimRate: Number(claimRate.toFixed(2)),
          estimatedRevenue,
        },
        trend,
      };
    });

    // Sort campaigns
    campaigns.sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      switch (sortBy) {
        case 'leads':
          aValue = a.stats.leads;
          bValue = b.stats.leads;
          break;
        case 'closed':
          aValue = a.stats.closed;
          bValue = b.stats.closed;
          break;
        case 'conversionRate':
          aValue = a.stats.conversionRate;
          bValue = b.stats.conversionRate;
          break;
        default:
          aValue = a.stats.closed;
          bValue = b.stats.closed;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    // Calculate totals
    const totals = {
      campaigns: campaigns.length,
      leads: campaigns.reduce((sum, c) => sum + c.stats.leads, 0),
      claimed: campaigns.reduce((sum, c) => sum + c.stats.claimed, 0),
      closed: campaigns.reduce((sum, c) => sum + c.stats.closed, 0),
      conversionRate: 0,
      estimatedRevenue: campaigns.reduce((sum, c) => sum + c.stats.estimatedRevenue, 0),
    };

    if (totals.leads > 0) {
      totals.conversionRate = Number(((totals.closed / totals.leads) * 100).toFixed(2));
    }

    // Calculate comparison with previous period
    const previousPeriod = getPreviousPeriod(period);
    const previousLeads = filterByPeriod(allLeads, previousPeriod);
    const previousLeadsCount = previousLeads.length;
    const previousClosed = previousLeads.filter((l) => l.status === 'closed').length;
    const previousConversionRate = previousLeadsCount > 0
      ? Number(((previousClosed / previousLeadsCount) * 100).toFixed(2))
      : 0;

    const comparison = {
      previousPeriod: {
        leads: previousLeadsCount,
        closed: previousClosed,
        conversionRate: previousConversionRate,
      },
      changes: {
        leads: Number(calculateChange(totals.leads, previousLeadsCount).toFixed(2)),
        closed: Number(calculateChange(totals.closed, previousClosed).toFixed(2)),
        conversionRate: Number(calculateChange(totals.conversionRate, previousConversionRate).toFixed(2)),
      },
    };

    // Top performers
    const topPerformers = campaigns
      .sort((a, b) => b.stats.conversionRate - a.stats.conversionRate)
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        name: c.name,
        conversionRate: c.stats.conversionRate,
      }));

    const response: AdminApiResponse<CampaignsResponse> = {
      success: true,
      data: {
        campaigns,
        totals,
        comparison,
        topPerformers,
        period,
      },
    };

    logger.info('getCampaigns completed', {
      totalCampaigns: campaigns.length,
      totalLeads: totals.leads,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('getCampaigns failed', { error });
    next(error);
  }
}

/**
 * GET /api/admin/campaigns/:campaignId
 * ดึงข้อมูล campaign detail
 */
export async function getCampaignDetail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validation = safeValidateQuery(campaignIdSchema, req.params);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Campaign ID ไม่ถูกต้อง',
          details: validation.errors,
        },
      });
      return;
    }

    const campaignId = validation.data.campaignId;

    logger.info('getCampaignDetail called', {
      campaignId,
      user: req.user?.email,
    });

    const allLeads = await getAllLeads();
    const campaignLeads = allLeads.filter((lead) => lead.campaignId === campaignId);

    if (campaignLeads.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'ไม่พบ Campaign ที่ต้องการ',
          details: { campaignId },
        },
      });
      return;
    }

    // Campaign info
    const campaign = {
      id: campaignId,
      name: campaignLeads[0].campaignName,
      subject: campaignLeads[0].emailSubject,
      startDate: campaignLeads.reduce((earliest, lead) => {
        const leadDate = parseDateFromSheets(lead.date);
        return leadDate < earliest ? leadDate : earliest;
      }, new Date(campaignLeads[0].date)).toISOString(),
    };

    // Stats
    const totalLeads = campaignLeads.length;
    const claimed = campaignLeads.filter((l) => l.salesOwnerId).length;
    const contacted = campaignLeads.filter((l) => l.status === 'contacted').length;
    const closed = campaignLeads.filter((l) => l.status === 'closed').length;
    const lost = campaignLeads.filter((l) => l.status === 'lost').length;
    const unreachable = campaignLeads.filter((l) => l.status === 'unreachable').length;
    const conversionRate = totalLeads > 0 ? (closed / totalLeads) * 100 : 0;
    const claimRate = totalLeads > 0 ? (claimed / totalLeads) * 100 : 0;

    const estimatedRevenue = closed * EXPORT.AVERAGE_DEAL_SIZE;

    const stats = {
      leads: totalLeads,
      claimed,
      contacted,
      closed,
      lost,
      unreachable,
      conversionRate: Number(conversionRate.toFixed(2)),
      claimRate: Number(claimRate.toFixed(2)),
      estimatedRevenue,
    };

    // Leads by status
    const leadsByStatus = countByStatus(campaignLeads);

    // Leads by sales
    const salesMap = new Map<string, { leads: LeadRow[]; name: string }>();
    campaignLeads
      .filter((lead) => lead.salesOwnerId)
      .forEach((lead) => {
        const ownerId = lead.salesOwnerId as string;
        if (!salesMap.has(ownerId)) {
          salesMap.set(ownerId, {
            leads: [],
            name: lead.salesOwnerName || 'Unknown',
          });
        }
        salesMap.get(ownerId)?.leads.push(lead);
      });

    const leadsBySales = Array.from(salesMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      count: data.leads.length,
      closed: data.leads.filter((l) => l.status === 'closed').length,
    }));

    // Daily trend
    const dailyMap = new Map<string, { claimed: number; closed: number }>();
    campaignLeads.forEach((lead) => {
      const dateKey = extractDateKey(lead.date);
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { claimed: 0, closed: 0 });
      }
      const daily = dailyMap.get(dateKey);
      if (daily) {
        if (lead.salesOwnerId) {daily.claimed++;}
        if (lead.status === 'closed') {daily.closed++;}
      }
    });

    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        claimed: data.claimed,
        closed: data.closed,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Recent leads (last 10)
    const recentLeads = campaignLeads
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map((lead) => ({
        row: lead.rowNumber,
        company: lead.company,
        status: lead.status,
        date: lead.date,
      }));

    const response: AdminApiResponse<CampaignDetailResponse> = {
      success: true,
      data: {
        campaign,
        stats,
        leadsByStatus,
        leadsBySales,
        dailyTrend,
        recentLeads,
      },
    };

    logger.info('getCampaignDetail completed', { campaignId, totalLeads });

    res.status(200).json(response);
  } catch (error) {
    logger.error('getCampaignDetail failed', { error });
    next(error);
  }
}
