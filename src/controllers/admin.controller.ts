/**
 * ENEOS Sales Automation - Admin Dashboard Controller
 *
 * Controller สำหรับ Admin Dashboard API endpoints
 * รองรับการดึงข้อมูล Dashboard, Leads, Sales Performance
 *
 * @module controllers/admin
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { sheetsService } from '../services/sheets.service.js';
import { parseDateFromSheets, extractDateKey } from '../utils/date-formatter.js';
import {
  AdminApiResponse,
  DashboardResponse,
  LeadsListResponse,
  LeadDetailResponse,
  SalesPerformanceResponse,
  PeriodInfo,
  LeadItem,
  StatusDistribution,
  DashboardSummary,
  TopSalesPerson,
  ActivityItem,
  Alert,
  SalesTeamMember,
  LeadMetrics,
  StatusHistoryItem,
  SalesStats,
  SalesTarget,
  SalesTrendItem,
  SalesTeamTotals,
  SalesComparison,
  PaginationMeta,
  AppliedFilters,
  AvailableFilters,
} from '../types/admin.types.js';
import { LeadRow } from '../types/index.js';
import { DASHBOARD, ALERTS, DEFAULT_TARGETS, EXPORT } from '../constants/admin.constants.js';
import {
  dashboardQuerySchema,
  leadsQuerySchema,
  leadIdSchema,
  salesPerformanceQuerySchema,
  campaignsQuerySchema,
  campaignIdSchema,
  exportQuerySchema,
  safeValidateQuery,
} from '../validators/admin.validators.js';

// ===========================================
// Helper Functions
// ===========================================

/**
 * แปลง period parameter เป็น PeriodInfo
 */
function parsePeriod(
  period: string = 'month',
  startDate?: string,
  endDate?: string
): PeriodInfo {
  const now = new Date();
  let start: Date;
  let end: Date = now;

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;

    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      break;

    case 'week': {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
      break;
    }

    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;

    case 'quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      break;
    }

    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;

    case 'custom':
      if (!startDate || !endDate) {
        throw new Error('startDate and endDate required for custom period');
      }
      start = new Date(startDate);
      end = new Date(endDate);
      break;

    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      period = 'month';
  }

  return {
    type: period as PeriodInfo['type'],
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

/**
 * คำนวณจำนวนนาทีระหว่าง 2 วันที่
 */
function getMinutesBetween(start: string | null, end: string | null): number {
  if (!start || !end) {return 0;}
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));
}

/**
 * ดึง leads ทั้งหมดจาก Google Sheets
 * ใช้ sheetsService.getAllLeads() ที่สร้างไว้แล้ว
 */
