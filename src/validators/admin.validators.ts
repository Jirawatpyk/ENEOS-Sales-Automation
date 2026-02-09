/**
 * ENEOS Sales Automation - Admin API Validators
 * Zod schemas สำหรับ validate query parameters
 */

import { z } from 'zod';
import { PAGINATION, VALID_PERIODS, SORT_OPTIONS, SORT_ORDERS } from '../constants/admin.constants.js';

// ===========================================
// Lead Status Schema
// ===========================================

export const leadStatusSchema = z.enum([
  'new',
  'claimed',
  'contacted',
  'closed',
  'lost',
  'unreachable',
]);

export type LeadStatusInput = z.infer<typeof leadStatusSchema>;

// ===========================================
// Period Schema
// ===========================================

export const periodSchema = z.enum(VALID_PERIODS);

// ===========================================
// Dashboard Query Schema
// ===========================================

export const dashboardQuerySchema = z.object({
  period: periodSchema.optional().default('month'),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
}).refine(
  (data) => {
    // ถ้าเลือก custom period ต้องมี startDate และ endDate
    if (data.period === 'custom') {
      return data.startDate && data.endDate;
    }
    return true;
  },
  {
    message: 'startDate และ endDate จำเป็นสำหรับ custom period',
    path: ['period'],
  }
).refine(
  (data) => {
    // ตรวจสอบว่า startDate ต้องมาก่อน endDate
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'startDate ต้องมาก่อน endDate',
    path: ['startDate'],
  }
);

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;

// ===========================================
// Leads List Query Schema
// ===========================================

export const leadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).optional().default(PAGINATION.DEFAULT_LIMIT),
  status: leadStatusSchema.optional(),
  owner: z.string().trim().optional(),
  campaign: z.string().trim().optional(),
  leadSource: z.string().trim().optional(), // Story 4-14: Filter by lead source
  search: z.string().trim().max(100).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  sortBy: z.enum(SORT_OPTIONS.LEADS).optional().default('date'),
  sortOrder: z.enum(SORT_ORDERS).optional().default('desc'),
});

export type LeadsQueryInput = z.infer<typeof leadsQuerySchema>;

// ===========================================
// Lead ID Schema
// ===========================================

export const leadIdSchema = z.object({
  id: z.string().min(1, 'Lead ID is required'),
});

export type LeadIdInput = z.infer<typeof leadIdSchema>;

// ===========================================
// Sales Performance Query Schema
// ===========================================

export const salesPerformanceQuerySchema = z.object({
  period: periodSchema.optional().default('month'),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  sortBy: z.enum(SORT_OPTIONS.SALES).optional().default('closed'),
  sortOrder: z.enum(SORT_ORDERS).optional().default('desc'),
}).refine(
  (data) => {
    if (data.period === 'custom') {
      return data.startDate && data.endDate;
    }
    return true;
  },
  {
    message: 'startDate และ endDate จำเป็นสำหรับ custom period',
    path: ['period'],
  }
);

export type SalesPerformanceQueryInput = z.infer<typeof salesPerformanceQuerySchema>;

// ===========================================
// Sales Performance Trend Query Schema
// ===========================================

export const salesPerformanceTrendQuerySchema = z.object({
  userId: z.string().trim().min(1, 'userId ต้องระบุ'),
  days: z.coerce
    .number()
    .int()
    .refine((val) => [7, 30, 90].includes(val), {
      message: 'days ต้องเป็น 7, 30 หรือ 90',
    })
    .optional(),
});

export type SalesPerformanceTrendQueryInput = z.infer<typeof salesPerformanceTrendQuerySchema>;

// ===========================================
// Campaigns Query Schema
// ===========================================

export const campaignsQuerySchema = z.object({
  period: periodSchema.optional().default('quarter'),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  sortBy: z.enum(SORT_OPTIONS.CAMPAIGNS).optional().default('closed'),
  sortOrder: z.enum(SORT_ORDERS).optional().default('desc'),
}).refine(
  (data) => {
    if (data.period === 'custom') {
      return data.startDate && data.endDate;
    }
    return true;
  },
  {
    message: 'startDate และ endDate จำเป็นสำหรับ custom period',
    path: ['period'],
  }
);

export type CampaignsQueryInput = z.infer<typeof campaignsQuerySchema>;

// ===========================================
// Campaign ID Schema
// ===========================================

export const campaignIdSchema = z.object({
  campaignId: z.string().trim().min(1, 'Campaign ID ต้องไม่ว่าง'),
});

export type CampaignIdInput = z.infer<typeof campaignIdSchema>;

// ===========================================
// Export Query Schema
// ===========================================

export const exportQuerySchema = z.object({
  type: z.enum(['leads', 'sales', 'campaigns', 'all'], {
    errorMap: () => ({ message: 'type ต้องเป็น leads, sales, campaigns หรือ all' }),
  }),
  format: z.enum(['xlsx', 'csv', 'pdf'], {
    errorMap: () => ({ message: 'format ต้องเป็น xlsx, csv หรือ pdf' }),
  }),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  status: leadStatusSchema.optional(),
  owner: z.string().trim().optional(),
  campaign: z.string().trim().optional(),
  fields: z.string().trim().optional(), // comma-separated field names
});

export type ExportQueryInput = z.infer<typeof exportQuerySchema>;

// ===========================================
// Validation Helper Functions
// ===========================================

/**
 * Validate query parameters และ return parsed result
 * ถ้า validation ล้มเหลวจะ throw error
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  query: Record<string, unknown>
): T {
  const result = schema.safeParse(query);

  if (!result.success) {
    const errorMessages = result.error.errors.map(
      (err) => `${err.path.join('.')}: ${err.message}`
    ).join(', ');

    throw new Error(`Validation failed: ${errorMessages}`);
  }

  return result.data;
}

/**
 * Safe validate - returns null instead of throwing
 */
export function safeValidateQuery<T>(
  schema: z.ZodSchema<T>,
  query: Record<string, unknown>
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(query);

  if (!result.success) {
    const errors = result.error.errors.map(
      (err) => `${err.path.join('.')}: ${err.message}`
    );
    return { success: false, errors };
  }

  return { success: true, data: result.data };
}
