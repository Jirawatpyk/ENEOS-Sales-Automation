/**
 * ENEOS Sales Automation - Admin Dashboard Routes
 * Routes for Admin Dashboard API endpoints
 *
 * ใช้ Google OAuth authentication และ RBAC
 * เฉพาะ email domain @eneos.co.th เท่านั้น
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getDashboard,
  getLeads,
  getLeadById,
  getSalesPerformance,
  getSalesPerformanceTrend,
  getCampaigns,
  getCampaignDetail,
  exportData,
  getSalesTeam,
  // Team Management (Story 7-4)
  getSalesTeamList,
  getSalesTeamMemberById,
  updateSalesTeamMember,
  // Activity Log (Story 7-7)
  getActivityLog,
} from '../controllers/admin.controller.js';
// Campaign Stats (Story 5-2)
import {
  getCampaignStats,
  getCampaignById,
  getCampaignEvents,
} from '../controllers/admin/campaign-stats.controller.js';
import {
  // Team Management (Story 7-4b)
  createSalesTeamMember,
  getUnlinkedLINEAccounts,
  getUnlinkedDashboardMembers,
  linkLINEAccount,
} from '../controllers/admin/team-management.controller.js';
import {
  adminAuthMiddleware,
  requireViewer,
  requireAdmin,
} from '../middleware/admin-auth.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

// ===========================================
// Rate Limiters
// ===========================================

/**
 * Export-specific rate limiter
 * ป้องกันการ export บ่อยเกินไป (resource intensive)
 * Limit: 10 requests per hour per user
 */
const exportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Export rate limit exceeded. Maximum 10 exports per hour.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key by user email from req.user (set by adminAuthMiddleware)
  keyGenerator: (req) => {
    return req.user?.email || req.ip || 'unknown';
  },
});

// ===========================================
// Apply Auth Middleware to all admin routes
// ===========================================

router.use(adminAuthMiddleware);

// ===========================================
// User Info Endpoint (for frontend role sync)
// ===========================================

/**
 * GET /api/admin/me
 * ดึงข้อมูล current user พร้อม role
 * ใช้สำหรับ frontend เพื่อ sync role จาก backend
 *
 * Response:
 * - email: User email
 * - name: User name
 * - role: admin | viewer
 *
 * Access: Any authenticated user
 */
router.get('/me', (req, res) => {
  res.json({
    success: true,
    data: {
      email: req.user?.email || '',
      name: req.user?.name || '',
      role: req.user?.role || 'viewer',
    },
  });
});

// ===========================================
// Dashboard Endpoints
// ===========================================

/**
 * GET /api/admin/dashboard
 * ดึงข้อมูล Dashboard summary
 *
 * Query params:
 * - period: today | yesterday | week | month | quarter | year | custom
 * - startDate: ISO date (required for custom period)
 * - endDate: ISO date (required for custom period)
 *
 * Access: viewer, manager, admin
 */
router.get('/dashboard', requireViewer, asyncHandler(getDashboard));

// ===========================================
// Leads Endpoints
// ===========================================

/**
 * GET /api/admin/leads
 * ดึงรายการ leads แบบ paginated พร้อม filters
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - status: new | claimed | contacted | closed | lost | unreachable
 * - owner: sales team member ID
 * - campaign: campaign ID
 * - search: search text (company, customer name, email)
 * - startDate: ISO date
 * - endDate: ISO date
 * - sortBy: date | company | status (default: date)
 * - sortOrder: asc | desc (default: desc)
 *
 * Access: viewer, manager, admin
 */
router.get('/leads', requireViewer, asyncHandler(getLeads));

/**
 * GET /api/admin/leads/:id
 * ดึงข้อมูล lead detail พร้อม history
 *
 * Params:
 * - id: row number ใน Google Sheets
 *
 * Access: viewer, manager, admin
 */
router.get('/leads/:id', requireViewer, asyncHandler(getLeadById));

// ===========================================
// Sales Team Endpoints
// ===========================================

/**
 * GET /api/admin/sales-team
 * ดึงรายชื่อ Sales Team ทั้งหมด
 * ใช้สำหรับ Lead Filter by Owner dropdown
 *
 * Response:
 * - team: Array<{ id: string, name: string, email: string | null }>
 *
 * Access: viewer, manager, admin
 */
router.get('/sales-team', requireViewer, asyncHandler(getSalesTeam));

// ===========================================
// Team Management Endpoints (Story 7-4)
// Admin-only endpoints for managing sales team members
// ===========================================

