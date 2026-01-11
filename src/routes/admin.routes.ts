/**
 * ENEOS Sales Automation - Admin Dashboard Routes
 * Routes for Admin Dashboard API endpoints
 *
 * ใช้ Google OAuth authentication และ RBAC
 * เฉพาะ email domain @eneos.co.th เท่านั้น
 */

import { Router } from 'express';
import {
  getDashboard,
  getLeads,
  getLeadById,
  getSalesPerformance,
} from '../controllers/admin.controller.js';
import {
  adminAuthMiddleware,
  requireViewer,
  requireManager,
} from '../middleware/admin-auth.js';
import { asyncHandler } from '../middleware/error-handler.js';

const router = Router();

// ===========================================
// Apply Auth Middleware to all admin routes
// ===========================================

router.use(adminAuthMiddleware);

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
 * Access: manager, admin
 */
router.get('/sales-performance', requireManager, asyncHandler(getSalesPerformance));

// ===========================================
// Export
// ===========================================

export default router;
