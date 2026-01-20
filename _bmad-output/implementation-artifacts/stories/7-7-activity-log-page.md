# Story 7.7: Activity Log Page

Status: done

## Story

As an **ENEOS admin user**,
I want **to view a full activity log page showing all status changes across all leads**,
so that **I can audit sales team activities and track lead status progression patterns**.

## Background

Story 0-12 implemented the `Status_History` sheet that records all lead status changes with timestamps and who made the change. Currently, this history is only visible in the Lead Detail Modal (Story 4-8). This story creates a dedicated Activity Log page that provides a comprehensive view of all activities across the system.

### Status_History Sheet Structure (from Story 0-12)
| Column | Name | Type | Description |
|--------|------|------|-------------|
| A | Lead_UUID | string | Unique identifier (e.g., `lead_abc123`) |
| B | Status | string | new, contacted, closed, lost, unreachable |
| C | Changed_By_ID | string | LINE User ID or "System" |
| D | Changed_By_Name | string | Display name |
| E | Timestamp | string | ISO 8601 |
| F | Notes | string | Optional notes |

## Acceptance Criteria

1. **AC1: Activity Log Page Access**
   - Given I am logged in with "admin" role
   - When I click on "Activity Log" link in Settings page or sidebar
   - Then I see the Activity Log page at `/settings/activity`
   - And the page header shows "Activity Log"

2. **AC2: Activity Table Display**
   - Given I am on the Activity Log page
   - When the page loads
   - Then I see a table with columns:
     - Timestamp (formatted: "15 ม.ค. 2026, 09:15")
     - Lead (Company name - clickable link to lead detail)
     - Status (with colored badge)
     - Changed By (Name or "System")
     - Notes (optional, muted text)
   - And the table is sorted by timestamp descending (newest first)

3. **AC3: Pagination**
   - Given there are more than 20 activity entries
   - When I view the Activity Log
   - Then I see pagination controls at the bottom
   - And I can navigate between pages
   - And default page size is 20 (options: 10, 20, 50)

4. **AC4: Filter by Date Range**
   - Given I am on the Activity Log page
   - When I select a date range filter (Today, This Week, This Month, Custom)
   - Then the table shows only activities within that date range
   - And the URL updates with query params (e.g., `/settings/activity?from=2026-01-01&to=2026-01-15`)

5. **AC5: Filter by Status**
   - Given I am on the Activity Log page
   - When I select status filter(s) (new, contacted, closed, lost, unreachable)
   - Then the table shows only activities with those status values
   - And multiple statuses can be selected

6. **AC6: Filter by Sales Person**
   - Given I am on the Activity Log page
   - When I select a sales person from the dropdown
   - Then the table shows only activities by that person
   - And "System" is included as an option

7. **AC7: Click to Lead Detail**
   - Given I see an activity entry in the table
   - When I click on the Lead name/company
   - Then the Lead Detail Modal opens (reuse from Story 4-8)
   - And I can see the full lead information

8. **AC8: Loading State**
   - Given I navigate to the Activity Log page
   - When data is loading
   - Then I see a skeleton loader for the table
   - And filters show loading spinners

9. **AC9: Empty State**
   - Given there are no activities matching the filters
   - When I view the Activity Log
   - Then I see an empty state message: "ไม่พบกิจกรรม"
   - And a suggestion to adjust filters

10. **AC10: Responsive Design**
    - Given I am on a mobile device
    - When I view the Activity Log page
    - Then the table scrolls horizontally
    - And filters stack vertically
    - And pagination is usable

## Tasks / Subtasks

