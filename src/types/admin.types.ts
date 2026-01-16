/**
 * Admin Dashboard Types
 *
 * Type definitions สำหรับ Admin Dashboard API
 * ใช้ใน Backend API (/api/admin/*) และ Frontend (Next.js Dashboard)
 *
 * @module types/admin
 */

// ============================================================================
// Re-export Lead Status from main types (avoid duplication)
// ============================================================================

// Import LeadStatus จาก index.ts และ re-export
// ป้องกันการ define ซ้ำและรักษา single source of truth
import { LeadStatus as LeadStatusType, VALID_LEAD_STATUSES } from './index.js';

// Re-export สำหรับ external use
export { VALID_LEAD_STATUSES };
export type LeadStatus = LeadStatusType;

// ============================================================================
// Base API Response Types
// ============================================================================

/**
 * Standard API Response Format
 * ใช้สำหรับทุก endpoint ใน /api/admin/*
 */
export interface AdminApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  pagination?: PaginationMeta;
}

/**
 * Pagination Metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Period Information
 */
export interface PeriodInfo {
  type: 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
}

// ============================================================================
// Dashboard Types
// ============================================================================

/**
 * Daily Trend Data (for Frontend compatibility)
 * Used by Lead Trend Chart component
 */
export interface DailyTrend {
  date: string; // YYYY-MM-DD
  newLeads: number;
  closed: number;
}

/**
 * Dashboard Summary Response
 * GET /api/admin/dashboard
 */
export interface DashboardResponse {
  summary: DashboardSummary;
  trends: {
    daily: DailyTrend[];
  };
  statusDistribution: StatusDistribution;
  topSales: TopSalesPerson[];
  recentActivity: ActivityItem[];
  alerts: Alert[];
  period: PeriodInfo;
}

/**
 * Dashboard Summary Statistics
 */
export interface DashboardSummary {
  totalLeads: number;
  claimed: number;
  contacted: number;
  closed: number;
  lost: number;
  unreachable: number;
  conversionRate: number; // เปอร์เซ็นต์ (0-100)
  changes: {
    totalLeads: number;     // % เปลี่ยนแปลงเทียบกับช่วงก่อน
    claimed: number;
    closed: number;
  };
}

/**
 * Trend Data (Daily/Weekly)
 */
export interface TrendData {
  date: string; // YYYY-MM-DD
  leads: number;
  claimed: number;
  contacted: number;
  closed: number;
}

/**
 * Status Distribution
 */
export interface StatusDistribution {
  new: number;
  claimed: number;
  contacted: number;
  closed: number;
  lost: number;
  unreachable: number;
}

/**
 * Top Sales Person (Leaderboard)
 */
export interface TopSalesPerson {
  id: string;              // LINE User ID
  name: string;
  email: string;
  claimed: number;
  contacted: number;
  closed: number;
  conversionRate: number;  // เปอร์เซ็นต์
  rank: number;
}

/**
 * Recent Activity Item
 */
export interface ActivityItem {
  id: string;
  type: 'new' | 'claimed' | 'contacted' | 'closed' | 'lost' | 'unreachable';
  salesId: string;
  salesName: string;
  leadId: number;          // Row number
  company: string;
  customerName: string;
  timestamp: string;       // ISO 8601
}

/**
 * Alert/Warning Item
 */
export interface Alert {
  id: string;
  type: 'unclaimed' | 'stale';
  severity: 'warning' | 'info' | 'error';
  message: string;
  count: number;
  action: {
    label: string;
    url: string;
  };
}

// ============================================================================
// Leads Types
// ============================================================================

/**
 * Leads List Response
 * GET /api/admin/leads
 */
export interface LeadsListResponse {
  data: LeadItem[];
  pagination: PaginationMeta;
  filters: {
    applied: AppliedFilters;
    available: AvailableFilters;
  };
}

/**
 * Lead Item (List View)
 */
