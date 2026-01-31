/**
 * Sales Performance Controller
 * Handles GET /api/admin/sales-performance and GET /api/admin/sales-performance/trend
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';
import { sheetsService } from '../../services/sheets.service.js';
import { parseDateFromSheets } from '../../utils/date-formatter.js';
import {
  AdminApiResponse,
  SalesPerformanceResponse,
  SalesPerformanceTrendResponse,
  DailyMetric,
  SalesTeamMember,
  SalesStats,
  SalesTarget,
  SalesTrendItem,
  SalesTeamTotals,
  SalesComparison,
} from '../../types/admin.types.js';
import { LeadRow } from '../../types/index.js';
import { DEFAULT_TARGETS } from '../../constants/admin.constants.js';
import {
  salesPerformanceQuerySchema,
  salesPerformanceTrendQuerySchema,
  safeValidateQuery,
} from '../../validators/admin.validators.js';
import {
  parsePeriod,
  getPreviousPeriod,
  getAllLeads,
  filterByPeriod,
  calculateChange,
  getMinutesBetween,
  getWeekNumber,
} from './helpers/index.js';

/**
 * GET /api/admin/sales-performance
 * ดึงข้อมูล team performance
 */
export async function getSalesPerformance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate query parameters
    const validation = safeValidateQuery(salesPerformanceQuerySchema, req.query);
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

    logger.info('getSalesPerformance called', {
      period: periodType,
      user: req.user?.email,
    });

    const period = parsePeriod(periodType, startDate, endDate);

    // ดึง leads ในช่วงเวลาที่กำหนด
    const allLeads = await getAllLeads();
    const leads = filterByPeriod(allLeads, period);

    // Group by sales owner
    const salesMap = new Map<string, LeadRow[]>();
    leads
      .filter((lead) => lead.salesOwnerId)
      .forEach((lead) => {
        const ownerId = lead.salesOwnerId as string;
        if (!salesMap.has(ownerId)) {
          salesMap.set(ownerId, []);
        }
        salesMap.get(ownerId)?.push(lead);
      });

    // สร้าง team members array
    const team: SalesTeamMember[] = [];

    for (const [salesId, salesLeads] of salesMap.entries()) {
      const claimed = salesLeads.length;
      const contacted = salesLeads.filter((l) => l.status === 'contacted').length;
      const closed = salesLeads.filter((l) => l.status === 'closed').length;
      const lost = salesLeads.filter((l) => l.status === 'lost').length;
      const unreachable = salesLeads.filter((l) => l.status === 'unreachable').length;

      const conversionRate = claimed > 0 ? (closed / claimed) * 100 : 0;

      // คำนวณ avg response time (นาที)
      const responseTimes = salesLeads
        .filter((l) => l.contactedAt)
        .map((l) => getMinutesBetween(l.date, l.contactedAt as string))
        .filter((t) => t > 0);

      const avgResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
          : 0;

      // คำนวณ avg closing time (นาที)
      const closingTimes = salesLeads
        .filter((l) => l.closedAt && l.contactedAt)
        .map((l) => getMinutesBetween(l.contactedAt as string, l.closedAt as string))
        .filter((t) => t > 0);

      const avgClosingTime =
        closingTimes.length > 0
          ? closingTimes.reduce((sum, t) => sum + t, 0) / closingTimes.length
          : 0;

      const stats: SalesStats = {
        claimed,
        contacted,
        closed,
        lost,
        unreachable,
        conversionRate: Number(conversionRate.toFixed(2)),
        avgResponseTime: Math.round(avgResponseTime),
        avgClosingTime: Math.round(avgClosingTime),
      };

      // Default target
      const target: SalesTarget = {
        claimed: DEFAULT_TARGETS.CLAIMED_PER_MONTH,
        closed: DEFAULT_TARGETS.CLOSED_PER_MONTH,
        progress: Math.min(100, (closed / DEFAULT_TARGETS.CLOSED_PER_MONTH) * 100),
      };

      // สร้าง trend (weekly)
      const trendMap = new Map<string, number>();
      salesLeads
        .filter((l) => l.closedAt)
        .forEach((l) => {
          const weekNum = getWeekNumber(new Date(l.closedAt as string));
          const weekKey = `W${weekNum}`;
          trendMap.set(weekKey, (trendMap.get(weekKey) || 0) + 1);
        });

      const trend: SalesTrendItem[] = Array.from(trendMap.entries()).map(([week, closed]) => ({
        week,
        closed,
      }));

      // ดึงข้อมูล sales member
      const salesMember = await sheetsService.getSalesTeamMember(salesId);

      team.push({
        id: salesId,
        name: salesMember?.name || salesLeads[0]?.salesOwnerName || 'Unknown',
        email: salesMember?.email || '',
        phone: salesMember?.phone || '',
        avatar: undefined,
        stats,
        target,
        trend,
      });
    }

    // Sort team by specified field
    team.sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      switch (sortBy) {
        case 'claimed':
          aValue = a.stats.claimed;
          bValue = b.stats.claimed;
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

    // คำนวณ totals
    const totals: SalesTeamTotals = {
      teamSize: team.length,
      claimed: team.reduce((sum, t) => sum + t.stats.claimed, 0),
      contacted: team.reduce((sum, t) => sum + t.stats.contacted, 0),
      closed: team.reduce((sum, t) => sum + t.stats.closed, 0),
      lost: team.reduce((sum, t) => sum + t.stats.lost, 0),
      unreachable: team.reduce((sum, t) => sum + t.stats.unreachable, 0),
      conversionRate: 0,
      avgResponseTime: 0,
      avgClosingTime: 0,
    };

    if (totals.claimed > 0) {
      totals.conversionRate = Number(((totals.closed / totals.claimed) * 100).toFixed(2));
    }

    if (team.length > 0) {
      totals.avgResponseTime = Math.round(
        team.reduce((sum, t) => sum + t.stats.avgResponseTime, 0) / team.length
      );
      totals.avgClosingTime = Math.round(
        team.reduce((sum, t) => sum + t.stats.avgClosingTime, 0) / team.length
      );
    }

    // คำนวณ comparison กับช่วงก่อนหน้า
    const previousPeriod = getPreviousPeriod(period);
    const previousLeads = filterByPeriod(allLeads, previousPeriod);
    const previousClaimed = previousLeads.filter((l) => l.salesOwnerId).length;
    const previousClosed = previousLeads.filter((l) => l.status === 'closed').length;
    const previousConversionRate = previousClaimed > 0
      ? Number(((previousClosed / previousClaimed) * 100).toFixed(2))
      : 0;

    const comparison: SalesComparison = {
      previousPeriod: {
        claimed: previousClaimed,
        closed: previousClosed,
        conversionRate: previousConversionRate,
      },
      changes: {
        claimed: Number(calculateChange(totals.claimed, previousClaimed).toFixed(2)),
        closed: Number(calculateChange(totals.closed, previousClosed).toFixed(2)),
        conversionRate: Number(calculateChange(totals.conversionRate, previousConversionRate).toFixed(2)),
      },
    };

    const response: AdminApiResponse<SalesPerformanceResponse> = {
      success: true,
      data: {
        period,
        team,
        totals,
        comparison,
      },
    };

    logger.info('getSalesPerformance completed', {
      teamSize: team.length,
      totalClosed: totals.closed,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('getSalesPerformance failed', { error });
    next(error);
  }
}

/**
 * GET /api/admin/sales-performance/trend
 * ดึงข้อมูล daily trend สำหรับแต่ละ salesperson
 */
export async function getSalesPerformanceTrend(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate query parameters
    const validation = safeValidateQuery(salesPerformanceTrendQuerySchema, req.query);
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

    const { userId, days: daysParam } = validation.data;
    const days = daysParam ?? 30;

    logger.info('getSalesPerformanceTrend called', {
      userId,
      days,
      user: req.user?.email,
    });

    // คำนวณ period
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // ดึง leads ทั้งหมด
    const allLeads = await getAllLeads();

    // Filter leads ในช่วงเวลาที่กำหนด
    const leadsInPeriod = allLeads.filter((lead) => {
      const leadDate = parseDateFromSheets(lead.date);
      return leadDate && leadDate >= startDate && leadDate <= now;
    });

    // สร้าง daily map สำหรับ user นี้
    const userDailyMap = new Map<string, { claimed: number; contacted: number; closed: number }>();

    // สร้าง daily map สำหรับ team average
    const teamDailyMap = new Map<string, { claimed: number; contacted: number; closed: number; userCount: Set<string> }>();

    // Initialize all days in the period
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      userDailyMap.set(dateKey, { claimed: 0, contacted: 0, closed: 0 });
      teamDailyMap.set(dateKey, { claimed: 0, contacted: 0, closed: 0, userCount: new Set() });
    }

    // Process leads
    leadsInPeriod.forEach((lead) => {
      const leadDate = parseDateFromSheets(lead.date);
      if (!leadDate) {
        return;
      }

      const dateKey = leadDate.toISOString().split('T')[0];

      // Skip if date is not in our range
      if (!userDailyMap.has(dateKey)) {
        return;
      }

      // Update user data (filter by userId)
      if (lead.salesOwnerId === userId) {
        const userDay = userDailyMap.get(dateKey);
        if (userDay) {
          userDay.claimed++;
          if (lead.status === 'contacted') {
            userDay.contacted++;
          }
          if (lead.status === 'closed') {
            userDay.closed++;
          }
        }
      }

      // Update team data (all users with salesOwnerId)
      if (lead.salesOwnerId) {
        const teamDay = teamDailyMap.get(dateKey);
        if (teamDay) {
          teamDay.claimed++;
          teamDay.userCount.add(lead.salesOwnerId);
          if (lead.status === 'contacted') {
            teamDay.contacted++;
          }
          if (lead.status === 'closed') {
            teamDay.closed++;
          }
        }
      }
    });

    // Convert to arrays sorted by date (ascending)
    const sortedDates = Array.from(userDailyMap.keys()).sort();

    const dailyData: DailyMetric[] = sortedDates.map((date) => {
      const day = userDailyMap.get(date);
      return {
        date,
        claimed: day?.claimed ?? 0,
        contacted: day?.contacted ?? 0,
        closed: day?.closed ?? 0,
        conversionRate: day && day.claimed > 0 ? Number(((day.closed / day.claimed) * 100).toFixed(2)) : 0,
      };
    });

    // Calculate team average per day
    const teamAverage: DailyMetric[] = sortedDates.map((date) => {
      const teamDay = teamDailyMap.get(date);
      const userCount = teamDay?.userCount.size || 1;
      return {
        date,
        claimed: Math.round((teamDay?.claimed ?? 0) / userCount),
        contacted: Math.round((teamDay?.contacted ?? 0) / userCount),
        closed: Math.round((teamDay?.closed ?? 0) / userCount),
        conversionRate: teamDay && teamDay.claimed > 0 ? Number(((teamDay.closed / teamDay.claimed) * 100).toFixed(2)) : 0,
      };
    });

    // ดึงข้อมูล sales member
    const salesMember = await sheetsService.getSalesTeamMember(userId);

    // Check if user has any leads in the period
    const totalUserClaimed = dailyData.reduce((sum, d) => sum + d.claimed, 0);
    if (totalUserClaimed === 0) {
      logger.warn('getSalesPerformanceTrend: userId has no leads in period', {
        userId,
        days,
        totalLeadsInPeriod: leadsInPeriod.length,
      });
    }

    // Check if sales member exists
    if (!salesMember) {
      logger.warn('getSalesPerformanceTrend: salesMember not found', {
        userId,
      });
    }

    const response: AdminApiResponse<SalesPerformanceTrendResponse> = {
      success: true,
      data: {
        userId,
        name: salesMember?.name || 'Unknown',
        period: days,
        dailyData,
        teamAverage,
      },
    };

    logger.info('getSalesPerformanceTrend completed', {
      userId,
      days,
      dataPoints: dailyData.length,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('getSalesPerformanceTrend failed', { error });
    next(error);
  }
}
