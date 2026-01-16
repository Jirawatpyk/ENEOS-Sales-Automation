# Story 3.5: Individual Performance Trend

Status: done

## Story

As an **ENEOS manager**,
I want **to see performance trends over time for individual sales team members**,
so that **I can identify improving or declining performers and have data-driven coaching conversations**.

## Acceptance Criteria

1. **AC1: Trend Chart in Detail Sheet**
   - Given I click on a sales person's row in the performance table (Story 3-1)
   - When the detail Sheet opens
   - Then I see a line chart showing their performance trend
   - And the chart displays data for the last 30 days by default
   - And the chart renders within 2 seconds

2. **AC2: Multi-Metric Display**
   - Given the trend chart is displayed
   - When I view the chart
   - Then I see lines for: Claimed (blue), Closed (green)
   - And I can toggle each metric via legend click
   - And at least one metric must remain visible (clicking last visible metric does nothing)
   - And guard logic prevents hiding all metrics

3. **AC3: Time Period Selection**
   - Given I want to view different time ranges
   - When I use the period selector above the chart
   - Then I can choose: "Last 7 Days", "Last 30 Days", "Last 90 Days"
   - And the chart updates to show the selected period
   - And "Last 30 Days" is selected by default

4. **AC4: Team Average Comparison**
   - Given I want to compare against the team
   - When I view the trend chart
   - Then I see a dashed gray line showing team average for Closed metric (primary KPI)
   - And I can toggle team average visibility via legend
   - And tooltip shows both individual and team values
   - **Note:** Team average shows Closed metric only (not per-metric avg) for simplicity

5. **AC5: Data Points and Tooltip**
   - Given I hover over a data point on the chart
   - When the tooltip appears
   - Then I see the date
   - And I see the metric name and value
   - And I see comparison to team average: "+3 above avg" (green) or "-2 below avg" (red)
   - And "= avg" shown in gray when equal to team average
   - And data points are visible as dots on the line

6. **AC6: Trend Indicator**
   - Given the trend data is available
   - When I view the chart header
   - Then I see an overall trend indicator (↑ Improving, ↓ Declining, → Stable)
   - And the indicator compares first half vs second half of the period
   - And color coding: Green for improving, Red for declining, Gray for stable
   - And if first half average is 0, treat as "Stable" (avoid division by zero)

7. **AC7: Empty/Insufficient Data**
   - Given a sales person has no or insufficient data
   - When the trend chart renders
   - Then I see "Not enough data to show trend"
   - And a message: "Minimum 7 days of data required"
   - And the chart area shows an empty state illustration

8. **AC8: Loading State**
   - Given trend data is loading
   - When the Sheet opens
   - Then I see a chart skeleton placeholder
   - And the skeleton matches chart dimensions

9. **AC9: Responsive Design**
   - Given I view on different screen sizes
   - When the Sheet opens
   - Then the chart fills available width
   - And remains readable at all sizes
   - And touch interactions work on mobile

## Tasks / Subtasks

