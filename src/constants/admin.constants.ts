/**
 * ENEOS Sales Automation - Admin Dashboard Constants
 * ค่าคงที่สำหรับ Admin Dashboard API
 */

// ===========================================
// Pagination
// ===========================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ===========================================
// Dashboard
// ===========================================

export const DASHBOARD = {
  /** จำนวน top sales ที่แสดง */
  TOP_SALES_LIMIT: 5,
  /** จำนวน recent activity ที่แสดง */
  RECENT_ACTIVITY_LIMIT: 10,
} as const;

// ===========================================
// Alerts Thresholds
// ===========================================

export const ALERTS = {
  /** จำนวนชั่วโมงที่ lead ไม่มีคนรับ ถือว่าเป็น unclaimed alert */
  UNCLAIMED_HOURS: 24,
  /** จำนวนวันที่ lead contacted แต่ไม่มี update ถือว่าเป็น stale */
  STALE_DAYS: 7,
} as const;

// ===========================================
// Default Targets (สำหรับ placeholder ก่อนมีข้อมูลจริง)
// ===========================================

export const DEFAULT_TARGETS = {
  /** เป้า claimed leads ต่อเดือน */
  CLAIMED_PER_MONTH: 30,
  /** เป้า closed leads ต่อเดือน */
  CLOSED_PER_MONTH: 10,
} as const;

// ===========================================
// Time Periods
// ===========================================

export const VALID_PERIODS = [
  'today',
  'yesterday',
  'week',
  'month',
  'quarter',
  'year',
  'custom',
] as const;

export type PeriodType = typeof VALID_PERIODS[number];

// ===========================================
// Sort Options
// ===========================================

export const SORT_OPTIONS = {
  // LEADS: 'createdAt' is alias for 'date' - frontend uses createdAt, backend stores as date
  // Both are accepted for API compatibility (added in bugfix 2026-01-17)
  LEADS: ['date', 'createdAt', 'company', 'status'] as const,
  SALES: ['claimed', 'closed', 'conversionRate'] as const,
  CAMPAIGNS: ['leads', 'closed', 'conversionRate'] as const,
} as const;

export const SORT_ORDERS = ['asc', 'desc'] as const;

// ===========================================
// Export Settings
// ===========================================

export const EXPORT = {
  /** จำนวน row สูงสุดที่ export ได้ */
  MAX_ROWS: 10000,
  /** ขนาดไฟล์สูงสุด (bytes) - 50MB */
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  /** ค่าเฉลี่ยการขายต่อ deal (บาท) สำหรับคำนวณ estimatedRevenue */
  AVERAGE_DEAL_SIZE: 75000,
  /** จำนวน row สูงสุดที่แสดงใน PDF preview */
  PDF_MAX_PREVIEW_ROWS: 50,
} as const;

export const EXPORT_TYPES = ['leads', 'sales', 'campaigns', 'all'] as const;
export type ExportType = typeof EXPORT_TYPES[number];

export const EXPORT_FORMATS = ['xlsx', 'csv', 'pdf'] as const;
export type ExportFormat = typeof EXPORT_FORMATS[number];

// ===========================================
// Admin Constants Export (All-in-one)
// ===========================================

export const ADMIN_CONSTANTS = {
  PAGINATION,
  DASHBOARD,
  ALERTS,
  DEFAULT_TARGETS,
  VALID_PERIODS,
  SORT_OPTIONS,
  SORT_ORDERS,
  EXPORT,
  EXPORT_TYPES,
  EXPORT_FORMATS,
} as const;