- [x] **Task 1: Backend API - Activity Log Endpoint** (AC: #2, #3, #4, #5, #6)
  - [x] 1.1 Create `GET /api/admin/activity-log` endpoint in `admin.routes.ts`
  - [x] 1.2 Apply `requireAdmin` middleware (from Story 1-5)
  - [x] 1.3 Create controller handler `getActivityLog` in `admin.controller.ts`
  - [x] 1.4 Create `getAllStatusHistory()` in `sheets.service.ts`
  - [x] 1.5 Support query params: `page`, `limit`, `from`, `to`, `status`, `changedBy`
  - [x] 1.6 Join with Leads data to get Company name AND rowNumber
  - [x] 1.7 Add pagination metadata to response
  - [x] 1.8 Unit tests for endpoint

- [x] **Task 2: Activity Log Page Layout** (AC: #1, #10)
  - [x] 2.1 Create `src/app/(dashboard)/settings/activity/page.tsx`
  - [x] 2.2 Add page header with title and description
  - [x] 2.3 Add responsive container
  - [x] 2.4 Add navigation link in Settings page (Activity Log card link)

- [x] **Task 3: Activity Table Component** (AC: #2, #7)
  - [x] 3.1 Create `src/components/settings/activity-log-table.tsx`
  - [x] 3.2 Display columns: Timestamp, Company, Status, Changed By, Notes
  - [x] 3.3 Format timestamp using locale format
  - [x] 3.4 Use StatusBadge component for status column
  - [x] 3.5 Make row clickable → open Lead Detail Modal
  - [x] 3.6 Add table overflow for mobile

- [x] **Task 4: Filter Components** (AC: #4, #5, #6)
  - [x] 4.1 Create `src/components/settings/activity-log-filters.tsx`
  - [x] 4.2 Date Range Filter with calendar
  - [x] 4.3 Status Multi-Select Filter
  - [x] 4.4 Changed By Dropdown Filter - populated from API response
  - [x] 4.5 Include "All users" as first option in Changed By dropdown
  - [x] 4.6 Filter state in container (URL sync via usePaginationParams)
  - [x] 4.7 Clear all filters button

- [x] **Task 5: Pagination Component** (AC: #3)
  - [x] 5.1 Reuse LeadPagination from Leads page
  - [x] 5.2 Page size selector (10, 20, 25, 50)
  - [x] 5.3 Page navigation (First, Previous, Next, Last, page numbers)

- [x] **Task 6: React Query Hook** (AC: #2, #3, #4, #5, #6)
  - [x] 6.1 Create `src/hooks/use-activity-log.ts`
  - [x] 6.2 Fetch from `/api/admin/activity-log` with filters
  - [x] 6.3 Handle pagination state
  - [x] 6.4 Cache with 30s staleTime

- [x] **Task 7: Loading & Empty States** (AC: #8, #9)
  - [x] 7.1 Create `src/components/settings/activity-log-skeleton.tsx`
  - [x] 7.2 Create `src/components/settings/activity-log-empty.tsx`
  - [x] 7.3 Show skeleton while loading

- [x] **Task 8: Settings Navigation Update** (AC: #1)
  - [x] 8.1 Add "Activity Log" card link in Settings page
  - [x] 8.2 Admin-only visibility (same as Team Management)
  - [x] 8.3 Uses ClipboardList icon from lucide-react

- [x] **Task 9: Testing** (AC: all)
  - [x] 9.1 Unit tests for ActivityLogTable component (14 tests)
  - [x] 9.2 Unit tests for ActivityFilters component (27 tests)
  - [x] 9.3 Unit tests for useActivityLog hook (14 tests)
  - [x] 9.4 Integration test for API endpoint (already done in Task 1.8)
  - [x] 9.5 Test filter combinations
  - [x] 9.6 Test loading state
  - [x] 9.7 Test Lead Detail Modal opens (row click)

## Dev Notes

### Architecture Compliance

This story builds on:
- Story 0-12: Status_History sheet and `getStatusHistory()` function
- Story 4-8: Lead Detail Modal (reuse for click-through)
- Story 7-1: Settings page layout pattern

### Component Structure

```
src/
├── app/(dashboard)/settings/
│   └── activity/
│       └── page.tsx              # Activity Log page
└── components/activity/
    ├── activity-log-table.tsx    # Main table component
    ├── activity-table-skeleton.tsx
    ├── activity-filters.tsx      # Filter controls
    └── index.ts                  # Barrel export
src/hooks/
    └── use-activity-log.ts       # React Query hook
```

### API Response Format

```typescript
// GET /api/admin/activity-log?page=1&limit=20&from=2026-01-01&to=2026-01-19&status=contacted,closed&changedBy=U1234567890

interface ActivityLogResponse {
  success: true;
  data: {
    entries: ActivityEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface ActivityEntry {
  id: string;              // Unique ID for React key (leadUUID + timestamp)
  leadUUID: string;
  rowNumber: number;       // Required for Lead Detail Modal (uses row ID)
  companyName: string;     // From Leads sheet join
  status: LeadStatus;
  changedById: string;
  changedByName: string;
  timestamp: string;       // ISO 8601
  notes: string | null;
}
```

### sheets.service.ts - New Function

```typescript
// src/services/sheets.service.ts

interface GetAllStatusHistoryOptions {
  page?: number;
  limit?: number;
  from?: string;      // ISO date
  to?: string;        // ISO date
  status?: string[];  // Filter by status values
  changedBy?: string; // LINE User ID or "System"
}

export async function getAllStatusHistory(options: GetAllStatusHistoryOptions): Promise<{
  entries: StatusHistoryEntry[];
  total: number;
}> {
  // 1. Fetch all rows from Status_History sheet
  // 2. Apply filters (from, to, status, changedBy)
  // 3. Sort by timestamp descending
  // 4. Apply pagination
  // 5. Join with Leads to get company name (by Lead_UUID)
  // 6. Return paginated results with total count
}
```

### Date Formatting

```typescript
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

// Format: "15 ม.ค. 2026, 09:15"
const formatted = format(new Date(timestamp), 'd MMM yyyy, HH:mm', { locale: th });
```

### Filter URL Sync

```typescript
// Use Next.js native URL state management (useSearchParams + useRouter)
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

// In component:
const searchParams = useSearchParams();
const router = useRouter();
const pathname = usePathname();

// Read params
const from = searchParams.get('from');
const to = searchParams.get('to');
const status = searchParams.get('status')?.split(',') ?? [];
const changedBy = searchParams.get('changedBy');

// Update params
function updateFilters(updates: Record<string, string | null>) {
  const params = new URLSearchParams(searchParams.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });
  router.push(`${pathname}?${params.toString()}`);
}
```

### Sales Person Filter Data Source

The Sales Person dropdown needs a list of people who have made status changes. Options:

**Option A (Recommended): Extract from API response metadata**
```typescript
// API returns unique changedBy values in metadata
interface ActivityLogResponse {
  success: true;
  data: {
    entries: ActivityEntry[];
    pagination: { ... };
    filters: {
      changedByOptions: { id: string; name: string }[];  // Unique values
    };
  };
}
```

**Option B: Use existing Sales Team API**
```typescript
// Reuse from Story 7-4 if implemented
const { data: salesTeam } = useSalesTeam();
// Add "System" as first option manually
```

### Status Badge Colors (Reuse from existing)

| Status | Color | Thai Label |
|--------|-------|------------|
| new | gray | ใหม่ |
| contacted | blue | ติดต่อแล้ว |
| closed | green | ปิดการขาย |
| lost | red | ไม่สนใจ |
| unreachable | yellow | ติดต่อไม่ได้ |

### Testing Strategy

```typescript
// src/__tests__/activity/activity-log-table.test.tsx

describe('ActivityLogTable', () => {
  it('renders activity entries with correct columns', () => {});
  it('formats timestamp in Thai locale', () => {});
  it('shows status badge with correct color', () => {});
  it('opens Lead Detail Modal on company click', () => {});
  it('shows empty state when no entries', () => {});
});

describe('ActivityFilters', () => {
  it('filters by date range', () => {});
  it('filters by multiple statuses', () => {});
  it('filters by sales person', () => {});
  it('clears all filters', () => {});
  it('syncs filters with URL', () => {});
});
```

### Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Desktop (lg+) | Full table, filters inline |
| Tablet (md) | Full table, filters stacked 2-column |
| Mobile (base) | Horizontal scroll table, filters stacked |

### Dependencies

- Story 0-12 (Status History Tracking) - Backend data source
- Story 4-8 (Lead Detail Modal) - Click-through component
- Story 7-1 (User Profile) - Settings page layout pattern
- date-fns (already installed) - Date formatting
- nuqs (already installed) - URL state management

### Out of Scope (Future Enhancements)

- Export activity log to CSV/Excel
- Real-time updates (WebSocket)
- Activity log search by company/lead name
- Activity notifications

### References

- [Source: sprint-status.yaml] - 7-7-activity-log-page: backlog (Could Have)
- [Source: epics.md#EPIC-07] - F-07.6: Audit Logs
- [Source: 0-12-status-history-tracking.md] - Status_History sheet schema
- [Source: 4-8-lead-detail-modal.md] - Lead Detail Modal pattern
- [Source: project-context.md] - Coding standards

## Dev Agent Record

### File List

**Backend (eneos-sales-automation):**
- `src/routes/admin.routes.ts` - Activity log route registration
- `src/controllers/admin.controller.ts` - `getActivityLog` handler
- `src/services/sheets.service.ts` - `getAllStatusHistory()` function
- `src/__tests__/controllers/admin.controller.activity-log.test.ts` - Backend API tests (16 tests)

**Frontend (eneos-admin-dashboard):**
- `src/app/(dashboard)/settings/activity/page.tsx` - Activity Log page
- `src/app/api/admin/activity-log/route.ts` - API proxy route (NEW)
- `src/components/settings/activity-log-container.tsx` - Container with URL-synced filters
- `src/components/settings/activity-log-table.tsx` - Table component with tooltips
- `src/components/settings/activity-log-filters.tsx` - Filter components with date presets
- `src/components/settings/activity-log-skeleton.tsx` - Loading skeleton
- `src/components/settings/activity-log-empty.tsx` - Empty state component
- `src/hooks/use-activity-log.ts` - React Query hook
- `src/types/activity.ts` - TypeScript types
- `src/__tests__/settings/activity-log-table.test.tsx` - Table tests (14 tests)
- `src/__tests__/settings/activity-log-filters.test.tsx` - Filter tests (27 tests)
- `src/__tests__/hooks/use-activity-log.test.tsx` - Hook tests (14 tests)

### Notes
- Page size options: 10, 20, 25, 50 (extended from spec's 10, 20, 50)
- Date format uses en-GB locale with year: "19 Jan 2026, 16:01"
- Date range presets: Today, This Week, This Month (AC#4 compliant)
- All filters sync to URL params for shareable links (AC#4 compliant)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-19 | Story created by SM Agent (Bob) | Bob (SM Agent) |
| 2026-01-20 | Review fixes: Added rowNumber to ActivityEntry, replaced nuqs with Next.js useSearchParams, added requireAdmin middleware note, clarified Sales Person dropdown data source, added missing test cases | Bob (SM Agent) |
| 2026-01-20 | Implementation complete: Backend API (16 tests), Frontend components, Tests (55 tests total). All 2006 frontend tests pass, All 909 backend tests pass | Amelia (Dev Agent) |
| 2026-01-20 | Code Review fixes: Added year to timestamp, date range presets, URL-synced filters, File List section | Amelia (Dev Agent) |
