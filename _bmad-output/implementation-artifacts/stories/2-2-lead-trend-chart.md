# Story 2.2: Lead Trend Chart

Status: done

## Story

As an **ENEOS manager**,
I want **to see a trend chart of leads over the past 30 days**,
so that **I can identify patterns and understand lead flow over time**.

## Acceptance Criteria

1. **AC1: Line Chart Display**
   - Given I am on the dashboard page
   - When the page loads
   - Then I see a line chart showing lead trends
   - And the chart displays data for the last 30 days

2. **AC2: Dual Line Series**
   - Given the trend chart is displayed
   - When I view the chart
   - Then I see two lines: "New Leads" (blue) and "Closed" (green)
   - And each line connects daily data points

3. **AC3: Axis Labels**
   - Given the chart is rendered
   - When I view the axes
   - Then the X-axis shows dates (e.g., "Jan 1", "Jan 15", "Jan 30")
   - And the Y-axis shows lead count with appropriate scale
   - And axis labels are readable and not overlapping

4. **AC4: Hover Tooltip**
   - Given I hover over a data point on the chart
   - When the tooltip appears
   - Then I see the date and exact values for both series
   - And the tooltip follows my cursor

5. **AC5: Legend**
   - Given the chart is displayed
   - When I view below/beside the chart
   - Then I see a legend showing "New Leads" and "Closed" with their colors
   - And clicking a legend item toggles that series visibility

6. **AC6: Loading State**
   - Given the chart is loading
   - When data is being fetched
   - Then I see a skeleton placeholder matching chart dimensions

7. **AC7: Empty State**
   - Given there is no data for the selected period
   - When the chart renders
   - Then I see a message "No data available for this period"
   - And a suggestion to adjust the date filter

8. **AC8: Responsive Sizing**
   - Given I resize the browser window
   - When the chart container changes size
   - Then the chart resizes proportionally
   - And remains readable at all sizes

## Tasks / Subtasks

