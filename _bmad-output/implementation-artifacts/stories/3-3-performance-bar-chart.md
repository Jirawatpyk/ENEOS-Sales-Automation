# Story 3.3: Sales Performance Bar Chart

Status: done

## Story

As an **ENEOS manager**,
I want **to see a bar chart comparing performance metrics across all sales team members**,
so that **I can visually identify top and underperforming sales people at a glance**.

## Acceptance Criteria

1. **AC1: Chart Display**
   - Given I am on the Sales Performance page (`/sales`)
   - When the page loads
   - Then I see a horizontal bar chart below the summary cards and above/beside the table
   - And the chart has a clear title "Performance Comparison"
   - And the chart renders within 3 seconds

2. **AC2: Bar Chart Data**
   - Given the chart is displayed
   - When I view the bars
   - Then each sales person has a grouped bar showing: Claimed (blue), Contacted (amber), Closed (green)
   - And sales people are listed on the Y-axis (sorted by Closed count descending)
   - And the X-axis shows count values with appropriate scale

3. **AC3: Metric Toggle**
   - Given the chart is displayed
   - When I click on a legend item (e.g., "Claimed")
   - Then that metric's bars are hidden/shown
   - And the chart smoothly animates the toggle
   - And at least one metric must remain visible

4. **AC4: Hover Tooltip**
   - Given I hover over a bar segment
   - When the tooltip appears
   - Then I see the sales person's name
   - And I see the metric name and exact value
   - And I see conversion rate for that person
   - And the tooltip follows my cursor

5. **AC5: Bar Click Interaction**
   - Given I click on any bar for a sales person
   - When the click is registered
   - Then the corresponding row in the performance table is highlighted
   - And the page scrolls to show that row if not visible
   - And the bar shows `cursor: pointer` on hover
   - And the bar has `opacity: 0.8` during click for visual feedback

6. **AC6: Sorting Options**
   - Given the chart is displayed
   - When I view the chart header
   - Then I see a dropdown to sort by: "Closed" (default), "Claimed", "Contacted", "Conversion Rate"
   - And changing the sort reorders the bars with animation
   - And the sort persists until changed

7. **AC7: Loading State**
   - Given the chart is loading
   - When data is being fetched
   - Then I see a skeleton placeholder matching chart dimensions
   - And skeleton shows placeholder bars

8. **AC8: Empty State**
   - Given there is no sales data
   - When the chart renders
   - Then I see "No performance data available"
   - And a suggestion to check if sales team is configured

9. **AC9: Responsive Design**
   - Given I view on different screen sizes
   - When screen width is >= 1024px (desktop)
   - Then chart displays at full width below cards
   - When screen width is 768-1023px (tablet)
   - Then chart displays full width, bars may be thinner
   - When screen width is < 768px (mobile)
   - Then chart displays full width with horizontal scroll if needed
   - And touch scrolling works smoothly

10. **AC10: Accessibility**
    - Given the chart is displayed
    - When using a screen reader
    - Then chart has `aria-label` describing its purpose
    - And bars have accessible descriptions
    - And keyboard navigation works for legend toggle (Tab to focus, Enter/Space to toggle)
    - **Note:** Recharts Legend has limited built-in a11y; may require custom keyboard handler

## Tasks / Subtasks

