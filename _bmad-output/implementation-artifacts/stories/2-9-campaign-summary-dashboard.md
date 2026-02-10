# Story 2.9: Campaign Summary on Main Dashboard

Status: dev-complete

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **sales manager**,
I want **the main Dashboard to show a Campaign Summary (headline metrics + top campaigns) in place of the Status Distribution donut chart**,
So that **I can see email campaign performance at a glance without navigating to the Campaigns page**.

## Acceptance Criteria

1. **AC1:** Status Distribution donut chart is **removed** from the main Dashboard and replaced by a Campaign Summary component in the same grid position.
2. **AC2:** Campaign Summary displays 3 headline metrics: **Total Delivered**, **Avg Open Rate (%)**, **Avg Click Rate (%)** — sourced from backend `campaignSummary` in the dashboard response.
3. **AC3:** Campaign Summary displays a **Top 3 Campaigns** list ranked by click rate, each showing campaign name and click rate with a visual progress bar.
4. **AC4:** Campaign Summary includes a **"View All Campaigns"** link that navigates to `/campaigns`.
5. **AC5:** When no campaign data exists, Campaign Summary shows an empty state ("No campaign data available") — no error.
6. **AC6:** Loading state shows a skeleton matching the Campaign Summary layout (3 metric placeholders + 3 list item placeholders).
7. **AC7:** Backend `GET /api/admin/dashboard` response includes a new `campaignSummary` field with: `totalCampaigns`, `totalDelivered`, `avgOpenRate`, `avgClickRate`, `topCampaigns[]` (top 3 by click rate with `campaignId`, `campaignName`, `clickRate`).
8. **AC8:** If campaign stats service fails, dashboard still returns all lead data — `campaignSummary` is `null` (graceful degradation).
9. **AC9:** All existing dashboard tests pass. New tests cover: Campaign Summary rendered, empty state, loading skeleton, top campaigns ranking, backend campaignSummary field, graceful degradation.

## Tasks / Subtasks