async function getAllLeads(): Promise<LeadRow[]> {
  try {
    return await sheetsService.getAllLeads();
  } catch (error) {
    logger.error('Failed to get all leads', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * กรอง leads ตาม period
 */
function filterByPeriod(leads: LeadRow[], period: PeriodInfo): LeadRow[] {
  const startTime = new Date(period.startDate).getTime();
  const endTime = new Date(period.endDate).getTime();

  return leads.filter((lead) => {
    const leadTime = parseDateFromSheets(lead.date).getTime();
    return leadTime >= startTime && leadTime <= endTime;
  });
}

/**
 * นับจำนวน leads ตาม status
 */
function countByStatus(leads: LeadRow[]): StatusDistribution {
  return {
    new: leads.filter((l) => l.status === 'new').length,
    claimed: leads.filter((l) => l.status === 'claimed').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    closed: leads.filter((l) => l.status === 'closed').length,
    lost: leads.filter((l) => l.status === 'lost').length,
    unreachable: leads.filter((l) => l.status === 'unreachable').length,
  };
}

/**
 * คำนวณ % เปลี่ยนแปลง
 */
function calculateChange(current: number, previous: number): number {
  if (previous === 0) {return current > 0 ? 100 : 0;}
  return ((current - previous) / previous) * 100;
}

// ===========================================
// Dashboard Endpoints
// ===========================================

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
    // TODO: ต้องดึงข้อมูลช่วงก่อนหน้ามาเปรียบเทียบ
    const previousPeriodLeads = 0; // Placeholder
    const previousClaimed = 0;
    const previousClosed = 0;

    const summary: DashboardSummary = {
      totalLeads,
      claimed: statusCount.claimed,
      contacted: statusCount.contacted,
      closed: statusCount.closed,
      lost: statusCount.lost,
      unreachable: statusCount.unreachable,
      conversionRate: Number(conversionRate.toFixed(2)),
      changes: {
        totalLeads: calculateChange(totalLeads, previousPeriodLeads),
        claimed: calculateChange(statusCount.claimed, previousClaimed),
        closed: calculateChange(statusCount.closed, previousClosed),
      },
    };

    // สร้าง Trend Data (group by date)
    // Frontend expects: { date, newLeads, closed }
    const trendMap = new Map<string, { date: string; newLeads: number; closed: number }>();
    leads.forEach((lead) => {
      const dateKey = extractDateKey(lead.date); // YYYY-MM-DD
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, {
          date: dateKey,
          newLeads: 0,
          closed: 0,
        });
      }
      const trend = trendMap.get(dateKey)!;
      trend.newLeads++; // Count all leads as "new" for that day
      if (lead.status === 'closed') {trend.closed++;}
    });

    const dailyTrends = Array.from(trendMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Top Sales (group by salesOwnerId)
    const salesMap = new Map<string, { leads: LeadRow[]; name: string; email?: string }>();
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
          rank: 0, // จะกำหนดหลัง sort
        };
      })
      .sort((a, b) => b.closed - a.closed)
      .slice(0, DASHBOARD.TOP_SALES_LIMIT)
      .map((person, index) => ({ ...person, rank: index + 1 }));

    // Recent Activity
    const recentActivity: ActivityItem[] = leads
      .filter((lead) => lead.salesOwnerId)
      .sort((a, b) => {
        const aTime = a.closedAt || a.clickedAt || a.date;
        const bTime = b.closedAt || b.clickedAt || b.date;
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
        timestamp: lead.closedAt || lead.clickedAt || lead.date,
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
      const daysSinceContact = (now.getTime() - parseDateFromSheets(lead.clickedAt || lead.date).getTime()) / (1000 * 60 * 60 * 24);
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

// ===========================================
// Leads Endpoints
// ===========================================

/**
 * GET /api/admin/leads
 * ดึงรายการ leads แบบ paginated พร้อม filters
 */
export async function getLeads(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate query parameters
    const validation = safeValidateQuery(leadsQuerySchema, req.query);
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

    const {
      page = 1,
      limit = 20,
      status,
      owner,
      campaign,
      search,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc',
    } = validation.data;

    logger.info('getLeads called', {
      page,
      limit,
      status,
      user: req.user?.email,
    });

    // ดึง leads ทั้งหมด
    let allLeads = await getAllLeads();

    // Apply filters
    if (status) {
      allLeads = allLeads.filter((lead) => lead.status === status);
    }

    if (owner) {
      allLeads = allLeads.filter((lead) => lead.salesOwnerId === owner);
    }

    if (campaign) {
      allLeads = allLeads.filter((lead) => lead.campaignId === campaign);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      allLeads = allLeads.filter(
        (lead) =>
          lead.company.toLowerCase().includes(searchLower) ||
          lead.customerName.toLowerCase().includes(searchLower) ||
          lead.email.toLowerCase().includes(searchLower)
      );
    }

    if (startDate) {
      const startTime = new Date(startDate).getTime();
      allLeads = allLeads.filter((lead) => parseDateFromSheets(lead.date).getTime() >= startTime);
    }

    if (endDate) {
      const endTime = new Date(endDate).getTime();
      allLeads = allLeads.filter((lead) => parseDateFromSheets(lead.date).getTime() <= endTime);
    }

    // Sort
    allLeads.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'company':
          aValue = a.company;
          bValue = b.company;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Pagination
    const total = allLeads.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLeads = allLeads.slice(startIndex, endIndex);

    // Convert to LeadItem format
    const leadItems: LeadItem[] = paginatedLeads.map((lead) => ({
      row: lead.rowNumber,
      date: lead.date,
      customerName: lead.customerName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      industry: lead.industryAI,
      website: lead.website || '',
      capital: lead.capital || '',
      status: lead.status,
      owner: lead.salesOwnerId
        ? {
            id: lead.salesOwnerId,
            name: lead.salesOwnerName || 'Unknown',
          }
        : null,
      campaign: {
        id: lead.campaignId,
        name: lead.campaignName,
      },
      source: lead.source,
      talkingPoint: lead.talkingPoint || '',
      clickedAt: lead.clickedAt,
      claimedAt: null, // TODO: ต้องเพิ่ม column นี้ใน Google Sheets
      contactedAt: null,
      closedAt: lead.closedAt,
    }));

    // Build available filters
    const allSalesIds = new Set(allLeads.map((l) => l.salesOwnerId).filter(Boolean) as string[]);
    const allCampaignIds = new Set(allLeads.map((l) => l.campaignId));

    const availableFilters: AvailableFilters = {
      statuses: ['new', 'claimed', 'contacted', 'closed', 'lost', 'unreachable'],
      owners: Array.from(allSalesIds).map((id) => {
        const lead = allLeads.find((l) => l.salesOwnerId === id);
        return {
          id,
          name: lead?.salesOwnerName || 'Unknown',
        };
      }),
      campaigns: Array.from(allCampaignIds).map((id) => {
        const lead = allLeads.find((l) => l.campaignId === id);
        return {
          id,
          name: lead?.campaignName || 'Unknown',
        };
      }),
    };

    const appliedFilters: AppliedFilters = {
      status,
      owner,
      campaign,
      search,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    };

    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    const response: AdminApiResponse<LeadsListResponse> = {
      success: true,
      data: {
        data: leadItems,
        pagination,
        filters: {
          applied: appliedFilters,
          available: availableFilters,
        },
      },
    };

    logger.info('getLeads completed', {
      total,
      page,
      limit,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('getLeads failed', { error });
    next(error);
  }
}

/**
 * GET /api/admin/leads/:id
 * ดึงข้อมูล lead detail พร้อม history
 */
export async function getLeadById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate lead ID
    const validation = safeValidateQuery(leadIdSchema, req.params);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'รหัส Lead ไม่ถูกต้อง',
          details: validation.errors,
        },
      });
      return;
    }

    const rowNumber = validation.data.id;

    logger.info('getLeadById called', {
      rowNumber,
      user: req.user?.email,
    });

    // ดึงข้อมูล lead
    const lead = await sheetsService.getRow(rowNumber);

    if (!lead) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'ไม่พบ Lead ที่ต้องการ',
          details: { row: rowNumber },
        },
      });
      return;
    }

    // สร้าง status history (mock - ในอนาคตควรเก็บจริงใน Sheets)
    const history: StatusHistoryItem[] = [];

    if (lead.closedAt) {
      history.push({
        status: 'closed',
        by: lead.salesOwnerName || 'Unknown',
        timestamp: lead.closedAt,
      });
    }

    if (lead.lostAt) {
      history.push({
        status: 'lost',
        by: lead.salesOwnerName || 'Unknown',
        timestamp: lead.lostAt,
      });
    }

    if (lead.unreachableAt) {
      history.push({
        status: 'unreachable',
        by: lead.salesOwnerName || 'Unknown',
        timestamp: lead.unreachableAt,
      });
    }

    if (lead.status === 'contacted' || lead.closedAt || lead.lostAt) {
      history.push({
        status: 'contacted',
        by: lead.salesOwnerName || 'Unknown',
        timestamp: lead.clickedAt || lead.date,
      });
    }

    if (lead.salesOwnerId) {
      history.push({
        status: 'claimed',
        by: lead.salesOwnerName || 'Unknown',
        timestamp: lead.clickedAt || lead.date,
      });
    }

    history.push({
      status: 'new',
      by: 'System',
      timestamp: lead.date,
    });

    // Sort history (newest first)
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // คำนวณ metrics (หน่วยเป็นนาที)
    const metrics: LeadMetrics = {
      responseTime: lead.salesOwnerId
        ? getMinutesBetween(lead.date, lead.clickedAt)
        : 0,
      closingTime: lead.closedAt
        ? getMinutesBetween(lead.clickedAt || lead.date, lead.closedAt)
        : 0,
      age: getMinutesBetween(lead.date, new Date().toISOString()),
    };

    // TODO: ดึงข้อมูล sales team member สำหรับ owner detail
    let ownerDetail = null;
    if (lead.salesOwnerId) {
      const salesMember = await sheetsService.getSalesTeamMember(lead.salesOwnerId);
      if (salesMember) {
        ownerDetail = {
          id: salesMember.lineUserId,
          name: salesMember.name,
          email: salesMember.email || '',
          phone: salesMember.phone || '',
        };
      }
    }

    const leadDetail: LeadDetailResponse = {
      row: lead.rowNumber,
      date: lead.date,
      customerName: lead.customerName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      industry: lead.industryAI,
      website: lead.website || '',
      capital: lead.capital || '',
      status: lead.status,
      owner: ownerDetail || (lead.salesOwnerId
        ? {
            id: lead.salesOwnerId,
            name: lead.salesOwnerName || 'Unknown',
            email: '',
            phone: '',
          }
        : null),
      campaign: {
        id: lead.campaignId,
        name: lead.campaignName,
        subject: lead.emailSubject,
      },
      source: lead.source,
      leadId: lead.leadId,
      eventId: lead.eventId,
      talkingPoint: lead.talkingPoint || '',
      history,
      metrics,
    };

    const response: AdminApiResponse<LeadDetailResponse> = {
      success: true,
      data: leadDetail,
    };

    logger.info('getLeadById completed', { rowNumber });

    res.status(200).json(response);
  } catch (error) {
    logger.error('getLeadById failed', { error });
    next(error);
  }
}

