/**
 * ENEOS Sales Automation - Admin Dashboard Controller
 *
 * Re-exports all admin controllers for backward compatibility.
 * Individual controllers are now split into separate files under ./admin/
 *
 * @module controllers/admin
 */

// Re-export all controllers for backward compatibility
export { getDashboard } from './admin/dashboard.controller.js';
export { getLeads, getLeadById } from './admin/leads.controller.js';
export { getSalesPerformance, getSalesPerformanceTrend } from './admin/sales.controller.js';
export { getCampaigns, getCampaignDetail } from './admin/campaigns.controller.js';
export { exportData } from './admin/export.controller.js';
export { getSalesTeam } from './admin/team.controller.js';