- [x] **Task 1: Chart Component Setup** (AC: #1, #2)
  - [x] 1.1 Install Recharts (`npm install recharts`)
  - [x] 1.2 Create `src/components/dashboard/lead-trend-chart.tsx`
  - [x] 1.3 Configure chart with Recharts AreaChart
  - [x] 1.4 Set up data transformation from API response

- [x] **Task 2: Data Integration** (AC: #1, #2)
  - [x] 2.1 Extract `trends.daily` from dashboard API response
  - [x] 2.2 Transform data to chart format: `{ date, newLeads, closed }`
  - [x] 2.3 Handle date formatting with date-fns
  - [x] 2.4 Ensure 30-day window is displayed

- [x] **Task 3: Chart Styling** (AC: #2, #3, #5)
  - [x] 3.1 Configure line colors (blue for New, green for Closed)
  - [x] 3.2 Set up X-axis with date formatting
  - [x] 3.3 Set up Y-axis with auto-scaling
  - [x] 3.4 Add legend component below chart
  - [x] 3.5 Style to match ENEOS brand

- [x] **Task 4: Interactivity** (AC: #4, #5)
  - [x] 4.1 Configure tooltip to show date and values
  - [x] 4.2 Format tooltip content nicely
  - [x] 4.3 Implement legend click to toggle series
  - [x] 4.4 Add cursor indicator on hover

- [x] **Task 5: Loading State** (AC: #6)
  - [x] 5.1 Create chart skeleton component
  - [x] 5.2 Match chart container dimensions
  - [x] 5.3 Show skeleton while data loads

- [x] **Task 6: Empty State** (AC: #7)
  - [x] 6.1 Create empty state component
  - [x] 6.2 Show when `trends.daily` is empty array
  - [x] 6.3 Display helpful message

- [x] **Task 7: Responsive Design** (AC: #8)
  - [x] 7.1 Use responsive container wrapper
  - [x] 7.2 Test at various breakpoints
  - [x] 7.3 Ensure readability on mobile

- [x] **Task 8: Testing** (AC: #1-8)
  - [x] 8.1 Test chart renders with data
  - [x] 8.2 Test tooltip shows correct values
  - [x] 8.3 Test legend toggle works
  - [x] 8.4 Test loading and empty states
  - [x] 8.5 Test responsive behavior

## Dev Notes

### Recharts Implementation

```typescript
// src/components/dashboard/lead-trend-chart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { LeadTrendChartSkeleton } from './lead-trend-chart-skeleton';
import { LeadTrendChartEmpty } from './lead-trend-chart-empty';
import { CHART_COLORS, CHART_STYLES, LEAD_TREND_COLORS } from '@/lib/chart-config';

interface ChartData {
  date: string;
  displayDate: string;
  newLeads: number;
  closed: number;
}

interface LeadTrendChartProps {
  data?: DailyTrend[];
  isLoading?: boolean;
}

export function LeadTrendChart({ data, isLoading }: LeadTrendChartProps) {
  if (isLoading) {
    return <LeadTrendChartSkeleton />;
  }

  if (!data || data.length === 0) {
    return <LeadTrendChartEmpty />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Lead Trend (30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={CHART_STYLES.height}>
          <AreaChart data={chartData} margin={CHART_STYLES.margin}>
            <CartesianGrid strokeDasharray="4 4" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="displayDate" tick={{ fontSize: 12, fill: CHART_COLORS.text }} />
            <YAxis tick={{ fontSize: 12, fill: CHART_COLORS.text }} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} verticalAlign="top" />
            <Area type="monotone" dataKey="newLeads" stroke={LEAD_TREND_COLORS.newLeads} fill="url(#gradient-newLeads)" />
            <Area type="monotone" dataKey="closed" stroke={LEAD_TREND_COLORS.closed} fill="url(#gradient-closed)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### Why Recharts?

- ✅ Direct control over styling (CustomLegend, CustomTooltip)
- ✅ Compatible with React 19
- ✅ No peer dependency conflicts
- ✅ Better customization for enterprise needs
- ✅ Gradient fills and smooth animations
- ✅ Global config via `chart-config.ts`

### Skeleton Component

```typescript
// src/components/dashboard/lead-trend-chart-skeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function LeadTrendChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}
```

### Data Transformation

```typescript
// Transform API response to chart data
function transformTrendData(apiData: DashboardResponse['data']['trends']['daily']) {
  return apiData.map(item => ({
    date: item.date,
    newLeads: item.newLeads,
    closed: item.closed,
  }));
}
```

### Empty State Component

```typescript
// src/components/dashboard/lead-trend-chart-empty.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export function LeadTrendChartEmpty() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Lead Trend (30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-[300px] items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No data available for this period</p>
          <p className="text-sm">Try adjusting the date filter</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

### File Structure

```
src/components/dashboard/
├── lead-trend-chart.tsx
├── lead-trend-chart-skeleton.tsx
└── lead-trend-chart-empty.tsx
```

### Dependencies

```bash
npm install recharts
npm install date-fns
```

- `recharts` - Composable chart library for React
- `date-fns` - Date formatting utilities
- `lucide-react` - Icons (TrendingUp)
- Story 2-1 (KPI Cards) should be complete for shared components

### Global Chart Config

Chart colors and styles are centralized in `src/lib/chart-config.ts`:

```typescript
// src/lib/chart-config.ts
export const CHART_COLORS = {
  primary: '#6366F1',    // Indigo-500 - New Leads
  secondary: '#10B981',  // Emerald-500 - Closed
  grid: '#E5E7EB',       // Gray-200
  text: '#6B7280',       // Gray-500
};

export const LEAD_TREND_COLORS = {
  newLeads: CHART_COLORS.primary,
  closed: CHART_COLORS.secondary,
};
```

Note: Recharts works directly with React 19. No additional configuration needed.

### References

- [Source: docs/admin-dashboard/ux-ui.md#4.2-dashboard-page] - Dashboard wireframe
- [Source: docs/admin-dashboard/epics.md#F-02.2] - Lead Trend Chart feature
- [Source: docs/admin-dashboard/technical-design.md#2.3] - Charts library

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- Tests: 273 passed (30 new tests for Story 2.2)
- TypeScript: No errors in lead-trend-chart components
- Dependencies: recharts@3.6.0, date-fns@4.1.0

### Completion Notes List
1. Installed recharts and date-fns dependencies (migrated from @tremor/react)
2. Created LeadTrendChart component with Recharts AreaChart
3. Implemented dual area series (New Leads - indigo, Closed - emerald) with gradients
4. Added date formatting with date-fns for X-axis labels
5. Created LeadTrendChartSkeleton with chart-matching dimensions
6. Created LeadTrendChartEmpty with CalendarDays icon and suggestion
7. Created LeadTrendChartContainer with useDashboardData hook integration
8. Added all components to dashboard/index.ts barrel exports
9. Integrated chart into dashboard page below KPI Cards
10. Created CustomLegend and CustomTooltip components for enterprise styling
11. Created global chart-config.ts for centralized chart styling

### File List
**New Files:**
- `src/components/dashboard/lead-trend-chart.tsx`
- `src/components/dashboard/lead-trend-chart-skeleton.tsx`
- `src/components/dashboard/lead-trend-chart-empty.tsx`
- `src/components/dashboard/lead-trend-chart-container.tsx`
- `src/lib/chart-config.ts` (global chart configuration)
- `src/__tests__/lead-trend-chart.test.tsx`
- `src/__tests__/lead-trend-chart-skeleton.test.tsx`
- `src/__tests__/lead-trend-chart-empty.test.tsx`
- `src/__tests__/lead-trend-chart-container.test.tsx`

**Modified Files:**
- `src/components/dashboard/index.ts` (added exports)
- `src/app/(dashboard)/dashboard/page.tsx` (added chart)
- `src/app/providers.tsx` (added QueryClientProvider wrapper for TanStack Query v5)
- `package.json` (added recharts, date-fns dependencies)
- `package-lock.json` (dependency lock file updated)

**E2E Test Files:**
- `e2e/lead-trend-chart.spec.ts` (8 E2E tests for AC#1-8)
- `playwright.config.ts` (Playwright configuration)

**Code Review Notes:**
- AC#4 (tooltip) and AC#5 (legend toggle) now covered by E2E tests
- All pre-existing TypeScript errors in Epic 1 test files have been fixed

