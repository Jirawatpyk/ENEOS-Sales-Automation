# Story 2.1: KPI Cards

Status: done

## Story

As an **ENEOS manager**,
I want **to see key performance indicators (KPIs) at a glance on the dashboard**,
so that **I can quickly understand the current state of our sales pipeline**.

## Acceptance Criteria

1. **AC1: Four KPI Cards Display**
   - Given I am on the dashboard page
   - When the page loads
   - Then I see 4 KPI cards: Total Leads, Claimed, Contacted, Closed
   - And each card displays a numeric value and a label

2. **AC2: Accurate Data**
   - Given the dashboard loads
   - When KPI data is fetched from `/api/admin/dashboard`
   - Then Total Leads shows count of all leads in the selected period
   - And Claimed shows leads with status "claimed"
   - And Contacted shows leads with status "contacted"
   - And Closed shows leads with status "closed"

3. **AC3: Percentage/Rate Display**
   - Given the KPI cards are displayed
   - When I view each card
   - Then Total Leads shows % change vs previous period (calculated from API `previousPeriodLeads`)
   - And Claimed shows claim rate as percentage (Claimed/Total * 100)
   - And Contacted shows contact rate as percentage (Contacted/Total * 100)
   - And Closed shows close rate as percentage (Closed/Total * 100)
   - And rates are formatted to 1 decimal place (e.g., "45.5%")

4. **AC4: Visual Indicators**
   - Given the KPI cards are displayed
   - When the % change is positive
   - Then I see a green up arrow (↑)
   - When the % change is negative
   - Then I see a red down arrow (↓)

5. **AC5: Loading State**
   - Given the dashboard is loading
   - When data is being fetched
   - Then I see skeleton loaders immediately in place of KPI cards
   - And skeletons match the dimensions of actual KPI cards

6. **AC6: Error State**
   - Given the API call fails
   - When the dashboard cannot load KPI data
   - Then I see an error message with a "Retry" button
   - And the error is logged for debugging

7. **AC7: Responsive Layout**
   - Given I view the dashboard on different screen sizes
   - When on desktop (>1024px), cards display in a 4-column row
   - When on tablet (768-1024px), cards display in a 2x2 grid
   - When on mobile (<768px), cards stack vertically

## Tasks / Subtasks