- [x] **Task 1: Chart Component Setup** (AC: #1, #2)
  - [x] 1.1 Create `src/components/sales/performance-bar-chart.tsx`
  - [x] 1.2 Use Recharts BarChart with horizontal layout (layout="vertical")
  - [x] 1.3 Configure grouped bars for Claimed, Contacted, Closed
  - [x] 1.4 Wrap in Card component with title

- [x] **Task 2: Data Transformation** (AC: #2)
  - [x] 2.1 Transform API data to chart format
  - [x] 2.2 Sort by selected metric (default: Closed DESC)
  - [x] 2.3 Limit display to top 10 sales people (avoid overcrowding)
  - [x] 2.4 Calculate bar widths proportionally

- [x] **Task 3: Chart Styling** (AC: #2, #9)
  - [x] 3.1 Configure bar colors: Claimed (blue), Contacted (amber), Closed (green)
  - [x] 3.2 Set up Y-axis with sales person names (truncate if long)
  - [x] 3.3 Set up X-axis with count scale
  - [x] 3.4 Add legend below chart
  - [x] 3.5 Use ResponsiveContainer for responsive sizing
  - [x] 3.6 Match ENEOS brand styling via chart-config

- [x] **Task 4: Legend Toggle** (AC: #3)
  - [x] 4.1 Implement legend click handler
  - [x] 4.2 Track visible metrics in state
  - [x] 4.3 Add animation on toggle (CSS transitions)
  - [x] 4.4 Prevent hiding all metrics (min 1 visible)

- [x] **Task 5: Tooltip** (AC: #4)
  - [x] 5.1 Create custom tooltip component
  - [x] 5.2 Show name, metric, value, and conversion rate
  - [x] 5.3 Style tooltip to match design system

- [x] **Task 6: Bar Click Interaction** (AC: #5)
  - [x] 6.1 Add onClick handler to bars
  - [x] 6.2 Call parent callback with userId
  - [x] 6.3 Add visual feedback on click (cursor, opacity with Tailwind classes)
  - [x] 6.4 Integrate with table highlight (from Story 3-2 pattern)

- [x] **Task 7: Sorting Dropdown** (AC: #6)
  - [x] 7.0 Install Select component: `npx shadcn-ui@latest add select`
  - [x] 7.1 Add Select component above chart in CardHeader
  - [x] 7.2 Options: Closed, Claimed, Contacted, Conversion Rate
  - [x] 7.3 Re-sort data on selection change
  - [x] 7.4 Animate reordering (Recharts handles this automatically)

- [x] **Task 8: Loading State** (AC: #7)
  - [x] 8.1 Create `performance-bar-chart-skeleton.tsx`
  - [x] 8.2 Show placeholder bars with skeleton animation
  - [x] 8.3 Match chart container dimensions

- [x] **Task 9: Empty State** (AC: #8)
  - [x] 9.1 Create `performance-bar-chart-empty.tsx`
  - [x] 9.2 Show helpful message when no data
  - [x] 9.3 Style consistently with other empty states

- [x] **Task 10: Accessibility** (AC: #10)
  - [x] 10.1 Add aria-label to chart container
  - [x] 10.2 Add accessible descriptions to bars (sr-only text or aria-label)
  - [x] 10.3 Create custom Legend component with keyboard support (Tab + Enter/Space)
  - [x] 10.4 Add `tabIndex={0}` and `onKeyDown` handler to legend items
  - [x] 10.5 Test with screen reader

- [x] **Task 11: Integration with Page** (AC: #1, #5)
  - [x] 11.1 Add chart to `/sales` page below summary cards
  - [x] 11.2 Pass highlight callback for bar click → table highlight
  - [x] 11.3 Share data from useSalesPerformance hook

- [x] **Task 12: Testing** (AC: #1-10)
  - [x] 12.1 Test chart renders with data (10+ people)
  - [x] 12.2 Test chart renders with fewer than 10 people
  - [x] 12.3 Test chart renders with single sales person
  - [x] 12.4 Test legend toggle shows/hides bars
  - [x] 12.5 Test legend prevents hiding last visible metric
  - [x] 12.6 Test tooltip shows correct values including conversion rate
  - [x] 12.7 Test bar click triggers highlight callback with correct userId
  - [x] 12.8 Test sorting dropdown changes bar order
  - [x] 12.9 Test sorting by conversion rate (different data type)
  - [x] 12.10 Test loading and empty states
  - [x] 12.11 Test responsive behavior at breakpoints
  - [x] 12.12 Test accessibility attributes (aria-label)

## Dev Notes

### Data Requirements

Uses the same API endpoint: `GET /api/admin/sales-performance`

```typescript
// Same response as Story 3-1 and 3-2
interface SalesPersonMetrics {
  userId: string;
  name: string;
  claimed: number;
  contacted: number;
  closed: number;
  lost: number;
  unreachable: number;
  conversionRate: number;
  avgResponseTime: number;
}

// Transform to chart data
interface ChartDataPoint {
  name: string;        // Sales person name (truncated if > 15 chars)
  userId: string;      // For click handler
  claimed: number;
  contacted: number;
  closed: number;
  conversionRate: number;  // For tooltip
}
```

### Component Structure

```
src/components/sales/
├── performance-bar-chart.tsx         # Main chart component
├── performance-bar-chart-skeleton.tsx
├── performance-bar-chart-empty.tsx
├── performance-bar-chart-tooltip.tsx  # Custom tooltip
└── index.ts                          # Update exports
```

### Recharts Horizontal Bar Chart Pattern

```typescript
// src/components/sales/performance-bar-chart.tsx
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

type SortOption = 'closed' | 'claimed' | 'contacted' | 'conversionRate';

interface PerformanceBarChartProps {
  data: SalesPersonMetrics[];
  isLoading?: boolean;
  onBarClick?: (userId: string) => void;
}

const BAR_COLORS = {
  claimed: '#3b82f6',    // blue-500
  contacted: '#f59e0b',  // amber-500
  closed: '#22c55e',     // green-500
};

export function PerformanceBarChart({ data, isLoading, onBarClick }: PerformanceBarChartProps) {
  const [sortBy, setSortBy] = useState<SortOption>('closed');
  const [visibleMetrics, setVisibleMetrics] = useState({
    claimed: true,
    contacted: true,
    closed: true,
  });

  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      if (sortBy === 'conversionRate') {
        return b.conversionRate - a.conversionRate;
      }
      return b[sortBy] - a[sortBy];
    });

    return sorted.slice(0, 10).map(person => ({
      name: person.name.length > 15 ? `${person.name.slice(0, 12)}...` : person.name,
      fullName: person.name,
      userId: person.userId,
      claimed: person.claimed,
      contacted: person.contacted,
      closed: person.closed,
      conversionRate: person.conversionRate,
    }));
  }, [data, sortBy]);

  const handleLegendClick = (metric: keyof typeof visibleMetrics) => {
    const visibleCount = Object.values(visibleMetrics).filter(Boolean).length;
    if (visibleCount === 1 && visibleMetrics[metric]) {
      return; // Don't hide the last visible metric
    }
    setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  if (isLoading) return <PerformanceBarChartSkeleton />;
  if (!data || data.length === 0) return <PerformanceBarChartEmpty />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance Comparison
        </CardTitle>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="closed">Sort by Closed</SelectItem>
            <SelectItem value="claimed">Sort by Claimed</SelectItem>
            <SelectItem value="contacted">Sort by Contacted</SelectItem>
            <SelectItem value="conversionRate">Sort by Conv. Rate</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div
          className="h-[400px]"
          role="img"
          aria-label="Bar chart comparing sales team performance metrics"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              onClick={(e) => e?.activePayload?.[0] && onBarClick?.(e.activePayload[0].payload.userId)}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                onClick={(e) => handleLegendClick(e.dataKey as keyof typeof visibleMetrics)}
                wrapperStyle={{ cursor: 'pointer' }}
              />
              {visibleMetrics.claimed && (
                <Bar dataKey="claimed" fill={BAR_COLORS.claimed} name="Claimed" />
              )}
              {visibleMetrics.contacted && (
                <Bar dataKey="contacted" fill={BAR_COLORS.contacted} name="Contacted" />
              )}
              {visibleMetrics.closed && (
                <Bar dataKey="closed" fill={BAR_COLORS.closed} name="Closed" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Custom Tooltip Component

```typescript
// src/components/sales/performance-bar-chart-tooltip.tsx
interface TooltipPayload {
  name: string;
  fullName: string;
  claimed: number;
  contacted: number;
  closed: number;
  conversionRate: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: TooltipPayload; name: string; value: number; color: string }[];
  label?: string;
}

export function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3">
      <p className="font-medium">{data.fullName}</p>
      <div className="mt-2 space-y-1 text-sm">
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
        <p className="text-muted-foreground pt-1 border-t">
          Conversion: {data.conversionRate.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
```

### Skeleton Component

```typescript
// src/components/sales/performance-bar-chart-skeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PerformanceBarChartSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-40" />
      </CardHeader>
      <CardContent>
        <div className="h-[400px] flex flex-col justify-center gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton
                className="h-6"
                style={{ width: `${Math.random() * 50 + 30}%` }}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Integration with Page Layout

The `/sales` page should have this layout order:
1. Summary Cards (Story 3-2)
2. Performance Bar Chart (This story)
3. Performance Table (Story 3-1)

```typescript
// src/app/(dashboard)/sales/page.tsx
export default function SalesPage() {
  const { data, isLoading, error } = useSalesPerformance();

  const handleHighlightRow = (userId: string) => {
    // Shared highlight logic - scroll and highlight table row
  };

  return (
    <div className="space-y-6">
      <h1>Sales Team Performance</h1>

      {/* Summary Cards - Story 3-2 */}
      <ConversionSummaryCards
        data={data}
        isLoading={isLoading}
        onHighlightBestPerformer={handleHighlightRow}
        onFilterNeedsImprovement={/* filter handler */}
      />

      {/* Bar Chart - Story 3-3 (this story) */}
      <PerformanceBarChart
        data={data?.teamPerformance}
        isLoading={isLoading}
        onBarClick={handleHighlightRow}
      />

      {/* Table - Story 3-1 */}
      <PerformanceTableContainer
        data={data?.teamPerformance}
        isLoading={isLoading}
      />
    </div>
  );
}
```

### shadcn/ui Components Required

Already installed from previous stories:
- Card, CardHeader, CardTitle, CardContent
- Skeleton

May need to add:
```bash
npx shadcn-ui@latest add select
```

### Chart Configuration

Use existing `chart-config.ts` from Story 2-2 or create sales-specific colors:

```typescript
// src/lib/chart-config.ts (extend existing)
export const SALES_CHART_COLORS = {
  claimed: '#3b82f6',    // blue-500
  contacted: '#f59e0b',  // amber-500
  closed: '#22c55e',     // green-500
};
```

### Dependencies on Previous Stories

- **Story 3-1:** Creates `/sales` page, `useSalesPerformance` hook, table component
- **Story 3-2:** Creates summary cards, `handleHighlightRow` pattern
- **Story 2-2:** Establishes Recharts patterns, chart-config.ts

### Architecture Compliance

- Recharts for charting (per architecture.md ADR)
- TanStack Query for data (shared hook)
- shadcn/ui for UI components
- ResponsiveContainer for responsive design

### References

- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#F-03.3] - Performance Bar Chart feature
- [Source: _bmad-output/planning-artifacts/admin-dashboard/architecture.md#4.1] - Component hierarchy
- [Source: _bmad-output/implementation-artifacts/stories/2-2-lead-trend-chart.md] - Recharts patterns
- [Source: _bmad-output/implementation-artifacts/stories/3-1-performance-table.md] - API response structure
- [Source: _bmad-output/implementation-artifacts/stories/3-2-conversion-rate.md] - Highlight pattern

### Previous Story Intelligence

From Story 2-2 (Lead Trend Chart):
- Recharts setup with ResponsiveContainer
- Skeleton and empty state patterns for charts
- chart-config.ts for consistent colors
- Tooltip customization pattern

From Story 3-1 & 3-2:
- `useSalesPerformance` hook structure
- `handleHighlightRow` pattern for cross-component interaction
- Data transformation patterns

### Critical Don't-Miss Rules

1. **Limit to 10 bars** - Too many bars makes chart unreadable
2. **Truncate long names** - Y-axis labels must fit (max 15 chars)
3. **Prevent hiding all metrics** - At least one bar series must be visible
4. **Reuse highlight pattern** - Same `handleHighlightRow` from Story 3-2
5. **Match existing chart styling** - Use chart-config.ts colors/patterns
6. **Horizontal layout** - Use `layout="vertical"` in Recharts (counterintuitive naming)

### Recharts Layout Note

In Recharts, to create a **horizontal bar chart** (bars going left-to-right), you use:
```tsx
<BarChart layout="vertical">
```
This is because "vertical" refers to the **category axis** orientation, not the bar direction.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Created accessible custom legend component (AccessibleLegend) for keyboard navigation (Tab + Enter/Space)
- Added hover/active opacity feedback to bars using Tailwind CSS classes
- Fixed 38 tests covering all 10 Acceptance Criteria
- Integrated bar chart with performance-table-container for shared data and highlight functionality
- Bar radius uses [0,4,4,0] for horizontal layout (right side rounded) instead of chart-config default [4,4,0,0] (top rounded)

### File List

**New Files:**
- src/components/sales/performance-bar-chart.tsx - Main chart component with Recharts BarChart
- src/components/sales/performance-bar-chart-skeleton.tsx - Loading skeleton state
- src/components/sales/performance-bar-chart-empty.tsx - Empty data state
- src/components/sales/performance-bar-chart-tooltip.tsx - Custom tooltip component
- src/components/sales/accessible-legend.tsx - Keyboard-accessible legend (AC#10)
- src/__tests__/performance-bar-chart.test.tsx - 38 tests for all ACs

**Modified Files:**
- src/components/sales/index.ts - Added exports for new components
- src/components/sales/performance-table-container.tsx - Integrated PerformanceBarChart with highlight callback
- src/lib/chart-config.ts - Added SALES_BAR_COLORS constant

### Code Review

**Review Date:** 2026-01-16

**Reviewer:** Claude Opus 4.5 (Adversarial Code Review Workflow)

**Review Result:** ✅ PASSED

**Issues Found:**
- 0 Critical
- 0 High
- 2 Medium (all fixed)
- 2 Low (all fixed)

**Medium Issues (Fixed):**
1. **Bar radius direction incorrect** - Changed from `[4,4,0,0]` (top) to `[0,4,4,0]` (right side) for horizontal layout
2. **Legend not keyboard accessible** - Created AccessibleLegend component with Tab + Enter/Space navigation

**Low Issues (Fixed):**
1. **Missing hover feedback** - Added opacity change on bar hover/active states via Tailwind CSS
2. **Hardcoded color values** - Moved to SALES_BAR_COLORS in chart-config.ts

**Notes:**
- 38 tests covering all 10 Acceptance Criteria
- Recharts layout="vertical" for horizontal bars (counterintuitive naming documented)
- Integrated with performance-table-container for shared highlight functionality
