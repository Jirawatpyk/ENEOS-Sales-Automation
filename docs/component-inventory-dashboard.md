# Component Inventory - Admin Dashboard

**Project:** ENEOS Admin Dashboard
**Part:** Frontend (Next.js 16)
**Generated:** 2026-02-01

---

## Overview

The Admin Dashboard contains **186 React components** organized by feature domain. Built with Shadcn/ui (Radix UI primitives) + Tailwind CSS.

---

## UI Base Components (Shadcn/ui) - 28 components

| Component | File | Description |
|-----------|------|-------------|
| AlertDialog | alert-dialog.tsx | Modal confirmation dialogs |
| Avatar | avatar.tsx | User profile images |
| Badge | badge.tsx | Status/label badges |
| Button | button.tsx | Interactive buttons |
| Calendar | calendar.tsx | Date picker calendar |
| Card | card.tsx | Content containers |
| ChartErrorBoundary | chart-error-boundary.tsx | Error boundary for charts |
| Checkbox | checkbox.tsx | Checkbox inputs |
| DateRangePicker | date-range-picker.tsx | Date range selection |
| Dialog | dialog.tsx | Modal dialogs |
| DropdownMenu | dropdown-menu.tsx | Dropdown menus |
| Input | input.tsx | Text inputs |
| Label | label.tsx | Form labels |
| Pagination | pagination.tsx | Page navigation |
| Popover | popover.tsx | Floating popovers |
| Progress | progress.tsx | Progress bars |
| RadioGroup | radio-group.tsx | Radio button groups |
| ScrollArea | scroll-area.tsx | Scrollable containers |
| Select | select.tsx | Dropdown selects |
| Separator | separator.tsx | Visual dividers |
| Sheet | sheet.tsx | Slide-out panels |
| Skeleton | skeleton.tsx | Loading placeholders |
| Switch | switch.tsx | Toggle switches |
| Table | table.tsx | Data tables |
| Tabs | tabs.tsx | Tab navigation |
| Toast | toast.tsx | Notification toasts |
| Toaster | toaster.tsx | Toast container |
| Tooltip | tooltip.tsx | Hover tooltips |

---

## Dashboard Components - 31 components

### KPI Cards
- `kpi-card.tsx` - Single KPI display with trend
- `kpi-card-skeleton.tsx` - Loading state
- `kpi-cards-grid.tsx` - Grid layout for KPIs

### Charts
- `lead-trend-chart.tsx` - Line chart for lead trends
- `lead-trend-chart-container.tsx` - Data fetching wrapper
- `lead-trend-chart-skeleton.tsx` - Loading state
- `lead-trend-chart-empty.tsx` - Empty state
- `status-distribution-chart.tsx` - Pie/donut chart
- `status-distribution-container.tsx` - Container wrapper
- `status-distribution-skeleton.tsx` - Loading state
- `status-distribution-empty.tsx` - Empty state

### Activity & Alerts
- `recent-activity.tsx` - Activity feed
- `recent-activity-container.tsx` - Container
- `recent-activity-skeleton.tsx` - Loading state
- `activity-item.tsx` - Single activity entry
- `alerts-panel.tsx` - Warning/info alerts
- `alerts-panel-container.tsx` - Container
- `alerts-panel-skeleton.tsx` - Loading state
- `alert-item.tsx` - Single alert entry

### Top Sales
- `top-sales-table.tsx` - Leaderboard table
- `top-sales-table-container.tsx` - Container
- `top-sales-table-skeleton.tsx` - Loading state
- `top-sales-table-empty.tsx` - Empty state

### Controls
- `dashboard-content.tsx` - Main dashboard layout
- `dashboard-error.tsx` - Error boundary
- `date-filter.tsx` - Period selector
- `custom-date-range.tsx` - Custom date picker
- `auto-refresh-toggle.tsx` - Auto-refresh switch
- `refresh-button.tsx` - Manual refresh
- `last-updated.tsx` - Timestamp display

---

## Campaigns Components - 24 components

### Table & Data
- `campaign-table.tsx` - Main campaigns table
- `campaign-table-columns.tsx` - Column definitions
- `campaign-table-pagination.tsx` - Table pagination
- `campaign-table-skeleton.tsx` - Loading state
- `campaigns-content.tsx` - Main layout
- `campaigns-error.tsx` - Error boundary

### Filters
- `campaign-period-filter.tsx` - Period selector
- `campaign-date-filter.tsx` - Date range filter
- `campaign-custom-date-range.tsx` - Custom dates
- `campaign-event-filter.tsx` - Event type filter
- `campaign-event-search.tsx` - Search input

### Details & Metrics
- `campaign-detail-sheet.tsx` - Slide-out detail panel
- `campaign-kpi-card.tsx` - Single KPI
- `campaign-kpi-card-skeleton.tsx` - Loading state
- `campaign-kpi-cards-grid.tsx` - KPI grid
- `campaign-performance-chart.tsx` - Performance visualization
- `campaign-chart-skeleton.tsx` - Loading state
- `campaign-events-table.tsx` - Event log table
- `campaign-events-skeleton.tsx` - Loading state

### Utilities
- `campaign-export-dropdown.tsx` - Export options
- `copy-email-button.tsx` - Copy to clipboard
- `rate-performance-badge.tsx` - Rate visualization
- `sortable-header.tsx` - Sortable column headers
- `index.ts` - Barrel exports

---

## Leads Components - 26 components

