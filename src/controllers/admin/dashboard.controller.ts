/**
 * Dashboard Controller
 * Handles GET /api/admin/dashboard
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';
import { extractDateKey, parseDateFromSheets } from '../../utils/date-formatter.js';
import {
  AdminApiResponse,
  DashboardResponse,
  DashboardSummary,
  TopSalesPerson,
  ActivityItem,
  Alert,
} from '../../types/admin.types.js';
import { DASHBOARD, ALERTS } from '../../constants/admin.constants.js';
import { dashboardQuerySchema, safeValidateQuery } from '../../validators/admin.validators.js';
import {
  parsePeriod,
  getPreviousPeriod,
  getAllLeads,
  filterByPeriod,
  countByStatus,
  calculateChange,
  getActivityTimestamp,
} from './helpers/index.js';

/**
 * GET /api/admin/dashboard
 * ดึงข้อมูล Dashboard summary
 */
export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate query parameters
    const validation = safeValidateQuery(dashboardQuerySchema, req.query);
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

    const { period: periodType, startDate, endDate } = validation.data;

    logger.info('getDashboard called', {
      period: periodType,
      user: req.user?.email,
    });

    const period = parsePeriod(periodType, startDate, endDate);

    // ดึง leads ทั้งหมดจาก Sheets
    const allLeads = await getAllLeads();
    const leads = filterByPeriod(allLeads, period);

    // คำนวณ summary
    const statusCount = countByStatus(leads);
    const totalLeads = leads.length;
    const conversionRate = totalLeads > 0 ? (statusCount.closed / totalLeads) * 100 : 0;

    // คำนวณข้อมูลเปรียบเทียบกับช่วงก่อน (สำหรับ changes)
    const previousPeriod = getPreviousPeriod(period);
    const previousLeads = filterByPeriod(allLeads, previousPeriod);
    const previousStatusCount = countByStatus(previousLeads);

    const previousPeriodLeads = previousLeads.length;
    const previousClaimed = previousStatusCount.claimed;
    const previousClosed = previousStatusCount.closed;

    const summary: DashboardSummary = {
      totalLeads,
      claimed: statusCount.claimed,
      contacted: statusCount.contacted,
      closed: statusCount.closed,
      lost: statusCount.lost,
      unreachable: statusCount.unreachable,
      conversionRate: Number(conversionRate.toFixed(2)),
      changes: {
        totalLeads: Number(calculateChange(totalLeads, previousPeriodLeads).toFixed(2)),
        claimed: Number(calculateChange(statusCount.claimed, previousClaimed).toFixed(2)),
        closed: Number(calculateChange(statusCount.closed, previousClosed).toFixed(2)),
      },
    };

    // สร้าง Trend Data (group by date)
    const trendMap = new Map<string, { date: string; newLeads: number; closed: number }>();
    leads.forEach((lead) => {
      const dateKey = extractDateKey(lead.date);
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, {
          date: dateKey,
          newLeads: 0,
          closed: 0,
        });
      }
      const trend = trendMap.get(dateKey)!;
      trend.newLeads++;
      if (lead.status === 'closed') {trend.closed++;}
    });

    const dailyTrends = Array.from(trendMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Top Sales (group by salesOwnerId)
    const salesMap = new Map<string, { leads: typeof leads; name: string; email?: string }>();
    leads
      .filter((lead) => lead.salesOwnerId)
      .forEach((lead) => {
        if (!salesMap.has(lead.salesOwnerId!)) {
          salesMap.set(lead.salesOwnerId!, {
            leads: [],
            name: lead.salesOwnerName || 'Unknown',
            email: undefined,
          });
        }
        salesMap.get(lead.salesOwnerId!)!.leads.push(lead);
      });

    const topSales: TopSalesPerson[] = Array.from(salesMap.entries())
      .map(([id, data]) => {
        const claimed = data.leads.length;
        const contacted = data.leads.filter((l) => l.status === 'contacted').length;
        const closed = data.leads.filter((l) => l.status === 'closed').length;
        const convRate = claimed > 0 ? (closed / claimed) * 100 : 0;

        return {
          id,
          name: data.name,
          email: data.email || '',
          claimed,
          contacted,
          closed,
          conversionRate: Number(convRate.toFixed(2)),
          rank: 0,
        };
      })
      .sort((a, b) => b.closed - a.closed)
      .slice(0, DASHBOARD.TOP_SALES_LIMIT)
      .map((person, index) => ({ ...person, rank: index + 1 }));

    // Recent Activity
    const recentActivity: ActivityItem[] = leads
      .filter((lead) => lead.salesOwnerId)
      .sort((a, b) => {
        const aTime = getActivityTimestamp(a);
        const bTime = getActivityTimestamp(b);
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      })
      .slice(0, DASHBOARD.RECENT_ACTIVITY_LIMIT)
      .map((lead) => ({
        id: `act_${lead.rowNumber}`,
        type: lead.status as ActivityItem['type'],
        salesId: lead.salesOwnerId || '',
        salesName: lead.salesOwnerName || 'Unknown',
        leadId: lead.rowNumber,
        company: lead.company,
        customerName: lead.customerName,
        timestamp: getActivityTimestamp(lead),
      }));

    // Alerts
    const alerts: Alert[] = [];
    const now = new Date();

    // Unclaimed leads (เกิน threshold ชั่วโมง)
    const unclaimedLeads = leads.filter((lead) => {
      if (lead.status !== 'new') {return false;}
      const hoursSinceCreated = (now.getTime() - parseDateFromSheets(lead.date).getTime()) / (1000 * 60 * 60);
      return hoursSinceCreated > ALERTS.UNCLAIMED_HOURS;
    });

    if (unclaimedLeads.length > 0) {
      alerts.push({
        id: 'alert_unclaimed',
        type: 'unclaimed',
        severity: 'warning',
        message: `${unclaimedLeads.length} leads ไม่มีคนรับเกิน ${ALERTS.UNCLAIMED_HOURS} ชั่วโมง`,
        count: unclaimedLeads.length,
        action: {
          label: 'ดู Leads',
          url: `/leads?status=new&age=${ALERTS.UNCLAIMED_HOURS}h`,
        },
      });
    }

    // Stale leads (contacted แต่ไม่ update เกิน threshold วัน)
    const staleLeads = leads.filter((lead) => {
      if (lead.status !== 'contacted') {return false;}
      const contactDate = lead.contactedAt || lead.date;
      const daysSinceContact = (now.getTime() - parseDateFromSheets(contactDate).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceContact > ALERTS.STALE_DAYS;
    });

    if (staleLeads.length > 0) {
      alerts.push({
        id: 'alert_stale',
        type: 'stale',
        severity: 'info',
        message: `${staleLeads.length} leads ติดต่อแล้วเกิน ${ALERTS.STALE_DAYS} วัน`,
        count: staleLeads.length,
        action: {
          label: 'ดู Leads',
          url: `/leads?status=contacted&age=${ALERTS.STALE_DAYS}d`,
        },
      });
    }

    const response: AdminApiResponse<DashboardResponse> = {
      success: true,
      data: {
        summary,
        trends: {
          daily: dailyTrends,
        },
        statusDistribution: statusCount,
        topSales,
        recentActivity,
        alerts,
        period,
      },
    };

    logger.info('getDashboard completed', {
      totalLeads,
      period: period.type,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('getDashboard failed', { error });
    next(error);
  }
}
