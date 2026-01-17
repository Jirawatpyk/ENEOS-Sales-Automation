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
} from '../controllers/admin.controller.js';
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
