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
// Team Management (Story 7-4)
export {
  getSalesTeamList,
  getSalesTeamMemberById,
  updateSalesTeamMember,
} from './admin/team-management.controller.js';
// Activity Log (Story 7-7)
export { getActivityLog } from './admin/activity-log.controller.js';