### Table & Data
- `leads-table.tsx` - Main leads table
- `leads-columns.tsx` - Column definitions
- `leads-pagination.tsx` - Pagination
- `leads-skeleton.tsx` - Loading state
- `leads-content.tsx` - Main layout
- `leads-error.tsx` - Error boundary

### Filters
- `leads-filters.tsx` - Filter controls
- `leads-status-filter.tsx` - Status dropdown
- `leads-owner-filter.tsx` - Owner dropdown
- `leads-source-filter.tsx` - Source filter
- `leads-date-filter.tsx` - Date range
- `leads-search.tsx` - Text search

### Detail Modal
- `lead-detail-sheet.tsx` - Slide-out detail
- `lead-info-section.tsx` - Basic info
- `lead-contact-section.tsx` - Contact details
- `lead-company-section.tsx` - Company info
- `lead-status-history.tsx` - Status timeline
- `lead-metrics-section.tsx` - Performance metrics

---

## Sales Components - 31 components

### Performance Overview
- `sales-content.tsx` - Main layout
- `sales-error.tsx` - Error boundary
- `sales-summary-cards.tsx` - Summary KPIs
- `sales-summary-skeleton.tsx` - Loading state

### Team Table
- `sales-team-table.tsx` - Performance table
- `sales-team-columns.tsx` - Column definitions
- `sales-team-skeleton.tsx` - Loading state
- `sales-team-empty.tsx` - Empty state

### Individual Performance
- `sales-trend-chart.tsx` - Individual trend
- `sales-trend-container.tsx` - Container
- `sales-trend-skeleton.tsx` - Loading state
- `sales-comparison-chart.tsx` - Team comparison

### Filters & Controls
- `sales-period-filter.tsx` - Period selector
- `sales-sort-options.tsx` - Sort controls

---

## Settings Components - 26 components

### Team Management (Story 7-4)
- `team-list.tsx` - Team members table
- `team-member-row.tsx` - Single member row
- `team-member-edit-dialog.tsx` - Edit modal
- `team-member-create-dialog.tsx` - Create modal
- `team-status-badge.tsx` - Status indicator
- `team-role-badge.tsx` - Role indicator

### LINE Linking (Story 7-4b)
- `unlinked-accounts-panel.tsx` - Unlinked accounts list
- `link-account-dialog.tsx` - Linking modal
- `line-account-card.tsx` - LINE account display

### Activity Log (Story 7-7)
- `activity-log-table.tsx` - Log table
- `activity-log-filters.tsx` - Filter controls
- `activity-log-pagination.tsx` - Pagination

### System Health (Story 7-5)
- `system-health-card.tsx` - Health status
- `service-status-item.tsx` - Service indicator

### Theme & Notifications (Story 7-2, 7-3)
- `theme-toggle.tsx` - Dark mode switch
- `notification-settings.tsx` - Notification prefs

---

## Export Components - 8 components

- `export-page-content.tsx` - Main layout
- `export-form.tsx` - Export configuration
- `export-type-select.tsx` - Type selector
- `export-format-select.tsx` - Format selector
- `export-date-range.tsx` - Date range
- `export-field-select.tsx` - Field selection
- `export-preview.tsx` - Preview panel
- `export-progress.tsx` - Download progress

---

## Layout Components - 5 components

- `header.tsx` - Top navigation bar
- `sidebar.tsx` - Side navigation
- `nav-links.tsx` - Navigation items
- `user-menu.tsx` - User dropdown
- `mobile-nav.tsx` - Mobile navigation

---

## Shared Components - 6 components

- `loading-spinner.tsx` - Loading indicator
- `error-message.tsx` - Error display
- `empty-state.tsx` - Empty content
- `confirm-dialog.tsx` - Confirmation modal
- `status-badge.tsx` - Lead status badge
- `trend-indicator.tsx` - Up/down arrow

---

## Custom Hooks - 45 hooks

### Data Fetching
- `use-dashboard-data` - Dashboard API
- `use-leads` - Leads list
- `use-lead` - Single lead
- `use-campaigns` - Campaigns list
- `use-campaign-stats` - Email metrics
- `use-campaign-events` - Event log
- `use-sales-performance` - Team metrics
- `use-sales-trend` - Individual trend
- `use-activity-log` - Activity log
- `use-sales-team` - Team list
- `use-system-health` - Health status

### State Management
- `use-lead-selection` - Multi-select
- `use-column-visibility` - Column toggle
- `use-pagination-params` - URL pagination
- `use-sort-params` - URL sorting
- `use-search-params` - URL search
- `use-date-filter-params` - URL dates
- `use-status-filter-params` - URL status
- `use-owner-filter-params` - URL owner
- `use-lead-source-filter-params` - URL source

### Features
- `use-export` - Export functionality
- `use-export-leads` - Lead export
- `use-export-campaigns` - Campaign export
- `use-auto-refresh` - Auto-refresh
- `use-notification-permission` - Browser notifications
- `use-notification-preferences` - Notification settings
- `use-chart-theme` - Chart colors
- `use-debounce` - Debounced values

### Team Management
- `use-team-management` - CRUD operations
- `use-create-team-member` - Create member
- `use-update-team-member` - Update member
- `use-unlinked-line-accounts` - Unlinked accounts
- `use-link-line-account` - Link account

---

## Architecture Patterns

### Container/Presenter Pattern
```
*-container.tsx → Data fetching + state
└── *.tsx → Pure presentation
```

### Skeleton Loading
```
*-skeleton.tsx → Loading placeholder
```

### Error Boundaries
```
*-error.tsx → Error fallback UI
```

### Empty States
```
*-empty.tsx → No data UI
```