export interface LeadItem {
  row: number;                    // Primary Key (Row number in Google Sheets)
  date: string;                   // ISO 8601
  customerName: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  website: string;
  capital: string;
  status: LeadStatus;
  owner: {
    id: string;                   // LINE User ID
    name: string;
  } | null;
  campaign: {
    id: string;
    name: string;
  };
  source: string;                 // e.g., "brevo_click"
  talkingPoint: string;
  clickedAt: string;              // ISO 8601
  claimedAt: string | null;       // ISO 8601
  contactedAt: string | null;     // ISO 8601
  closedAt: string | null;        // ISO 8601
}

/**
 * Lead Detail Response
 * GET /api/admin/leads/:id
 */
export interface LeadDetailResponse {
  row: number;
  date: string;
  customerName: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  website: string;
  capital: string;
  status: LeadStatus;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  campaign: {
    id: string;
    name: string;
    subject: string;
  };
  source: string;
  leadId: string;
  eventId: string;
  talkingPoint: string;
  history: StatusHistoryItem[];
  metrics: LeadMetrics;
}

/**
 * Status History Item
 */
export interface StatusHistoryItem {
  status: LeadStatus;
  by: string;              // ชื่อผู้ทำการเปลี่ยนสถานะ
  timestamp: string;       // ISO 8601
}

/**
 * Lead Metrics (Performance)
 */
export interface LeadMetrics {
  responseTime: number;    // นาที - เวลาที่ใช้ในการรับ lead (claimed - new)
  closingTime: number;     // นาที - เวลาที่ใช้ในการปิดการขาย (closed - claimed)
  age: number;             // นาที - อายุของ lead ตั้งแต่สร้าง
}

/**
 * Applied Filters (Query Parameters)
 */