/**
 * GET /api/admin/sales-team/list
 * ดึงรายชื่อ Sales Team พร้อม status, role, createdAt
 * ใช้สำหรับ Settings > Team Management page
 *
 * Query params:
 * - status: active | inactive | all (default: active)
 * - role: admin | sales | all (default: all)
 *
 * Response:
 * - data: Array<SalesTeamMemberFull>
 * - total: number
 *
 * Access: admin only (AC#10: Viewers cannot access team management)
 */
router.get('/sales-team/list', requireAdmin, asyncHandler(getSalesTeamList));

// ===========================================
// Team Management Endpoints (Story 7-4b)
// Manual member registration and LINE account linking
// IMPORTANT: Static routes MUST be defined BEFORE dynamic :lineUserId routes
// ===========================================

/**
 * POST /api/admin/sales-team
 * Create new sales team member manually (before LINE interaction)
 *
 * Body (all required except phone):
 * - name: string (min 2 chars)
 * - email: string (must be @eneos.co.th)
 * - phone: string (optional, Thai format 0[689]XXXXXXXX)
 * - role: 'admin' | 'sales'
 *
 * Response:
 * - data: SalesTeamMemberFull (with lineUserId = null)
 *
 * Access: admin only (Story 7-4b AC#1-7)
 */
router.post('/sales-team', requireAdmin, asyncHandler(createSalesTeamMember));

/**
 * GET /api/admin/sales-team/unlinked-line-accounts
 * Get LINE accounts that exist but are not linked to any Dashboard member
 *
 * Response:
 * - data: Array<{ lineUserId, name, createdAt }>
 * - total: number
 *
 * Access: admin only (Story 7-4b AC#9, #10, #13)
 */
router.get('/sales-team/unlinked-line-accounts', requireAdmin, asyncHandler(getUnlinkedLINEAccounts));

/**
 * GET /api/admin/sales-team/unlinked-dashboard-members
 * Get Dashboard members without LINE accounts (for reverse linking)
 *
 * Response:
 * - data: Array<SalesTeamMemberFull> (with lineUserId = null)
 * - total: number
 *
 * Access: admin only (Story 7-4b AC#14)
 */
router.get('/sales-team/unlinked-dashboard-members', requireAdmin, asyncHandler(getUnlinkedDashboardMembers));

/**
 * PATCH /api/admin/sales-team/email/:email/link
 * Link a LINE account to a Dashboard member
 *
 * Params:
 * - email: Dashboard member's email (identifier)
 *
 * Body:
 * - targetLineUserId: string (LINE User ID to link)
 *
 * Response:
 * - data: SalesTeamMemberFull (updated with linked lineUserId)
 *
 * Access: admin only (Story 7-4b AC#11, #12, #15)
 */
router.patch('/sales-team/email/:email/link', requireAdmin, asyncHandler(linkLINEAccount));

// ===========================================
// Dynamic :lineUserId routes (Story 7-4)
// MUST be AFTER static routes to avoid catching them
// ===========================================

/**
 * GET /api/admin/sales-team/:lineUserId
 * ดึงข้อมูล Sales Team member คนเดียว
 *
 * Params:
 * - lineUserId: LINE User ID
 *
 * Response:
 * - data: SalesTeamMemberFull
 *
 * Access: admin only
 */
router.get('/sales-team/:lineUserId', requireAdmin, asyncHandler(getSalesTeamMemberById));

/**
 * PATCH /api/admin/sales-team/:lineUserId
 * อัพเดทข้อมูล Sales Team member
 *
 * Params:
 * - lineUserId: LINE User ID
 *
 * Body (all optional):
 * - email: string | null (must be @eneos.co.th if string)
 * - phone: string | null
 * - role: 'admin' | 'sales'
 * - status: 'active' | 'inactive'
 *
 * Response:
 * - data: SalesTeamMemberFull (updated)
 *
 * Access: admin only (AC#5, AC#6, AC#7)
 */
router.patch('/sales-team/:lineUserId', requireAdmin, asyncHandler(updateSalesTeamMember));

// ===========================================
// Activity Log Endpoint (Story 7-7)
// ===========================================

/**
 * GET /api/admin/activity-log
 * Get all activity log entries with pagination and filters
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - from: ISO date (start date filter)
 * - to: ISO date (end date filter)
 * - status: Comma-separated status values (e.g., 'contacted,closed')
 * - changedBy: LINE User ID or 'System'
 *
 * Response:
 * - data.entries: Array<ActivityLogEntry>
 * - data.pagination: { page, limit, total, totalPages, hasNext, hasPrev }
 * - data.filters.changedByOptions: Unique changedBy values
 *
 * Access: admin only (AC#1: Only admin users can view activity log)
 */
router.get('/activity-log', requireAdmin, asyncHandler(getActivityLog));