// ===========================================
// Sales Performance Endpoints
// ===========================================

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
        if (!salesMap.has(lead.salesOwnerId!)) {
          salesMap.set(lead.salesOwnerId!, []);
        }
        salesMap.get(lead.salesOwnerId!)!.push(lead);
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
        .filter((l) => l.salesOwnerId)
        .map((l) => getMinutesBetween(l.date, l.clickedAt))
        .filter((t) => t > 0);

      const avgResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
          : 0;

      // คำนวณ avg closing time (นาที)
      const closingTimes = salesLeads
        .filter((l) => l.closedAt)
        .map((l) => getMinutesBetween(l.clickedAt || l.date, l.closedAt!))
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

      // Default target (ในอนาคตควรเก็บไว้ใน Sheets)
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
          const weekNum = getWeekNumber(new Date(l.closedAt!));
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

    // TODO: คำนวณ comparison กับช่วงก่อนหน้า
    const comparison: SalesComparison = {
      previousPeriod: {
        claimed: 0,
        closed: 0,
        conversionRate: 0,
      },
      changes: {
        claimed: 0,
        closed: 0,
        conversionRate: 0,
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

// ===========================================
// Helper: Get Week Number
// ===========================================

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// ===========================================
// Campaign Endpoints
// ===========================================

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
      campaignMap.get(lead.campaignId)!.push(lead);
    });

    // สร้าง campaign items
    const campaigns: any[] = Array.from(campaignMap.entries()).map(([id, campaignLeads]) => {
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
        const trend = trendMap.get(weekKey)!;
        trend.leads++;
        if (lead.status === 'closed') {trend.closed++;}
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

    // TODO: Calculate comparison with previous period
    const comparison = {
      previousPeriod: {
        leads: 0,
        closed: 0,
        conversionRate: 0,
      },
      changes: {
        leads: 0,
        closed: 0,
        conversionRate: 0,
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

    const response: AdminApiResponse<any> = {
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
        if (!salesMap.has(lead.salesOwnerId!)) {
          salesMap.set(lead.salesOwnerId!, {
            leads: [],
            name: lead.salesOwnerName || 'Unknown',
          });
        }
        salesMap.get(lead.salesOwnerId!)!.leads.push(lead);
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
      const daily = dailyMap.get(dateKey)!;
      if (lead.salesOwnerId) {daily.claimed++;}
      if (lead.status === 'closed') {daily.closed++;}
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

    const response: AdminApiResponse<any> = {
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

// ===========================================
// Export Endpoint
// ===========================================

/**
 * GET /api/admin/export
 * Export data to file
 */
export async function exportData(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validation = safeValidateQuery(exportQuerySchema, req.query);
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

    const { type, format, startDate, endDate, status, owner, campaign } = validation.data;

    logger.info('exportData called', {
      type,
      format,
      user: req.user?.email,
    });

    // ดึงข้อมูลตาม type
    const allLeads = await getAllLeads();
    let dataToExport: any[] = [];

    // Apply filters
    let filteredLeads = allLeads;

    if (startDate) {
      const startTime = new Date(startDate).getTime();
      filteredLeads = filteredLeads.filter((lead) => parseDateFromSheets(lead.date).getTime() >= startTime);
    }

    if (endDate) {
      const endTime = new Date(endDate).getTime();
      filteredLeads = filteredLeads.filter((lead) => parseDateFromSheets(lead.date).getTime() <= endTime);
    }

    if (status) {
      filteredLeads = filteredLeads.filter((lead) => lead.status === status);
    }

    if (owner) {
      filteredLeads = filteredLeads.filter((lead) => lead.salesOwnerId === owner);
    }

    if (campaign) {
      filteredLeads = filteredLeads.filter((lead) => lead.campaignId === campaign);
    }

    // Limit to MAX_ROWS
    if (filteredLeads.length > EXPORT.MAX_ROWS) {
      filteredLeads = filteredLeads.slice(0, EXPORT.MAX_ROWS);
    }

    // Prepare data based on type
    if (type === 'leads' || type === 'all') {
      dataToExport = filteredLeads.map((lead) => ({
        'Row': lead.rowNumber,
        'Date': lead.date,
        'Customer Name': lead.customerName,
        'Email': lead.email,
        'Phone': lead.phone,
        'Company': lead.company,
        'Industry': lead.industryAI,
        'Website': lead.website || '',
        'Capital': lead.capital || '',
        'Status': lead.status,
        'Sales Owner': lead.salesOwnerName || '',
        'Campaign': lead.campaignName,
        'Source': lead.source,
        'Talking Point': lead.talkingPoint || '',
        'Clicked At': lead.clickedAt,
        'Closed At': lead.closedAt || '',
      }));
    }

    // Generate file
    if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);

      logger.info('exportData completed', { type, format, rows: dataToExport.length });
    } else if (format === 'csv') {
      const { parse } = await import('json2csv');
      const csv = parse(dataToExport);

      const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);

      logger.info('exportData completed', { type, format, rows: dataToExport.length });
    } else if (format === 'pdf') {
      const PDFDocument = (await import('pdfkit')).default;
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      doc.pipe(res);

      // Title
      doc.fontSize(20).text(`${type.toUpperCase()} Export`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown();

      // Add simple table (first N rows for PDF)
      const pdfData = dataToExport.slice(0, EXPORT.PDF_MAX_PREVIEW_ROWS);
      doc.fontSize(10);

      pdfData.forEach((row, index) => {
        if (index > 0 && index % 15 === 0) {
          doc.addPage();
        }

        doc.text(`Row ${row.Row}: ${row['Customer Name']} (${row.Company}) - Status: ${row.Status}`);
        doc.moveDown(0.5);
      });

      if (dataToExport.length > EXPORT.PDF_MAX_PREVIEW_ROWS) {
        doc.moveDown();
        doc.text(`... and ${dataToExport.length - EXPORT.PDF_MAX_PREVIEW_ROWS} more rows`, { align: 'center' });
      }

      doc.end();

      logger.info('exportData completed', { type, format, rows: dataToExport.length });
    }
  } catch (error) {
    logger.error('exportData failed', { error });
    next(error);
  }
}