export interface AppliedFilters {
  status?: LeadStatus;
  owner?: string;
  campaign?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Available Filters (Options for Dropdowns)
 */
export interface AvailableFilters {
  statuses: LeadStatus[];
  owners: OwnerOption[];
  campaigns: CampaignOption[];
}

/**
 * Owner Option (Filter Dropdown)
 */
export interface OwnerOption {
  id: string;
  name: string;
}

/**
 * Campaign Option (Filter Dropdown)
 */
export interface CampaignOption {
  id: string;
  name: string;
}

// ============================================================================
// Sales Performance Types
// ============================================================================

/**
 * Sales Performance Response
 * GET /api/admin/sales-performance
 */
export interface SalesPerformanceResponse {
  period: PeriodInfo;
  team: SalesTeamMember[];
  totals: SalesTeamTotals;
  comparison: SalesComparison;
}

/**
 * Sales Team Member
 */
export interface SalesTeamMember {
  id: string;                    // LINE User ID
  name: string;
  email: string;
  phone: string;
  avatar?: string;               // Google profile photo URL
  stats: SalesStats;
  target: SalesTarget;
  trend: SalesTrendItem[];
}

/**
 * Sales Statistics
 */
export interface SalesStats {
  claimed: number;
  contacted: number;
  closed: number;
  lost: number;
  unreachable: number;
  conversionRate: number;        // เปอร์เซ็นต์
  avgResponseTime: number;       // นาที
  avgClosingTime: number;        // นาที
}

/**
 * Sales Target
 */
export interface SalesTarget {
  claimed: number;
  closed: number;
  progress: number;              // เปอร์เซ็นต์ (0-100)
}

/**
 * Sales Trend Item (Weekly)
 */
export interface SalesTrendItem {
  week: string;                  // e.g., "W1", "W2"
  closed: number;
}

/**
 * Sales Team Totals
 */
export interface SalesTeamTotals {
  teamSize: number;
  claimed: number;
  contacted: number;
  closed: number;
  lost: number;
  unreachable: number;
  conversionRate: number;
  avgResponseTime: number;       // นาที
  avgClosingTime: number;        // นาที
}

/**
 * Sales Comparison (Period over Period)
 */
export interface SalesComparison {
  previousPeriod: {
    claimed: number;
    closed: number;
    conversionRate: number;
  };
  changes: {
    claimed: number;             // % เปลี่ยนแปลง
    closed: number;
    conversionRate: number;
  };
}

// ============================================================================
// Campaign Types
// ============================================================================

/**
 * Campaigns Response
 * GET /api/admin/campaigns
 */
export interface CampaignsResponse {
  campaigns: CampaignItem[];
  totals: CampaignTotals;
  comparison: CampaignComparison;
  topPerformers: TopCampaign[];
  period: PeriodInfo;
}

/**
 * Campaign Item
 */
export interface CampaignItem {
  id: string;
  name: string;
  subject: string;
  startDate: string;             // ISO 8601
  stats: CampaignStats;
  trend: CampaignTrendItem[];
}

/**
 * Campaign Statistics
 */
export interface CampaignStats {
  leads: number;
  claimed: number;
  contacted: number;
  closed: number;
  lost: number;
  unreachable: number;
  conversionRate: number;        // เปอร์เซ็นต์
  claimRate: number;             // เปอร์เซ็นต์
  estimatedRevenue: number;      // บาท
}

/**
 * Campaign Trend Item (Weekly)
 */
export interface CampaignTrendItem {
  week: string;                  // e.g., "W1", "W2"
  leads: number;
  closed: number;
}

/**
 * Campaign Totals
 */
export interface CampaignTotals {
  campaigns: number;
  leads: number;
  claimed: number;
  closed: number;
  conversionRate: number;
  estimatedRevenue: number;
}

/**
 * Campaign Comparison
 */
export interface CampaignComparison {
  previousPeriod: {
    leads: number;
    closed: number;
    conversionRate: number;
  };
  changes: {
    leads: number;               // % เปลี่ยนแปลง
    closed: number;
    conversionRate: number;
  };
}

/**
 * Top Campaign
 */
export interface TopCampaign {
  id: string;
  name: string;
  conversionRate: number;
}

// ============================================================================
// Export Types
// ============================================================================

/**
 * Export Request Body
 * POST /api/admin/export/async
 */
export interface ExportRequest {
  type: 'leads' | 'sales' | 'campaigns' | 'all';
  format: 'xlsx' | 'csv' | 'pdf';
  filters?: {
    startDate?: string;
    endDate?: string;
    status?: LeadStatus;
    owner?: string;
    campaign?: string;
  };
  notifyEmail?: string;
}

/**
 * Export Job Response
 * POST /api/admin/export/async
 */
export interface ExportJobResponse {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  estimatedTime: number;         // วินาที
  message: string;
}

/**
 * Export Job Status Response
 * GET /api/admin/export/jobs/:jobId
 */
export interface ExportJobStatusResponse {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;            // ISO 8601
  fileSize?: number;             // bytes
  rowCount?: number;
  error?: string;
}

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Common Query Parameters
 */
export interface BaseQueryParams {
  period?: 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: string;            // ISO 8601
  endDate?: string;              // ISO 8601
}

/**
 * Pagination Query Parameters
 */
export interface PaginationQueryParams {
  page?: number;
  limit?: number;                // Max: 100
}

/**
 * Sort Query Parameters
 */
export interface SortQueryParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Leads List Query Parameters
 * GET /api/admin/leads
 */
export interface LeadsQueryParams extends PaginationQueryParams, SortQueryParams {
  status?: LeadStatus;
  owner?: string;                // LINE User ID
  campaign?: string;             // Campaign ID
  search?: string;               // Search in company, customerName, email
  startDate?: string;
  endDate?: string;
}

/**
 * Sales Performance Query Parameters
 * GET /api/admin/sales-performance
 */
export interface SalesPerformanceQueryParams extends BaseQueryParams, SortQueryParams {
  // Additional filters can be added here
}

/**
 * Campaigns Query Parameters
 * GET /api/admin/campaigns
 */
export interface CampaignsQueryParams extends BaseQueryParams {
  sortBy?: 'leads' | 'closed' | 'conversionRate';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Export Query Parameters
 * GET /api/admin/export
 */
export interface ExportQueryParams {
  type: 'leads' | 'sales' | 'campaigns' | 'all';
  format: 'xlsx' | 'csv' | 'pdf';
  startDate?: string;
  endDate?: string;
  status?: LeadStatus;
  owner?: string;
  campaign?: string;
  fields?: string;               // Comma-separated field names
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * API Error Codes
 */
export type AdminApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

/**
 * Validation Error Details
 */
export interface ValidationErrorDetails {
  [field: string]: string;
}

// ============================================================================
// Stats Types
// ============================================================================

/**
 * Leads Statistics Response
 * GET /api/admin/leads/stats
 */
export interface LeadsStatsResponse {
  total: number;
  byStatus: StatusDistribution;
  byCampaign: CampaignCount[];
  byOwner: OwnerCount[];
  byIndustry: IndustryCount[];
  averages: {
    responseTime: number;        // นาที
    closingTime: number;         // นาที
  };
}

/**
 * Campaign Count
 */
export interface CampaignCount {
  id: string;
  name: string;
  count: number;
}

/**
 * Owner Count
 */
export interface OwnerCount {
  id: string;
  name: string;
  count: number;
}

/**
 * Industry Count
 */
export interface IndustryCount {
  industry: string;
  count: number;
}

// ============================================================================
// Individual Sales Performance Types
// ============================================================================

/**
 * Individual Sales Performance Response
 * GET /api/admin/sales-performance/:userId
 */
export interface IndividualSalesPerformanceResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  stats: SalesStats;
  leads: SalesPersonLead[];
  dailyTrend: DailyTrendItem[];
}

/**
 * Sales Person Lead (Recent Leads)
 */
export interface SalesPersonLead {
  row: number;
  company: string;
  status: LeadStatus;
  claimedAt: string;             // ISO 8601
  closedAt?: string;             // ISO 8601
}

/**
 * Daily Trend Item
 */
export interface DailyTrendItem {
  date: string;                  // YYYY-MM-DD
  claimed: number;
  closed: number;
}

/**
 * Daily Metric (Extended for Trend Chart)
 * Used by Individual Trend Chart component
 */
export interface DailyMetric {
  date: string;                  // YYYY-MM-DD
  claimed: number;
  contacted: number;
  closed: number;
  conversionRate: number;        // เปอร์เซ็นต์
}

/**
 * Sales Performance Trend Response
 * GET /api/admin/sales-performance/trend
 */
export interface SalesPerformanceTrendResponse {
  userId: string;
  name: string;
  period: number;                // days (7, 30, 90)
  dailyData: DailyMetric[];
  teamAverage: DailyMetric[];
}

/**
 * Sales Performance Trend Query Parameters
 * GET /api/admin/sales-performance/trend
 */
export interface SalesPerformanceTrendQueryParams {
  userId: string;
  days?: number;                 // 7, 30, or 90 (default: 30)
}

// ============================================================================
// Campaign Detail Types
// ============================================================================

/**
 * Campaign Detail Response
 * GET /api/admin/campaigns/:id
 */
export interface CampaignDetailResponse {
  campaign: {
    id: string;
    name: string;
    subject: string;
    startDate: string;           // ISO 8601
  };
  stats: CampaignStats;
  leadsByStatus: StatusDistribution;
  leadsBySales: SalesLeadCount[];
  dailyTrend: DailyTrendItem[];
  recentLeads: RecentCampaignLead[];
}

/**
 * Sales Lead Count (for Campaign)
 */
export interface SalesLeadCount {
  id: string;
  name: string;
  count: number;
  closed: number;
}

/**
 * Recent Campaign Lead
 */
export interface RecentCampaignLead {
  row: number;
  company: string;
  status: LeadStatus;
  date: string;                  // ISO 8601
}
