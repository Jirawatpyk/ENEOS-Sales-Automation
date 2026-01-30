/**
 * ENEOS Sales Automation - Campaign Stats Validators
 * Zod schemas for Campaign Stats API endpoints (Story 5-2)
 */

import { z } from 'zod';
import { PAGINATION } from '../constants/admin.constants.js';

// ===========================================
// Valid Sort By Options (AC1)
// ===========================================

export const VALID_SORT_BY_OPTIONS = [
  'Last_Updated',
  'First_Event',
  'Campaign_Name',
  'Delivered',
  'Opened',
  'Clicked',
  'Open_Rate',
  'Click_Rate',
] as const;

export type CampaignStatsSortBy = typeof VALID_SORT_BY_OPTIONS[number];

// ===========================================
// Valid Event Types (AC3)
// ===========================================

export const VALID_EVENT_TYPES = [
  'delivered',
  'opened',
  'click',
] as const;

export type CampaignEventType = typeof VALID_EVENT_TYPES[number];

// ===========================================
// Campaign Stats Query Schema (AC1)
// GET /api/admin/campaigns/stats
// ===========================================

export const getCampaignStatsQuerySchema = z.object({
  // Pagination
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : PAGINATION.DEFAULT_PAGE))
    .pipe(z.number().int().min(1)),

  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : PAGINATION.DEFAULT_LIMIT))
    .pipe(z.number().int().min(1).max(PAGINATION.MAX_LIMIT)),

  // Search by campaign name (case-insensitive partial match)
  search: z.string().optional(),

  // Date range filter (ISO 8601 format)
  dateFrom: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Date.parse(val)),
      { message: 'dateFrom must be a valid ISO date' }
    ),

  dateTo: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Date.parse(val)),
      { message: 'dateTo must be a valid ISO date' }
    ),

  // Sorting
  sortBy: z
    .enum(VALID_SORT_BY_OPTIONS)
    .optional()
    .default('Last_Updated'),

  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),
});

export type GetCampaignStatsQuery = z.infer<typeof getCampaignStatsQuerySchema>;

// ===========================================
// Campaign Events Query Schema (AC3)
// GET /api/admin/campaigns/:id/events
// ===========================================

export const getCampaignEventsQuerySchema = z.object({
  // Pagination
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : PAGINATION.DEFAULT_PAGE))
    .pipe(z.number().int().min(1)),

  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : PAGINATION.EVENTS_DEFAULT_LIMIT))
    .pipe(z.number().int().min(1).max(PAGINATION.MAX_LIMIT)),

  // Filter by event type
  event: z
    .enum(VALID_EVENT_TYPES)
    .optional(),

  // Date range filter (ISO 8601 format)
  dateFrom: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Date.parse(val)),
      { message: 'dateFrom must be a valid ISO date' }
    ),

  dateTo: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Date.parse(val)),
      { message: 'dateTo must be a valid ISO date' }
    ),
});

export type GetCampaignEventsQuery = z.infer<typeof getCampaignEventsQuerySchema>;

// ===========================================
// Campaign ID Param Schema (AC2, AC3)
// ===========================================

export const campaignIdParamSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive({ message: 'Campaign ID must be a positive integer' })),
});

export type CampaignIdParam = z.infer<typeof campaignIdParamSchema>;

// ===========================================
// Validation Helper Functions
// ===========================================

/**
 * Validate GET /api/admin/campaigns/stats query parameters
 */
export function validateCampaignStatsQuery(query: unknown): GetCampaignStatsQuery {
  return getCampaignStatsQuerySchema.parse(query);
}

/**
 * Validate GET /api/admin/campaigns/:id/events query parameters
 */
export function validateCampaignEventsQuery(query: unknown): GetCampaignEventsQuery {
  return getCampaignEventsQuerySchema.parse(query);
}

/**
 * Validate campaign ID parameter
 */
export function validateCampaignIdParam(params: unknown): CampaignIdParam {
  return campaignIdParamSchema.parse(params);
}

/**
 * Safe validation (returns success/error object)
 */
export function safeValidateCampaignStatsQuery(query: unknown): {
  success: true;
  data: GetCampaignStatsQuery;
} | {
  success: false;
  errors: Record<string, string>;
} {
  const result = getCampaignStatsQuerySchema.safeParse(query);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    errors[path] = error.message;
  }

  return { success: false, errors };
}

/**
 * Safe validation for campaign events query
 */
export function safeValidateCampaignEventsQuery(query: unknown): {
  success: true;
  data: GetCampaignEventsQuery;
} | {
  success: false;
  errors: Record<string, string>;
} {
  const result = getCampaignEventsQuerySchema.safeParse(query);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    errors[path] = error.message;
  }

  return { success: false, errors };
}

/**
 * Safe validation for campaign ID param
 */
export function safeValidateCampaignIdParam(params: unknown): {
  success: true;
  data: CampaignIdParam;
} | {
  success: false;
  errors: Record<string, string>;
} {
  const result = campaignIdParamSchema.safeParse(params);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    errors[path] = error.message;
  }

  return { success: false, errors };
}
