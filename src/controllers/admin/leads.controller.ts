/**
 * Leads Controller
 * Handles GET /api/admin/leads and GET /api/admin/leads/:id
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';
import { sheetsService } from '../../services/sheets.service.js';
import { extractDateKey } from '../../utils/date-formatter.js';
import {
  AdminApiResponse,
  LeadsListResponse,
  LeadDetailResponse,
  LeadItem,
  StatusHistoryItem,
  LeadMetrics,
  PaginationMeta,
  AppliedFilters,
  AvailableFilters,
} from '../../types/admin.types.js';
import {
  leadsQuerySchema,
  leadIdSchema,
  safeValidateQuery,
} from '../../validators/admin.validators.js';
import {
  getAllLeads,
  filterByStatus,
  filterByOwner,
  filterByCampaign,
  filterBySearch,
  sortLeads,
  leadRowToLeadItem,
  getMinutesBetween,
} from './helpers/index.js';

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
      allLeads = filterByStatus(allLeads, status);
    }

    if (owner) {
      allLeads = filterByOwner(allLeads, owner);
    }

    if (campaign) {
      allLeads = filterByCampaign(allLeads, campaign);
    }

    if (search) {
      allLeads = filterBySearch(allLeads, search);
    }

    // Date filter
    if (startDate || endDate) {
      allLeads = allLeads.filter((lead) => {
        const leadDateKey = extractDateKey(lead.date);
        if (startDate && leadDateKey < startDate) {
          return false;
        }
        if (endDate && leadDateKey > endDate) {
          return false;
        }
        return true;
      });
    }

    // Sort using helper function
    allLeads = sortLeads(allLeads, sortBy, sortOrder);

    // Pagination
    const total = allLeads.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLeads = allLeads.slice(startIndex, endIndex);

    // Convert to LeadItem format
    const leadItems: LeadItem[] = paginatedLeads.map(leadRowToLeadItem);

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

    // Get real status history from Status_History sheet
    const historyEntries = lead.leadUUID
      ? await sheetsService.getStatusHistory(lead.leadUUID)
      : [];

    let history: StatusHistoryItem[];

    if (historyEntries.length > 0) {
      history = historyEntries.map((entry) => ({
        status: entry.status,
        by: entry.changedByName,
        timestamp: entry.timestamp,
      }));
    } else {
      // Fallback: Reconstruct history from timestamps for legacy leads
      history = [];

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

      if (lead.contactedAt) {
        history.push({
          status: 'contacted',
          by: lead.salesOwnerName || 'Unknown',
          timestamp: lead.contactedAt,
        });
      }

      // Add creation event for legacy leads
      history.push({
        status: 'new',
        by: 'System',
        timestamp: lead.date,
      });
    }

    // Sort history (newest first)
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // คำนวณ metrics (หน่วยเป็นนาที)
    let closingTime = 0;
    if (lead.closedAt && lead.contactedAt) {
      const contactedTime = new Date(lead.contactedAt).getTime();
      const closedTime = new Date(lead.closedAt).getTime();
      if (contactedTime > closedTime) {
        logger.warn('Invalid timestamp ordering: contactedAt > closedAt', {
          leadRow: lead.rowNumber,
          contactedAt: lead.contactedAt,
          closedAt: lead.closedAt,
        });
        closingTime = 0;
      } else {
        closingTime = getMinutesBetween(lead.contactedAt, lead.closedAt);
      }
    }

    const metrics: LeadMetrics = {
      responseTime: lead.contactedAt
        ? getMinutesBetween(lead.date, lead.contactedAt)
        : 0,
      closingTime,
      age: getMinutesBetween(lead.date, new Date().toISOString()),
    };

    // ดึงข้อมูล sales team member สำหรับ owner detail
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