- [x] Task 1: Backend — Add `campaignSummary` to Dashboard response (AC: #7, #8)
  - [x] 1.1: Add `CampaignSummary` and `TopCampaignItem` interfaces to `src/types/admin.types.ts`
  - [x] 1.2: Add `campaignSummary: CampaignSummary | null` to `DashboardResponse` interface
  - [x] 1.3: In `dashboard.controller.ts` → `getDashboard()`: import `getAllCampaignStats`, call it, aggregate metrics, add to response
  - [x] 1.4: Graceful degradation — wrap campaign stats call in try/catch, set `campaignSummary: null` on failure
  - [x] 1.5: Add `CAMPAIGN_SUMMARY_TOP_LIMIT: 3` to `DASHBOARD` constants in `admin.constants.ts`
  - [x] 1.6: Update/add backend tests for dashboard controller with campaignSummary

- [x] Task 2: Frontend Types — Add `CampaignSummary` to Dashboard types (AC: #7)
  - [x] 2.1: Add `CampaignSummary` and `TopCampaignItem` interfaces to `eneos-admin-dashboard/src/types/dashboard.ts`
  - [x] 2.2: Add `campaignSummary: CampaignSummary | null` to `DashboardData` interface

- [x] Task 3: Frontend — Create Campaign Summary component (AC: #2, #3, #4, #5, #6)
  - [x] 3.1: Create `eneos-admin-dashboard/src/components/dashboard/campaign-summary.tsx` — presentational component
  - [x] 3.2: Render 3 headline metrics (Total Delivered, Avg Open Rate, Avg Click Rate) in a row
  - [x] 3.3: Render "Top Campaigns" list — up to 3 items with campaign name + click rate + progress bar
  - [x] 3.4: Render "View All Campaigns →" link to `/campaigns` using Next.js `Link`
  - [x] 3.5: Create `eneos-admin-dashboard/src/components/dashboard/campaign-summary-skeleton.tsx`
  - [x] 3.6: Create `eneos-admin-dashboard/src/components/dashboard/campaign-summary-empty.tsx`
  - [x] 3.7: Create `eneos-admin-dashboard/src/components/dashboard/campaign-summary-container.tsx` — data fetching wrapper using `useDashboardData()`

- [x] Task 4: Frontend — Replace Status Distribution in dashboard layout (AC: #1)
  - [x] 4.1: In `dashboard-content.tsx`: replace `StatusDistributionContainer` import → `CampaignSummaryContainer`
  - [x] 4.2: Replace `<StatusDistributionContainer />` + its Suspense fallback → `<CampaignSummaryContainer />` + `<CampaignSummarySkeleton />`
  - [x] 4.3: Update barrel export `src/components/dashboard/index.ts` — remove Status Distribution exports, add Campaign Summary exports
  - [x] 4.4: **Delete** Status Distribution files (4 component files)

- [x] Task 5: Tests (AC: #9)
  - [x] 5.1: Create `eneos-admin-dashboard/src/__tests__/campaign-summary.test.tsx` — presentational component tests
  - [x] 5.2: Create `eneos-admin-dashboard/src/__tests__/campaign-summary-container.test.tsx` — container integration tests
  - [x] 5.3: **Delete** Status Distribution test files (5 test files)
  - [x] 5.4: Update `dashboard-content` tests if they reference Status Distribution — verified no references remain
  - [x] 5.5: Backend: update `dashboard.controller.test.ts` — verify `campaignSummary` in response
  - [x] 5.6: Run `npm test` in both projects — all pass (backend 1424, frontend 3446)
  - [x] 5.7: Run `npm run build` in dashboard — TypeScript compiles with 0 errors

## Dev Notes

### Target Layout (Option A — approved by Jiraw)

```
📊 Campaign Summary
┌─────────────────────────────────────┐
│  Delivered    Open Rate   Click Rate│
│  2,500        25.0%       6.0%     │
│                                     │
│  Top Campaigns                      │
│  1. Valentine's Day     ▓▓▓▓░ 8.5% │
│  2. ENEOS Q1 2026       ▓▓▓░░ 6.2% │
│  3. Year-End Promo      ▓▓░░░ 4.1% │
│                                     │
│              View All Campaigns →   │
└─────────────────────────────────────┘
```

### Data Source — Backend (NEW)

```typescript
// GET /api/admin/dashboard response — add this field:
{
  summary: DashboardSummary,         // existing
  campaignSummary: CampaignSummary | null,  // ← NEW
  trends: { daily: DailyTrend[] },   // existing
  topSales: TopSalesPerson[],        // existing
  recentActivity: ActivityItem[],    // existing
  alerts: Alert[],                   // existing
  period: PeriodInfo,                // existing
}

// New types:
interface TopCampaignItem {
  campaignId: number;
  campaignName: string;
  clickRate: number;          // percentage (0-100)
}

interface CampaignSummary {
  totalCampaigns: number;
  totalDelivered: number;
  avgOpenRate: number;        // percentage (0-100)
  avgClickRate: number;       // percentage (0-100)
  topCampaigns: TopCampaignItem[];  // max 3, sorted by clickRate desc
}
```

### Backend Implementation Guide

**File:** `src/controllers/admin/dashboard.controller.ts`

```typescript
// Add import at top:
import { getAllCampaignStats } from '../../services/campaign-stats.service.js';

// Inside getDashboard(), after existing lead processing:
let campaignSummary: CampaignSummary | null = null;
try {
  const campaignResult = await getAllCampaignStats({ page: 1, limit: 100 });
  const stats = campaignResult.data;

  if (stats.length > 0) {
    const totalDelivered = stats.reduce((sum, c) => sum + c.delivered, 0);
    const totalOpened = stats.reduce((sum, c) => sum + c.opened, 0);
    const totalClicked = stats.reduce((sum, c) => sum + c.clicked, 0);
    // Weighted average — accurate when campaigns have different delivery volumes
    const avgOpenRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const avgClickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;

    // Top 3 by click rate
    const topCampaigns = [...stats]
      .sort((a, b) => b.clickRate - a.clickRate)
      .slice(0, DASHBOARD.CAMPAIGN_SUMMARY_TOP_LIMIT)
      .map(c => ({
        campaignId: c.campaignId,
        campaignName: c.campaignName,
        clickRate: c.clickRate,
      }));

    campaignSummary = {
      totalCampaigns: stats.length,
      totalDelivered,
      avgOpenRate: Number(avgOpenRate.toFixed(1)),
      avgClickRate: Number(avgClickRate.toFixed(1)),
      topCampaigns,
    };
  }
} catch (_error) {
  // Graceful degradation — campaign summary is optional
  dashboardLogger.warn('Failed to fetch campaign summary for dashboard');
  campaignSummary = null;
}

// Add to response:
res.json({ success: true, data: { ...existingData, campaignSummary } });
```

**Constants:** `src/constants/admin.constants.ts`
```typescript
export const DASHBOARD = {
  TOP_SALES_LIMIT: 5,
  RECENT_ACTIVITY_LIMIT: 10,
  CAMPAIGN_SUMMARY_TOP_LIMIT: 3,  // ← ADD
} as const;
```

### Frontend Component Pattern

**Container** (`campaign-summary-container.tsx`):
```typescript
'use client';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { CampaignSummary } from './campaign-summary';
import { CampaignSummarySkeleton } from './campaign-summary-skeleton';
import { CampaignSummaryEmpty } from './campaign-summary-empty';

export function CampaignSummaryContainer() {
  const { data, isLoading } = useDashboardData();

  if (isLoading) return <CampaignSummarySkeleton />;

  const campaignSummary = data?.campaignSummary;
  if (!campaignSummary) return <CampaignSummaryEmpty />;

  return <CampaignSummary data={campaignSummary} />;
}
```

**Presentational** (`campaign-summary.tsx`):
```typescript
// Props: { data: CampaignSummary }
// Structure:
// Card > CardHeader (title + BarChart3 icon)
//       > CardContent
//           > 3 metric items in flex row (Delivered, Open Rate, Click Rate)
//           > Separator
//           > "Top Campaigns" heading
//           > 3 campaign items with:
//               - Rank number
//               - Campaign name (truncated)
//               - Progress bar (width = clickRate / maxClickRate * 100%)
//               - Click rate percentage
//           > "View All Campaigns →" link
```

### Progress Bar for Top Campaigns

```tsx
// Calculate relative width based on max click rate in the list
const maxRate = Math.max(...topCampaigns.map(c => c.clickRate), 1);

{topCampaigns.map((campaign, index) => (
  <div key={campaign.campaignId} className="flex items-center gap-3">
    <span className="text-sm text-muted-foreground w-4">{index + 1}.</span>
    <span className="text-sm font-medium truncate flex-1">{campaign.campaignName}</span>
    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-emerald-500 rounded-full"
        style={{ width: `${(campaign.clickRate / maxRate) * 100}%` }}
      />
    </div>
    <span className="text-sm text-muted-foreground w-12 text-right">
      {campaign.clickRate.toFixed(1)}%
    </span>
  </div>
))}
```

### Grid Position in Dashboard

**File:** `eneos-admin-dashboard/src/components/dashboard/dashboard-content.tsx`

```tsx
// Current layout (2 columns):
<div className="grid gap-6 md:grid-cols-2">
  <LeadTrendChartContainer />         {/* Column 1 — KEEP */}
  <StatusDistributionContainer />     {/* Column 2 — REPLACE */}
</div>

// New layout:
<div className="grid gap-6 md:grid-cols-2">
  <LeadTrendChartContainer />         {/* Column 1 — KEEP */}
  <CampaignSummaryContainer />        {/* Column 2 — NEW */}
</div>
```

### Files to DELETE (Status Distribution)

| File | Type |
|------|------|
| `src/components/dashboard/status-distribution-chart.tsx` | Component |
| `src/components/dashboard/status-distribution-container.tsx` | Container |
| `src/components/dashboard/status-distribution-empty.tsx` | Empty state |
| `src/components/dashboard/status-distribution-skeleton.tsx` | Skeleton |
| `src/__tests__/status-distribution-chart.test.tsx` | Test |
| `src/__tests__/status-distribution-container.test.tsx` | Test |
| `src/__tests__/status-distribution-empty.test.tsx` | Test (if exists) |
| `src/__tests__/status-distribution-skeleton.test.tsx` | Test (if exists) |

### Files to CREATE

| File | Purpose |
|------|---------|
| `eneos-admin-dashboard/src/components/dashboard/campaign-summary.tsx` | Presentational component |
| `eneos-admin-dashboard/src/components/dashboard/campaign-summary-container.tsx` | Container with hook |
| `eneos-admin-dashboard/src/components/dashboard/campaign-summary-skeleton.tsx` | Loading skeleton |
| `eneos-admin-dashboard/src/components/dashboard/campaign-summary-empty.tsx` | Empty state |
| `eneos-admin-dashboard/src/__tests__/campaign-summary.test.tsx` | Presentational tests |
| `eneos-admin-dashboard/src/__tests__/campaign-summary-container.test.tsx` | Container tests |

### Files to MODIFY

| File | Change |
|------|--------|
| **Backend** `src/types/admin.types.ts` | Add `CampaignSummary`, `TopCampaignItem` interfaces |
| **Backend** `src/controllers/admin/dashboard.controller.ts` | Add campaign stats query + aggregation + graceful degradation |
| **Backend** `src/constants/admin.constants.ts` | Add `CAMPAIGN_SUMMARY_TOP_LIMIT: 3` |
| **Backend** `src/__tests__/controllers/admin/dashboard.controller.test.ts` | Add campaignSummary tests |
| **Frontend** `src/types/dashboard.ts` | Add `CampaignSummary`, `TopCampaignItem`, update `DashboardData` |
| **Frontend** `src/components/dashboard/dashboard-content.tsx` | Swap StatusDistribution → CampaignSummary |
| **Frontend** `src/components/dashboard/index.ts` | Update barrel exports |

### Icons (lucide-react — already installed)

| Element | Icon | Usage |
|---------|------|-------|
| Card header | `BarChart3` | Campaign Summary title |
| Delivered metric | `Send` | Total emails delivered |
| Open Rate metric | `Eye` | Average open rate |
| Click Rate metric | `MousePointerClick` | Average click rate |
| View All link | `ArrowRight` | Navigation arrow |

### Available Utilities (DO NOT reinvent)

- `cn()` — from `@/lib/utils` (conditional classNames)
- `Card`, `CardContent`, `CardHeader`, `CardTitle` — from `@/components/ui/card`
- `Separator` — from `@/components/ui/separator`
- `Skeleton` — from `@/components/ui/skeleton`
- `Link` — from `next/link` (for "View All Campaigns" navigation)
- `useDashboardData()` — from `@/hooks/use-dashboard-data` (existing hook, returns `campaignSummary` after backend update)

### Anti-Patterns to Avoid

1. **DO NOT create a separate API call** for campaign stats on the frontend — use `campaignSummary` from `useDashboardData()` hook (BFF pattern).
2. **DO NOT use `useCampaignStats()` hook** on the dashboard page — that hook is for the Campaigns page with its own staleTime/refresh interval.
3. **DO NOT fail the entire dashboard** if campaign stats fails — graceful degradation with `null`.
4. **DO NOT leave Status Distribution files** in the codebase — delete them completely.
5. **DO NOT create a new API route** in the dashboard proxy — `campaignSummary` comes through the existing `/api/admin/dashboard` proxy.
6. **DO NOT hardcode** the top campaigns limit — use `DASHBOARD.CAMPAIGN_SUMMARY_TOP_LIMIT` constant.
7. **DO NOT use `getAllCampaignStats` with default limit 20** thinking it's unlimited — explicitly set `limit: 100` to cover all campaigns.
8. **DO NOT use simple average** for `avgOpenRate`/`avgClickRate` — use **weighted average**: `totalOpened / totalDelivered * 100` (not average of per-campaign rates). Simple average distorts when campaigns have vastly different delivery volumes.
9. **DO NOT remove `statusDistribution`** from backend `DashboardResponse` — keep it for backward compatibility (other consumers may use it). Only the frontend chart is removed.

### Dependencies

- Epic 5 (Campaign Analytics — Backend + Frontend) — **DONE**
- Epic 9 Story 9-2 (Campaign Stats migrated to Supabase) — **DONE**
- `getAllCampaignStats()` service function — **EXISTS** in `campaign-stats.service.ts`

### Previous Story Intelligence (Story 2-3 Status Distribution)

From the original Status Distribution implementation:
- Container pattern: `useDashboardData()` → pass to presentational component
- Grid layout: `md:grid-cols-2` — Campaign Summary takes right column
- State lifecycle: Loading → Skeleton, Error → null (container handles), Empty → EmptyState, Success → Chart
- Test pattern: Mock `useDashboardData` hook, test skeleton/empty/data states
- Barrel exports in `src/components/dashboard/index.ts`

### Testing Strategy

**Backend tests** (`dashboard.controller.test.ts`):
- Mock `getAllCampaignStats` to return sample data
- Verify `campaignSummary` in response with correct aggregation
- Verify top 3 sorted by click rate
- Verify graceful degradation when service throws

**Frontend presentational tests** (`campaign-summary.test.tsx`):
- `data-testid="campaign-summary"` — main component
- `data-testid="campaign-summary-metric"` — each headline metric (3)
- `data-testid="campaign-summary-top-item"` — each top campaign item (up to 3)
- `data-testid="campaign-summary-view-all"` — link to /campaigns
- Test: renders 3 metrics with correct values
- Test: renders top campaigns sorted by click rate
- Test: progress bar width proportional to click rate
- Test: "View All" link points to /campaigns

**Frontend container tests** (`campaign-summary-container.test.tsx`):
- Mock `useDashboardData` hook
- Test: skeleton during loading
- Test: empty state when `campaignSummary` is null
- Test: passes data to presentational component

### Project Structure Notes

- **Backend project**: `eneos-sales-automation/` (Express.js, Supabase)
- **Frontend project**: `eneos-admin-dashboard/` (Next.js 14, App Router)
- Backend test: Vitest 2.1.2, Frontend test: Vitest 4.0.17
- Component naming: kebab-case (`campaign-summary.tsx`)
- Test location: `src/__tests__/` (flat structure in dashboard)

### References

- [Source: eneos-admin-dashboard/src/components/dashboard/dashboard-content.tsx] — Dashboard layout grid
- [Source: eneos-admin-dashboard/src/components/dashboard/status-distribution-container.tsx] — Container pattern to replicate
- [Source: eneos-admin-dashboard/src/components/dashboard/status-distribution-chart.tsx] — Component being replaced
- [Source: eneos-admin-dashboard/src/types/dashboard.ts] — DashboardData type to extend
- [Source: eneos-admin-dashboard/src/hooks/use-dashboard-data.ts] — Data fetching hook
- [Source: eneos-admin-dashboard/src/components/dashboard/index.ts] — Barrel exports to update
- [Source: eneos-sales-automation/src/controllers/admin/dashboard.controller.ts] — Backend dashboard endpoint
- [Source: eneos-sales-automation/src/services/campaign-stats.service.ts:241-308] — getAllCampaignStats function
- [Source: eneos-sales-automation/src/types/admin.types.ts:916-932] — CampaignStatsItem type
- [Source: eneos-sales-automation/src/constants/admin.constants.ts:22-27] — DASHBOARD constants
- [Source: project-context.md] — Testing patterns, service patterns, error handling

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (Amelia)

### Debug Log References
- Backend tests: 1424 passed (1 known flaky: background-processing hook timeout)
- Frontend tests: 3446 passed (1 pre-existing: lead-table sticky column)
- TypeScript: 0 errors in both projects

### Completion Notes List
- Backend: `getAllCampaignStats({ page: 1, limit: 100 })` used for full coverage
- Backend: Weighted average for avgOpenRate/avgClickRate (totalOpened/totalDelivered * 100)
- Frontend: `campaignSummary` made optional in `DashboardData` (consistent with `topSales?`, `recentActivity?`)
- Frontend: Container handles both `undefined` and `null` via `if (!campaignSummary)`
- Backend `statusDistribution` kept in response (backward compatibility per anti-pattern #9)

### File List

**Backend (eneos-sales-automation) — Modified:**
- `src/types/admin.types.ts` — Added `CampaignSummary`, `TopCampaignItem`, updated `DashboardResponse`
- `src/controllers/admin/dashboard.controller.ts` — Campaign stats aggregation + graceful degradation
- `src/constants/admin.constants.ts` — Added `CAMPAIGN_SUMMARY_TOP_LIMIT: 3`
- `src/__tests__/controllers/admin.controller.test.ts` — 4 new tests + mock for `getAllCampaignStats`

**Frontend (eneos-admin-dashboard) — Created:**
- `src/components/dashboard/campaign-summary.tsx`
- `src/components/dashboard/campaign-summary-skeleton.tsx`
- `src/components/dashboard/campaign-summary-empty.tsx`
- `src/components/dashboard/campaign-summary-container.tsx`
- `src/__tests__/campaign-summary.test.tsx` (7 tests)
- `src/__tests__/campaign-summary-container.test.tsx` (5 tests)

**Frontend — Modified:**
- `src/types/dashboard.ts` — Added `CampaignSummary`, `TopCampaignItem`, updated `DashboardData`
- `src/components/dashboard/dashboard-content.tsx` — Swapped StatusDistribution → CampaignSummary
- `src/components/dashboard/index.ts` — Updated barrel exports

**Frontend — Deleted:**
- `src/components/dashboard/status-distribution-chart.tsx`
- `src/components/dashboard/status-distribution-container.tsx`
- `src/components/dashboard/status-distribution-empty.tsx`
- `src/components/dashboard/status-distribution-skeleton.tsx`
- `src/__tests__/status-distribution-chart.test.tsx`
- `src/__tests__/status-distribution-container.test.tsx`
- `src/__tests__/status-distribution-empty.test.tsx`
- `src/__tests__/status-distribution-skeleton.test.tsx`
- `src/__tests__/components/status-distribution-chart.test.tsx`