- [x] **Task 1: Dashboard Page Setup** (AC: #1)
  - [x] 1.1 Create `src/app/(dashboard)/page.tsx` as main dashboard
  - [x] 1.2 Create `src/app/(dashboard)/layout.tsx` with sidebar navigation (existed from Epic 1)
  - [x] 1.3 Set up basic page structure with header

- [x] **Task 2: API Integration** (AC: #2, #5, #6)
  - [x] 2.1 Create `src/lib/api/dashboard.ts` with fetch functions
  - [x] 2.2 Define TypeScript types for dashboard response
  - [x] 2.3 Set up TanStack Query hook `useDashboardData()`
  - [x] 2.4 Configure staleTime and cacheTime
  - [x] 2.5 Implement error handling

- [x] **Task 3: KPI Card Component** (AC: #1, #3, #4)
  - [x] 3.1 Create `src/components/dashboard/kpi-card.tsx`
  - [x] 3.2 Accept props: title, value, change, changeLabel, icon
  - [x] 3.3 Display numeric value with formatting (1,234)
  - [x] 3.4 Display percentage/rate below value
  - [x] 3.5 Show up/down arrow with color based on change
  - [x] 3.6 Add appropriate icon for each metric

- [x] **Task 4: KPI Cards Grid** (AC: #1, #7)
  - [x] 4.1 Create `src/components/dashboard/kpi-cards-grid.tsx`
  - [x] 4.2 Render 4 KPICard components
  - [x] 4.3 Implement responsive grid layout
  - [x] 4.4 Pass data from API to each card

- [x] **Task 5: Loading State** (AC: #5)
  - [x] 5.1 Create `src/components/dashboard/kpi-card-skeleton.tsx`
  - [x] 5.2 Use shadcn/ui Skeleton component
  - [x] 5.3 Match dimensions of actual KPI card
  - [x] 5.4 Show skeleton grid while loading

- [x] **Task 6: Error State** (AC: #6)
  - [x] 6.1 Create error UI with message and retry button
  - [x] 6.2 Implement retry functionality using TanStack Query refetch
  - [x] 6.3 Log errors to console (or Sentry in production)

- [x] **Task 7: Testing** (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] 7.1 Test KPI cards render with correct data
  - [x] 7.2 Test loading skeleton appears
  - [x] 7.3 Test error state and retry
  - [x] 7.4 Test responsive layout
  - [x] 7.5 Test percentage calculations

## Dev Notes

### API Response Structure

```typescript
// GET /api/admin/dashboard response
interface DashboardResponse {
  success: boolean;
  data: {
    summary: {
      totalLeads: number;
      claimed: number;
      contacted: number;
      closed: number;
      lost: number;
      unreachable: number;
      conversionRate: number;
    };
    trends: {
      daily: Array<{ date: string; newLeads: number; closed: number }>;
    };
    // ... other fields
  };
}
```

### KPI Card Component

```typescript
// src/components/dashboard/kpi-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Users, UserCheck, Phone, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  change?: number;
  changeLabel?: string;
  icon: 'leads' | 'claimed' | 'contacted' | 'closed';
}

const icons = {
  leads: Users,
  claimed: UserCheck,
  contacted: Phone,
  closed: Trophy,
};

export function KPICard({ title, value, change, changeLabel, icon }: KPICardProps) {
  const Icon = icons[icon];
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {change !== undefined && (
          <p className={cn(
            "text-xs",
            isPositive && "text-green-600",
            isNegative && "text-red-600",
            !isPositive && !isNegative && "text-muted-foreground"
          )}>
            {isPositive && <ArrowUp className="inline h-3 w-3" />}
            {isNegative && <ArrowDown className="inline h-3 w-3" />}
            {change > 0 ? '+' : ''}{change}% {changeLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### TanStack Query Hook

```typescript
// src/hooks/use-dashboard-data.ts
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData } from '@/lib/api/dashboard';

export function useDashboardData(period: string = 'month') {
  return useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => fetchDashboardData(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
```

### Skeleton Component

```typescript
// src/components/dashboard/kpi-card-skeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function KPICardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}
```

### API Fetch Function

```typescript
// src/lib/api/dashboard.ts
import { getSession } from 'next-auth/react';

export interface DashboardData {
  summary: {
    totalLeads: number;
    claimed: number;
    contacted: number;
    closed: number;
    lost: number;
    unreachable: number;
    conversionRate: number;
    previousPeriodLeads?: number;
  };
  trends: {
    daily: Array<{ date: string; newLeads: number; closed: number }>;
  };
}

export async function fetchDashboardData(period: string = 'month'): Promise<DashboardData> {
  const session = await getSession();

  const response = await fetch(`/api/admin/dashboard?period=${period}`, {
    headers: {
      'Authorization': `Bearer ${session?.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}
```

### KPI Cards Grid Component

```typescript
// src/components/dashboard/kpi-cards-grid.tsx
'use client';

import { KPICard } from './kpi-card';
import { KPICardSkeleton } from './kpi-card-skeleton';
import { DashboardError } from './dashboard-error';
import { useDashboardData } from '@/hooks/use-dashboard-data';

export function KPICardsGrid() {
  const { data, isLoading, isError, error, refetch } = useDashboardData();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return <DashboardError message={error?.message} onRetry={refetch} />;
  }

  if (!data) return null;

  const { summary } = data;
  const total = summary.totalLeads || 1; // Prevent division by zero

  // Calculate % change vs previous period
  const previousTotal = summary.previousPeriodLeads || total;
  const totalChange = ((total - previousTotal) / previousTotal) * 100;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total Leads"
        value={summary.totalLeads}
        change={Number(totalChange.toFixed(1))}
        changeLabel="vs last period"
        icon="leads"
      />
      <KPICard
        title="Claimed"
        value={summary.claimed}
        change={Number(((summary.claimed / total) * 100).toFixed(1))}
        changeLabel="claim rate"
        icon="claimed"
      />
      <KPICard
        title="Contacted"
        value={summary.contacted}
        change={Number(((summary.contacted / total) * 100).toFixed(1))}
        changeLabel="contact rate"
        icon="contacted"
      />
      <KPICard
        title="Closed"
        value={summary.closed}
        change={Number(((summary.closed / total) * 100).toFixed(1))}
        changeLabel="close rate"
        icon="closed"
      />
    </div>
  );
}
```

### Error State Component

```typescript
// src/components/dashboard/dashboard-error.tsx
'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface DashboardErrorProps {
  message?: string;
  onRetry: () => void;
}

export function DashboardError({ message, onRetry }: DashboardErrorProps) {
  // Log error for debugging
  console.error('Dashboard error:', message);

  return (
    <Card className="border-destructive">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="font-semibold text-lg mb-2">Failed to load dashboard</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {message || 'An unexpected error occurred. Please try again.'}
        </p>
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
```

### File Structure

```
src/
├── app/(dashboard)/
│   ├── page.tsx              # Main dashboard page
│   └── layout.tsx            # Dashboard layout with sidebar
├── components/dashboard/
│   ├── kpi-card.tsx          # Single KPI card
│   ├── kpi-card-skeleton.tsx # Loading skeleton
│   ├── kpi-cards-grid.tsx    # Grid of 4 cards
│   └── dashboard-error.tsx   # Error state with retry
├── hooks/
│   └── use-dashboard-data.ts # TanStack Query hook
└── lib/api/
    └── dashboard.ts          # API fetch functions & types
```

### shadcn/ui Components Required

```bash
npx shadcn-ui@latest add card
npx shadcn-ui@latest add skeleton
```

### Dependencies

- Story 1-1 to 1-4 (Authentication) should be complete
- Backend API `/api/admin/dashboard` must be available
- TanStack Query configured in providers
- `lucide-react` for icons (ArrowUp, ArrowDown, Users, UserCheck, Phone, Trophy)

### References

- [Source: docs/admin-dashboard/ux-ui.md#4.2-dashboard-page] - Dashboard wireframe
- [Source: docs/admin-dashboard/epics.md#F-02.1] - KPI Cards feature
- [Source: docs/admin-dashboard/technical-design.md#2.4] - TanStack Query setup

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- Tests: 243 passed (63 new for Story 2.1, including 6 fixes)
- Lint: Passed (no warnings or errors)
- Pre-existing TypeScript errors in Epic 1 test files (not related to this story)

### Completion Notes List
1. Installed @tanstack/react-query@^5 and updated providers.tsx
2. Added shadcn/ui Card and Skeleton components
3. Created complete KPI dashboard with loading/error states
4. All acceptance criteria implemented and tested
5. Fixed pre-existing timeout issue in role-gate.test.tsx (Epic 1)

### File List
**New Files Created:**
- src/types/dashboard.ts
- src/lib/api/dashboard.ts
- src/hooks/use-dashboard-data.ts
- src/components/dashboard/kpi-card.tsx
- src/components/dashboard/kpi-card-skeleton.tsx
- src/components/dashboard/dashboard-error.tsx
- src/components/dashboard/kpi-cards-grid.tsx
- src/components/dashboard/index.ts
- src/components/ui/card.tsx (shadcn)
- src/components/ui/skeleton.tsx (shadcn)
- src/__tests__/kpi-card.test.tsx
- src/__tests__/kpi-card-skeleton.test.tsx
- src/__tests__/dashboard-error.test.tsx
- src/__tests__/kpi-cards-grid.test.tsx
- src/__tests__/use-dashboard-data.test.tsx
- src/__tests__/dashboard-api.test.ts

**Modified Files:**
- src/app/providers.tsx (added QueryClientProvider)
- src/app/(dashboard)/dashboard/page.tsx (added KPICardsGrid)
- package.json (added @tanstack/react-query)
- src/__tests__/role-gate.test.tsx (fixed timeout issue)

## Code Review Record

### Reviewer
Claude Opus 4.5 (Adversarial Review) - 2026-01-13

### AC Verification
| AC | Description | Status |
|----|-------------|--------|
| AC#1 | Four KPI Cards Display | ✅ PASS |
| AC#2 | Accurate Data | ✅ PASS |
| AC#3 | Percentage/Rate Display | ✅ PASS |
| AC#4 | Visual Indicators | ✅ PASS |
| AC#5 | Loading State | ✅ PASS |
| AC#6 | Error State | ✅ PASS |
| AC#7 | Responsive Layout | ✅ PASS |

### Issues Found (6 total) - ALL FIXED

| # | Severity | Issue | File | Status |
|---|----------|-------|------|--------|
| 1 | MEDIUM | Missing `gcTime` in TanStack Query v5 | use-dashboard-data.ts | ✅ FIXED |
| 2 | LOW | Type assertion instead of type guard | use-dashboard-data.ts | ✅ FIXED |
| 3 | MEDIUM | Division by zero edge case | kpi-cards-grid.tsx | ✅ FIXED |
| 4 | MEDIUM | Rate values always positive (UX confusing) | kpi-cards-grid.tsx, kpi-card.tsx | ✅ FIXED |
| 5 | LOW | Console.error in production | dashboard-error.tsx | ✅ FIXED |
| 6 | LOW | Missing skeleton accessibility test | kpi-card-skeleton.tsx/test | ✅ FIXED |

### Fixes Applied (2026-01-13)
1. Added `gcTime: 5 * 60 * 1000` to TanStack Query options
2. Added `isDashboardApiError()` type guard function
3. Fixed division by zero: handles `total=0 && previousPeriodLeads=0` correctly
4. Added `isRate` prop to KPICard: rate metrics now show neutral color (not green/red)
5. Made console.error conditional: only logs in development mode
6. Added `aria-busy` and `aria-label` to skeleton, with accessibility test

### Verdict
**PASS** - All 6 issues fixed. All AC verified. 243 tests passing (+6 new tests).

### Positive Findings
- Clean separation: types, api, hooks, components
- 63 comprehensive tests for Story 2.1
- TanStack Query v5 object syntax correct with gcTime
- Good error handling with custom error class and type guard
- Proper accessibility attributes (aria-label, aria-hidden, aria-busy)