// ===========================================
// Sales Performance Endpoints
// ===========================================

/**
 * GET /api/admin/sales-performance
 * ดึงข้อมูล team performance
 *
 * Query params:
 * - period: today | yesterday | week | month | quarter | year | custom
 * - startDate: ISO date (required for custom period)
 * - endDate: ISO date (required for custom period)
 * - sortBy: claimed | closed | conversionRate (default: closed)
 * - sortOrder: asc | desc (default: desc)
 *
 * Access: admin, viewer (read-only)
 */
router.get('/sales-performance', requireViewer, asyncHandler(getSalesPerformance));

/**
 * GET /api/admin/sales-performance/trend
 * ดึงข้อมูล daily trend สำหรับ individual salesperson
 *
 * Query params:
 * - userId: LINE User ID ของ salesperson (required)
 * - days: 7 | 30 | 90 (default: 30)
 *
 * Access: admin, viewer (read-only)
 */
router.get('/sales-performance/trend', requireViewer, asyncHandler(getSalesPerformanceTrend));

// ===========================================
// Campaign Endpoints
// ===========================================

// Story 5-2: Campaign Email Metrics Endpoints (from Brevo Campaign Events)
// IMPORTANT: These routes MUST be defined BEFORE the parameterized routes to avoid conflicts

/**
 * GET /api/admin/campaigns/stats
 * Get all campaign email metrics with pagination, search, and filtering (Story 5-2 AC#1)
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - search: string - Search by Campaign_Name (case-insensitive)
 * - dateFrom: ISO date - Filter by First_Event >= dateFrom
 * - dateTo: ISO date - Filter by First_Event <= dateTo
 * - sortBy: Last_Updated | First_Event | Campaign_Name | Delivered | Opened | Clicked | Open_Rate | Click_Rate
 * - sortOrder: asc | desc (default: desc)
 *
 * Access: viewer, admin
 */
router.get('/campaigns/stats', requireViewer, asyncHandler(getCampaignStats));

/**
 * GET /api/admin/campaigns/:id/stats
 * Get single campaign email metrics by Campaign_ID (Story 5-2 AC#2)
 *
 * Params:
 * - id: Campaign_ID (from Brevo camp_id)
 *
 * Returns 404 if campaign not found
 *
 * Access: viewer, admin
 */
router.get('/campaigns/:id/stats', requireViewer, asyncHandler(getCampaignById));

/**
 * GET /api/admin/campaigns/:id/events
 * Get campaign event log with pagination and filtering (Story 5-2 AC#3)
 *
 * Params:
 * - id: Campaign_ID
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - event: delivered | opened | click - Filter by event type
 * - dateFrom: ISO date - Filter by Event_At >= dateFrom
 * - dateTo: ISO date - Filter by Event_At <= dateTo
 *
 * Access: viewer, admin
 */
router.get('/campaigns/:id/events', requireViewer, asyncHandler(getCampaignEvents));

// Legacy: Campaign analytics based on Leads data (existing feature)

/**
 * GET /api/admin/campaigns
 * ดึงข้อมูล campaign analytics
 *
 * Query params:
 * - period: today | yesterday | week | month | quarter | year | custom (default: quarter)
 * - startDate: ISO date (required for custom period)
 * - endDate: ISO date (required for custom period)
 * - sortBy: leads | closed | conversionRate (default: closed)
 * - sortOrder: asc | desc (default: desc)
 *
 * Access: viewer, manager, admin
 */
router.get('/campaigns', requireViewer, asyncHandler(getCampaigns));

/**
 * GET /api/admin/campaigns/:campaignId
 * ดึงข้อมูล campaign detail
 *
 * Params:
 * - campaignId: Campaign ID
 *
 * Access: viewer, manager, admin
 */
router.get('/campaigns/:campaignId', requireViewer, asyncHandler(getCampaignDetail));

// ===========================================
// Export Endpoint
// ===========================================

/**
 * GET /api/admin/export
 * Export data to file
 *
 * Query params:
 * - type: leads | sales | campaigns | all (required)
 * - format: xlsx | csv | pdf (required)
 * - startDate: ISO date (optional)
 * - endDate: ISO date (optional)
 * - status: Lead status (optional)
 * - owner: Sales owner ID (optional)
 * - campaign: Campaign ID (optional)
 * - fields: Comma-separated field names (optional)
 *
 * Access: admin only (Story 1.5 AC#7: Viewers cannot export)
 * Rate Limit: 10 requests per hour
 */
router.get('/export', exportRateLimiter, requireAdmin, asyncHandler(exportData));

// ===========================================
// Export
// ===========================================

export default router;