- [x] **Task 1: Trend Data API Hook** (AC: #1, #3)
  - [x] 1.1 Create `src/hooks/use-sales-trend.ts`
  - [x] 1.2 Accept parameters: userId, period (7/30/90 days)
  - [x] 1.3 Call `/api/admin/sales-performance/trend?userId={id}&days={days}`
  - [x] 1.4 Handle loading, error, and empty states
  - [x] 1.5 **Note:** Backend endpoint may need to be created
  - [x] 1.6 **Fallback:** Create mock data generator for development if backend unavailable
  - [x] 1.7 Mock data should generate realistic daily metrics for 7/30/90 days

- [x] **Task 2: Trend Chart Component** (AC: #1, #2, #9)
  - [x] 2.1 Create `src/components/sales/individual-trend-chart.tsx`
  - [x] 2.2 Use Recharts LineChart with ResponsiveContainer
  - [x] 2.3 Configure lines for Claimed and Closed metrics
  - [x] 2.4 Add legend with toggle functionality
  - [x] 2.5 **Guard logic:** Prevent hiding last visible metric (count visible, skip if count === 1)
  - [x] 2.6 Style to match existing charts (chart-config.ts)

- [x] **Task 3: Period Selector** (AC: #3)
  - [x] 3.0 Used Button group instead of ToggleGroup (simpler implementation)
  - [x] 3.1 Add period toggle buttons using Button above chart
  - [x] 3.2 Options: "7 Days", "30 Days", "90 Days"
  - [x] 3.3 Default to "30 Days"
  - [x] 3.4 Trigger data refetch on change (TanStack Query auto-refetches when queryKey changes)

- [x] **Task 4: Team Average Line** (AC: #4)
  - [x] 4.1 Calculate team average for each day from existing data
  - [x] 4.2 Add dashed reference line to chart
  - [x] 4.3 Toggle via legend
  - [x] 4.4 Style as dashed gray line

- [x] **Task 5: Custom Tooltip** (AC: #5)
  - [x] 5.1 Create `trend-chart-tooltip.tsx`
  - [x] 5.2 Show date, metric values
  - [x] 5.3 Show comparison to team average
  - [x] 5.4 Format values appropriately

- [x] **Task 6: Trend Indicator** (AC: #6)
  - [x] 6.1 Calculate trend: compare avg of first half vs second half
  - [x] 6.2 **Guard:** If first half avg is 0, return "stable" (avoid division by zero)
  - [x] 6.3 Display arrow icon (↑/↓/→) with color
  - [x] 6.4 Add to chart header area
  - [x] 6.5 Threshold: >10% change = improving/declining, else stable

- [x] **Task 7: Empty State** (AC: #7)
  - [x] 7.1 Create `trend-chart-empty.tsx`
  - [x] 7.2 Show message for insufficient data
  - [x] 7.3 Define minimum: 7 data points required

- [x] **Task 8: Loading State** (AC: #8)
  - [x] 8.1 Create `trend-chart-skeleton.tsx`
  - [x] 8.2 Match chart dimensions
  - [x] 8.3 Show while data loads

- [x] **Task 9: Integration with Detail Sheet** (AC: #1)
  - [x] 9.1 Update `sales-detail-sheet.tsx` (from Story 3-1)
  - [x] 9.2 Add trend chart section below metrics
  - [x] 9.3 Pass userId to trend hook
  - [x] 9.4 Handle loading state within sheet

- [x] **Task 10: Testing** (AC: #1-9)
  - [x] 10.1 Test chart renders with trend data
  - [x] 10.2 Test period selection changes data (verify TanStack Query refetch)
  - [x] 10.3 Test legend toggle shows/hides lines
  - [x] 10.4 Test guard logic: cannot hide last visible metric
  - [x] 10.5 Test tooltip shows correct values with comparison format (+X above avg / -X below avg)
  - [x] 10.6 Test trend indicator calculation (up >10%, down <-10%, else stable)
  - [x] 10.7 Test trend indicator with first half avg = 0 → returns "stable"
  - [x] 10.8 Test empty state with < 7 data points
  - [x] 10.9 Test loading state (skeleton)
  - [x] 10.10 Test responsive behavior
  - [x] 10.11 Test mock data fallback when API unavailable
  - [x] 10.12 Test all zeros data → trend is "stable"

- [x] **Task 11: Backend API Implementation** (Post-Review Fix)
  - [x] 11.1 Create `getSalesPerformanceTrend()` controller function
  - [x] 11.2 Add Zod validation schema `salesPerformanceTrendQuerySchema`
  - [x] 11.3 Add route `GET /api/admin/sales-performance/trend`
  - [x] 11.4 Add types `DailyMetric`, `SalesPerformanceTrendResponse`
  - [x] 11.5 Create Frontend proxy route `/api/admin/sales-performance/trend`
  - [x] 11.6 Update `use-sales-trend.ts` to use real API (mock only in dev fallback)

## Dev Notes

### API Requirements

**New endpoint needed:** `GET /api/admin/sales-performance/trend`

```typescript
// Request
GET /api/admin/sales-performance/trend?userId={userId}&days={7|30|90}

// Response
interface TrendDataResponse {
  success: boolean;
  data: {
    userId: string;
    name: string;
    period: number;  // days
    dailyData: DailyMetric[];
    teamAverage: DailyMetric[];  // For comparison
  };
}

interface DailyMetric {
  date: string;      // "2024-01-15"
  claimed: number;
  contacted: number;
  closed: number;
  conversionRate: number;
}
```

**Backend Implementation Note:**
This endpoint may not exist yet. Options:
1. Create backend endpoint (recommended)
2. Calculate from existing data on frontend (less accurate, more complex)
3. Mock data for MVP, implement backend later

### Component Structure

```
src/components/sales/
├── individual-trend-chart.tsx      # Main chart component
├── trend-chart-tooltip.tsx         # Custom tooltip
├── trend-chart-skeleton.tsx        # Loading state
├── trend-chart-empty.tsx           # Empty state
├── trend-indicator.tsx             # ↑/↓/→ indicator
└── index.ts                        # Update exports

src/hooks/
└── use-sales-trend.ts              # TanStack Query hook
```

### Trend Chart Component

```typescript
// src/components/sales/individual-trend-chart.tsx
'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useSalesTrend } from '@/hooks/use-sales-trend';
import { TrendChartSkeleton } from './trend-chart-skeleton';
import { TrendChartEmpty } from './trend-chart-empty';
import { TrendChartTooltip } from './trend-chart-tooltip';

interface IndividualTrendChartProps {
  userId: string;
  userName: string;
}

const PERIODS = [
  { value: '7', label: '7 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
];

const LINE_COLORS = {
  claimed: '#3b82f6',   // blue-500
  closed: '#22c55e',    // green-500
  teamAvg: '#9ca3af',   // gray-400
};

export function IndividualTrendChart({ userId, userName }: IndividualTrendChartProps) {
  const [period, setPeriod] = useState('30');
  const [visibleLines, setVisibleLines] = useState({
    claimed: true,
    closed: true,
    teamAvg: true,
  });

  const { data, isLoading, error } = useSalesTrend(userId, parseInt(period));

  // Guard: Prevent hiding last visible metric
  const toggleLine = (metric: keyof typeof visibleLines) => {
    const visibleCount = Object.values(visibleLines).filter(Boolean).length;
    if (visibleCount === 1 && visibleLines[metric]) {
      return; // Don't hide the last visible metric
    }
    setVisibleLines(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  if (isLoading) return <TrendChartSkeleton />;
  if (error || !data) return <TrendChartEmpty reason="error" />;
  if (data.dailyData.length < 7) return <TrendChartEmpty reason="insufficient" />;

  const trendDirection = calculateTrend(data.dailyData);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{userName}'s Trend</CardTitle>
          <TrendIndicator direction={trendDirection} />
        </div>
        <ToggleGroup type="single" value={period} onValueChange={setPeriod}>
          {PERIODS.map(p => (
            <ToggleGroupItem key={p.value} value={p.value} size="sm">
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => formatDate(date, period)}
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<TrendChartTooltip teamAverage={data.teamAverage} />} />
              <Legend onClick={(e) => toggleLine(e.dataKey)} />

              {visibleLines.claimed && (
                <Line
                  type="monotone"
                  dataKey="claimed"
                  stroke={LINE_COLORS.claimed}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Claimed"
                />
              )}
              {visibleLines.closed && (
                <Line
                  type="monotone"
                  dataKey="closed"
                  stroke={LINE_COLORS.closed}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Closed"
                />
              )}
              {visibleLines.teamAvg && (
                <Line
                  type="monotone"
                  dataKey="teamAvgClosed"
                  stroke={LINE_COLORS.teamAvg}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Team Avg"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function calculateTrend(data: DailyMetric[]): 'up' | 'down' | 'stable' {
  const mid = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, mid);
  const secondHalf = data.slice(mid);

  const avgFirst = firstHalf.reduce((sum, d) => sum + d.closed, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, d) => sum + d.closed, 0) / secondHalf.length;

  // Guard: Avoid division by zero
  if (avgFirst === 0) {
    return avgSecond > 0 ? 'up' : 'stable';
  }

  const change = ((avgSecond - avgFirst) / avgFirst) * 100;

  if (change > 10) return 'up';
  if (change < -10) return 'down';
  return 'stable';
}

function TrendIndicator({ direction }: { direction: 'up' | 'down' | 'stable' }) {
  const icons = {
    up: <TrendingUp className="h-4 w-4 text-green-600" />,
    down: <TrendingDown className="h-4 w-4 text-red-600" />,
    stable: <Minus className="h-4 w-4 text-gray-400" />,
  };

  const labels = {
    up: 'Improving',
    down: 'Declining',
    stable: 'Stable',
  };

  return (
    <span className="flex items-center gap-1 text-xs">
      {icons[direction]}
      <span className={cn(
        direction === 'up' && 'text-green-600',
        direction === 'down' && 'text-red-600',
        direction === 'stable' && 'text-gray-400',
      )}>
        {labels[direction]}
      </span>
    </span>
  );
}
```

### TanStack Query Hook

```typescript
// src/hooks/use-sales-trend.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface TrendData {
  userId: string;
  name: string;
  period: number;
  dailyData: DailyMetric[];
  teamAverage: DailyMetric[];
}

export function useSalesTrend(userId: string, days: number = 30) {
  return useQuery({
    queryKey: ['sales-trend', userId, days],
    queryFn: async (): Promise<TrendData> => {
      const response = await apiClient.get(`/api/admin/sales-performance/trend`, {
        params: { userId, days },
      });
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });
}
```

### Integration with Detail Sheet

Update Story 3-1's `sales-detail-sheet.tsx`:

```typescript
// In sales-detail-sheet.tsx
import { IndividualTrendChart } from './individual-trend-chart';

export function SalesDetailSheet({ open, onOpenChange, salesPerson }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{salesPerson?.name}</SheetTitle>
        </SheetHeader>

        {/* Existing metrics display */}
        <div className="mt-6 space-y-6">
          {/* ... metrics ... */}

          {/* NEW: Trend Chart */}
          {salesPerson && (
            <IndividualTrendChart
              userId={salesPerson.userId}
              userName={salesPerson.name}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### shadcn/ui Components Required

May need to add:
```bash
npx shadcn-ui@latest add toggle-group
```

### Backend API Note

**IMPORTANT:** The `/api/admin/sales-performance/trend` endpoint likely does not exist yet.

**Options for MVP:**
1. **Create backend endpoint** (Recommended) - Add to Express backend
2. **Calculate on frontend** - Use existing daily data from Google Sheets
3. **Mock data** - Use static mock data for demo, implement backend later

**Recommended backend implementation:**
```typescript
// Backend: GET /api/admin/sales-performance/trend
router.get('/sales-performance/trend', async (req, res) => {
  const { userId, days = 30 } = req.query;

  // Query Google Sheets for leads by this user in date range
  // Aggregate by day: count claimed, contacted, closed
  // Return daily metrics array
});
```

### Dependencies on Previous Stories

- **Story 3-1:** Detail Sheet component to integrate with
- **Story 2-2:** Recharts patterns, chart configuration
- **Story 3-2/3-3:** Legend toggle pattern

### References

- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#F-03.5] - Trend by Person feature
- [Source: _bmad-output/implementation-artifacts/stories/2-2-lead-trend-chart.md] - Line chart patterns
- [Source: _bmad-output/implementation-artifacts/stories/3-1-performance-table.md] - Detail Sheet integration

### Previous Story Intelligence

From Story 2-2 (Lead Trend Chart):
- Recharts LineChart setup
- ResponsiveContainer pattern
- Tooltip customization
- Date formatting on X-axis

From Story 3-1:
- Detail Sheet component exists
- Will need modification to add trend chart

### Critical Don't-Miss Rules

1. **Backend may not exist** - Plan for mock data or frontend calculation fallback
2. **Minimum data check** - Require 7+ data points to show trend
3. **Trend calculation** - Compare first half vs second half averages
4. **Division by zero guard** - If first half avg is 0, treat as "stable" (or "up" if second half > 0)
5. **Guard last visible metric** - Prevent user from hiding all chart lines
6. **Sheet width** - May need to increase Sheet width to fit chart
7. **Reuse patterns** - Follow existing chart styles from chart-config.ts

### Edge Cases

- User with 0 leads → show empty state
- User with < 7 days of data → show "insufficient data" message
- All zeros → show chart but trend is "stable"
- First half avg = 0, second half > 0 → trend is "up" (not division error)
- API error → show error state with retry option
- Very large numbers → ensure Y-axis scales properly
- Try to hide last visible metric → action is ignored (guard logic)
- Team avg = individual value → tooltip shows "= avg" in gray

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Used Button group instead of ToggleGroup (simpler implementation without extra dependency)
- Mock data generator provides realistic daily metrics with deterministic variance based on userId
- Backend trend API endpoint not yet created - uses mock data fallback for MVP
- Sheet width increased to sm:max-w-xl to accommodate trend chart
- Trend calculation uses Closed metric as primary KPI (per AC#4)
- All 9 ACs implemented with corresponding tests

### Code Review Notes

**Round 1 - Issues Found & Fixed:**
1. **CRITICAL:** Test file `use-sales-trend.test.ts` used JSX but had `.ts` extension → Renamed to `.tsx`
2. **HIGH:** Mock data used `Math.random()` causing non-deterministic tests → Implemented seeded PRNG (`seededRandom()`)
3. **MEDIUM:** `console.warn()` in production code → Removed

**Round 2 - Post-Backend Implementation Review:**
1. **HIGH:** No unit tests for `getSalesPerformanceTrend` → Created `admin.controller.trend.test.ts` (15 tests)
2. **MEDIUM:** `console.warn` in `use-sales-trend.ts` → Removed (comments retained for dev reference)
3. **MEDIUM:** Duplicated DailyMetric type in proxy route → Added JSDoc comment referencing source types
4. **MEDIUM:** Missing logging for invalid userId → Added `logger.warn()` for edge cases
5. **LOW:** No integration tests → Created `admin.routes.trend.test.ts` (12 tests via supertest)

**Non-blocking Recommendations (noted for future):**
- Performance: Consider caching getAllLeads() in future optimization
- Tooltip comparison only shows for 'closed' metric (by design per AC#4)
- Consider adding ErrorBoundary for Recharts rendering errors

### File List

**New Files Created:**
- `src/hooks/use-sales-trend.ts` - TanStack Query hook with mock data fallback
- `src/components/sales/individual-trend-chart.tsx` - Main trend chart component
- `src/components/sales/trend-chart-skeleton.tsx` - Loading state skeleton
- `src/components/sales/trend-chart-empty.tsx` - Empty/error state component
- `src/components/sales/trend-chart-tooltip.tsx` - Custom tooltip with comparison
- `src/components/sales/trend-indicator.tsx` - Trend direction indicator (up/down/stable)
- `src/__tests__/individual-trend-chart.test.tsx` - Chart component tests (12 tests)
- `src/__tests__/trend-indicator.test.ts` - Trend calculation tests (9 tests)
- `src/__tests__/use-sales-trend.test.tsx` - Hook tests (10 tests)

**Modified Files:**
- `src/types/sales.ts` - Added DailyMetric, SalesTrendData, TrendPeriod, TrendDirection types
- `src/hooks/index.ts` - Added useSalesTrend export
- `src/components/sales/index.ts` - Added Story 3.5 exports
- `src/components/sales/sales-detail-sheet.tsx` - Integrated IndividualTrendChart, increased width
- `src/__tests__/sales-detail-sheet.test.tsx` - Added mock for IndividualTrendChart

**Backend API Files (Task 11):**
- `eneos-sales-automation/src/types/admin.types.ts` - Added DailyMetric, SalesPerformanceTrendResponse types
- `eneos-sales-automation/src/validators/admin.validators.ts` - Added salesPerformanceTrendQuerySchema
- `eneos-sales-automation/src/controllers/admin.controller.ts` - Added getSalesPerformanceTrend() with logging
- `eneos-sales-automation/src/routes/admin.routes.ts` - Added GET /sales-performance/trend route
- `eneos-sales-automation/src/__tests__/controllers/admin.controller.trend.test.ts` - Unit tests (15 tests)
- `eneos-sales-automation/src/__tests__/routes/admin.routes.trend.test.ts` - Integration tests (12 tests)

**Frontend Proxy (Task 11):**
- `eneos-admin-dashboard/src/app/api/admin/sales-performance/trend/route.ts` - NEW proxy route
- `eneos-admin-dashboard/src/hooks/use-sales-trend.ts` - Updated to use real API

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Story implementation complete, status → review | Claude Opus 4.5 |
| 2026-01-16 | Code review: Fixed 3 issues (test extension, deterministic mock, console.warn), status → done | Claude Opus 4.5 |
| 2026-01-16 | Backend API: Created /api/admin/sales-performance/trend endpoint, frontend proxy, updated hook to use real API | Claude Opus 4.5 |
| 2026-01-16 | Code review round 2: Added backend unit tests (15 tests), type documentation, logging for edge cases | Claude Opus 4.5 |
| 2026-01-16 | Added integration tests for /api/admin/sales-performance/trend endpoint (12 tests) | Claude Opus 4.5 |
