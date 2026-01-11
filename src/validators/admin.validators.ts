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
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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
  owner: z.string().optional(),
  campaign: z.string().optional(),
  search: z.string().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(SORT_OPTIONS.LEADS).optional().default('date'),
  sortOrder: z.enum(SORT_ORDERS).optional().default('desc'),
});

export type LeadsQueryInput = z.infer<typeof leadsQuerySchema>;

// ===========================================
// Lead ID Schema
// ===========================================

export const leadIdSchema = z.object({
  id: z.coerce.number().int().min(2, 'Lead ID ต้องมากกว่า 1 (row 1 คือ header)'),
});

export type LeadIdInput = z.infer<typeof leadIdSchema>;

// ===========================================
// Sales Performance Query Schema
// ===========================================

export const salesPerformanceQuerySchema = z.object({
  period: periodSchema.optional().default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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
