/**
 * Leads Controller
 * Handles GET /api/admin/leads and GET /api/admin/leads/:id
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';
import { getSalesTeamMember } from '../../services/sales-team.service.js';
import { getStatusHistory } from '../../services/status-history.service.js';
import { getCampaignEventsByEmail } from '../../services/campaign-stats.service.js';
import * as leadsService from '../../services/leads.service.js';
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
  type LeadCampaignEvent,
  type TimelineEntry,
} from '../../types/admin.types.js';
import {
  leadsQuerySchema,
  leadIdSchema,
  safeValidateQuery,
} from '../../validators/admin.validators.js';
import {
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
      leadSource,
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

    // SQL-level filtering + pagination via Supabase (L1 fix: no more getAllLeads + in-memory)
    const [paginatedResult, filterValues] = await Promise.all([
      leadsService.getLeadsWithPagination(page, limit, {
        status,
        owner,
        campaign,
        leadSource,
        search,
        startDate,
        endDate,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc',
      }),
      leadsService.getDistinctFilterValues(),
    ]);

    const total = paginatedResult.total;
    const totalPages = Math.ceil(total / limit);

    // Convert SupabaseLead[] → LeadItem[] via LeadRow mapping
    const leadItems: LeadItem[] = paginatedResult.data
      .map(row => leadsService.supabaseLeadToLeadRow(row))
      .map(leadRowToLeadItem);

    const availableFilters: AvailableFilters = {
      statuses: ['new', 'claimed', 'contacted', 'closed', 'lost', 'unreachable'],
      owners: filterValues.owners,
      campaigns: filterValues.campaigns,
      leadSources: filterValues.leadSources,
    };

    const appliedFilters: AppliedFilters = {
      status,
      owner,
      campaign,
      leadSource, // Story 4-14
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

    const leadId = String(validation.data.id);

    logger.info('getLeadById called', {
      leadId,
      user: req.user?.email,
    });

    // ดึงข้อมูล lead — try UUID lookup via Supabase first
    const supabaseLead = await leadsService.getLeadById(leadId);
    const lead = supabaseLead ? leadsService.supabaseLeadToLeadRow(supabaseLead) : null;

    if (!lead) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'ไม่พบ Lead ที่ต้องการ',
          details: { id: leadId },
        },
      });
      return;
    }

    // Get status history + campaign events in parallel (Story 9-5)
    const [historyEntries, campaignEvents] = await Promise.all([
      supabaseLead
        ? getStatusHistory(supabaseLead.id)
        : Promise.resolve([]),
      getCampaignEventsByEmail(lead.email).catch((err) => {
        logger.warn('Failed to fetch campaign events for lead', { err, leadId });
        return [] as LeadCampaignEvent[];
      }),
    ]);

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

    // Build unified timeline (Story 9-5: AC #4)
    const timeline: TimelineEntry[] = [];

    for (const h of history) {
      timeline.push({
        type: 'status_change',
        timestamp: h.timestamp,
        status: h.status,
        changedBy: h.by,
      });
    }

    for (const e of campaignEvents) {
      timeline.push({
        type: 'campaign_event',
        timestamp: e.eventAt,
        event: e.event,
        campaignName: e.campaignName,
        url: e.url,
      });
    }

    timeline.sort((a, b) => {
      const timeB = new Date(b.timestamp).getTime() || 0;
      const timeA = new Date(a.timestamp).getTime() || 0;
      return timeB - timeA;
    });

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
      const salesMember = await getSalesTeamMember(lead.salesOwnerId);
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
      leadUuid: supabaseLead!.id,
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
        id: lead.brevoCampaignId || lead.campaignId,
        name: lead.campaignName,
        subject: lead.emailSubject,
      },
      source: lead.source,
      leadId: lead.leadId,
      eventId: lead.eventId,
      talkingPoint: lead.talkingPoint || '',
      history,
      metrics,
      // Google Search Grounding fields (2026-01-26)
      juristicId: lead.juristicId ?? null,
      dbdSector: lead.dbdSector ?? null,
      province: lead.province ?? null,
      fullAddress: lead.fullAddress ?? null,
      // Campaign engagement timeline (Story 9-5)
      campaignEvents,
      timeline,
    };

    const response: AdminApiResponse<LeadDetailResponse> = {
      success: true,
      data: leadDetail,
    };

    logger.info('getLeadById completed', { leadId });

    res.status(200).json(response);
  } catch (error) {
    logger.error('getLeadById failed', { error });
    next(error);
  }
}
