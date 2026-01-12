# Story 2.1: KPI Cards

Status: ready-for-dev

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

- [ ] **Task 1: Dashboard Page Setup** (AC: #1)
  - [ ] 1.1 Create `src/app/(dashboard)/page.tsx` as main dashboard
  - [ ] 1.2 Create `src/app/(dashboard)/layout.tsx` with sidebar navigation
  - [ ] 1.3 Set up basic page structure with header

- [ ] **Task 2: API Integration** (AC: #2, #5, #6)
  - [ ] 2.1 Create `src/lib/api/dashboard.ts` with fetch functions
  - [ ] 2.2 Define TypeScript types for dashboard response
  - [ ] 2.3 Set up TanStack Query hook `useDashboardData()`
  - [ ] 2.4 Configure staleTime and cacheTime
  - [ ] 2.5 Implement error handling

- [ ] **Task 3: KPI Card Component** (AC: #1, #3, #4)
  - [ ] 3.1 Create `src/components/dashboard/kpi-card.tsx`
  - [ ] 3.2 Accept props: title, value, change, changeLabel, icon
  - [ ] 3.3 Display numeric value with formatting (1,234)
  - [ ] 3.4 Display percentage/rate below value
  - [ ] 3.5 Show up/down arrow with color based on change
  - [ ] 3.6 Add appropriate icon for each metric

- [ ] **Task 4: KPI Cards Grid** (AC: #1, #7)
  - [ ] 4.1 Create `src/components/dashboard/kpi-cards-grid.tsx`
  - [ ] 4.2 Render 4 KPICard components
  - [ ] 4.3 Implement responsive grid layout
  - [ ] 4.4 Pass data from API to each card

- [ ] **Task 5: Loading State** (AC: #5)
  - [ ] 5.1 Create `src/components/dashboard/kpi-card-skeleton.tsx`
  - [ ] 5.2 Use shadcn/ui Skeleton component
  - [ ] 5.3 Match dimensions of actual KPI card
  - [ ] 5.4 Show skeleton grid while loading

- [ ] **Task 6: Error State** (AC: #6)
  - [ ] 6.1 Create error UI with message and retry button
  - [ ] 6.2 Implement retry functionality using TanStack Query refetch
  - [ ] 6.3 Log errors to console (or Sentry in production)

- [ ] **Task 7: Testing** (AC: #1, #2, #3, #4, #5, #6, #7)
  - [ ] 7.1 Test KPI cards render with correct data
  - [ ] 7.2 Test loading skeleton appears
  - [ ] 7.3 Test error state and retry
  - [ ] 7.4 Test responsive layout
  - [ ] 7.5 Test percentage calculations

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
{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

