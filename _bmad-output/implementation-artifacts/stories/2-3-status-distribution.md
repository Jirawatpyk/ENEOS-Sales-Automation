# Story 2.3: Status Distribution Chart

Status: done

## Story

As an **ENEOS manager**,
I want **to see a pie/donut chart showing the distribution of lead statuses**,
so that **I can understand the breakdown of my sales pipeline at a glance**.

## Acceptance Criteria

1. **AC1: Donut Chart Display**
   - Given I am on the dashboard page
   - When the page loads
   - Then I see a donut chart showing status distribution
   - And it displays next to the trend chart

2. **AC2: Status Segments**
   - Given the chart is displayed
   - When I view the segments
   - Then I see segments for: New, Claimed, Contacted, Closed, Lost, Unreachable
   - And each segment has a distinct color

3. **AC3: Percentage Labels**
   - Given the chart is rendered
   - When I view each segment
   - Then I see the percentage of total for that status
   - And the center shows total lead count

4. **AC4: Hover Interaction**
   - Given I hover over a segment
   - When the tooltip appears
   - Then I see the status name, count, and percentage
   - And the segment slightly enlarges/highlights

5. **AC5: Legend Display**
   - Given the chart is displayed
   - When I view below the chart
   - Then I see a legend with status name, color, and count
   - And items are arranged neatly

6. **AC6: Color Coding**
   - Given the statuses are displayed
   - When I view colors
   - Then New = Gray, Claimed = Blue, Contacted = Yellow, Closed = Green, Lost = Red, Unreachable = Orange

7. **AC7: Loading & Empty States**
   - Given data is loading or empty
   - When the chart renders
   - Then loading shows skeleton, empty shows "No data" message

## Tasks / Subtasks

- [x] **Task 1: Donut Chart Component** (AC: #1, #2)
  - [x] 1.1 Create `src/components/dashboard/status-distribution-chart.tsx`
  - [x] 1.2 Use Recharts PieChart component
  - [x] 1.3 Configure 6 data segments for each status
  - [x] 1.4 Position next to trend chart in grid

- [x] **Task 2: Data Integration** (AC: #2, #3)
  - [x] 2.1 Extract status counts from dashboard API `summary`
  - [x] 2.2 Calculate percentages for each status
  - [x] 2.3 Transform to pie chart data format

- [x] **Task 3: Styling** (AC: #3, #6)
  - [x] 3.1 Define color palette for 6 statuses in chart-config.ts
  - [x] 3.2 Add center label showing total
  - [x] 3.3 Style to match ENEOS design system

- [x] **Task 4: Interactivity** (AC: #4)
  - [x] 4.1 Implement CustomTooltip component
  - [x] 4.2 Add segment highlight on hover (via Recharts default)
  - [x] 4.3 Show count and percentage in tooltip

- [x] **Task 5: Legend** (AC: #5)
  - [x] 5.1 Create CustomLegend component
  - [x] 5.2 Display status, color dot, and count
  - [x] 5.3 Position below chart

- [x] **Task 6: States** (AC: #7)
  - [x] 6.1 Create status-distribution-skeleton.tsx
  - [x] 6.2 Create status-distribution-empty.tsx
  - [x] 6.3 Handle edge cases (0 values, negative values)

- [x] **Task 7: Testing** (AC: #1-7)
  - [x] 7.1 Test chart renders with data (8 tests)
  - [x] 7.2 Test tooltip and legend render
  - [x] 7.3 Test loading/empty states (7 tests)
  - [x] 7.4 All 288 tests pass, build successful

## Dev Notes

### Recharts Implementation

```typescript
// src/components/dashboard/status-distribution-chart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { StatusChartSkeleton } from './status-distribution-skeleton';
import { StatusChartEmpty } from './status-distribution-empty';
import { CHART_COLORS } from '@/lib/chart-config';

// Status color mapping (HEX)
const STATUS_COLORS: Record<string, string> = {
  New: '#6B7280',      // Gray-500
  Claimed: '#3B82F6',  // Blue-500
  Contacted: '#EAB308', // Yellow-500
  Closed: '#10B981',   // Emerald-500
  Lost: '#EF4444',     // Red-500
  Unreachable: '#F97316', // Orange-500
};

interface StatusDistributionChartProps {
  data: {
    new: number;
    claimed: number;
    contacted: number;
    closed: number;
    lost: number;
    unreachable: number;
  };
  isLoading?: boolean;
}

// Transform API data to Recharts format
function transformData(data: StatusDistributionChartProps['data']) {
  return [
    { name: 'New', value: data.new, color: STATUS_COLORS.New },
    { name: 'Claimed', value: data.claimed, color: STATUS_COLORS.Claimed },
    { name: 'Contacted', value: data.contacted, color: STATUS_COLORS.Contacted },
    { name: 'Closed', value: data.closed, color: STATUS_COLORS.Closed },
    { name: 'Lost', value: data.lost, color: STATUS_COLORS.Lost },
    { name: 'Unreachable', value: data.unreachable, color: STATUS_COLORS.Unreachable },
  ].filter(item => item.value > 0);
}

export function StatusDistributionChart({ data, isLoading }: StatusDistributionChartProps) {
  if (isLoading) return <StatusChartSkeleton />;

  const chartData = transformData(data);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) return <StatusChartEmpty />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieIcon className="h-5 w-5" />
          Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip total={total} />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center mt-2 text-lg font-semibold">
          {total} Total Leads
        </div>
      </CardContent>
    </Card>
  );
}
```

### Why Recharts?

- ✅ Compatible with React 19
- ✅ Direct control over styling (CustomLegend, CustomTooltip)
- ✅ No peer dependency conflicts
- ✅ Consistent with Lead Trend Chart (Story 2.2)
- ✅ Uses shared chart-config.ts

### Skeleton Component

```typescript
// src/components/dashboard/status-distribution-skeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function StatusChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <Skeleton className="h-[200px] w-[200px] rounded-full" />
      </CardContent>
    </Card>
  );
}
```

### Empty State Component

```typescript
// src/components/dashboard/status-distribution-empty.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieIcon } from 'lucide-react';

export function StatusChartEmpty() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieIcon className="h-5 w-5" />
          Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-[300px] items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </CardContent>
    </Card>
  );
}
```

### Color Constants

```typescript
// src/constants/status-colors.ts
export const STATUS_COLORS = {
  new: '#6b7280',
  claimed: '#3b82f6',
  contacted: '#eab308',
  closed: '#22c55e',
  lost: '#ef4444',
  unreachable: '#f97316',
} as const;

export const STATUS_LABELS = {
  new: 'New',
  claimed: 'Claimed',
  contacted: 'Contacted',
  closed: 'Closed',
  lost: 'Lost',
  unreachable: 'Unreachable',
} as const;
```

### File Structure

```
src/
├── components/dashboard/
│   ├── status-distribution-chart.tsx
│   ├── status-distribution-container.tsx
│   ├── status-distribution-skeleton.tsx
│   ├── status-distribution-empty.tsx
│   └── index.ts (updated with exports)
├── lib/
│   └── chart-config.ts (updated with STATUS_COLORS)
└── __tests__/
    ├── status-distribution-chart.test.tsx
    ├── status-distribution-skeleton.test.tsx
    └── status-distribution-empty.test.tsx
```

### Dependencies

- `recharts` - Charting library (shared with Story 2.2)
- `lucide-react` - Icons (PieChart)
- `src/lib/chart-config.ts` - Shared chart configuration
- Story 2-1 and 2-2 should be complete for shared patterns

### References

- [Source: docs/admin-dashboard/ux-ui.md#4.2] - Dashboard wireframe
- [Source: docs/admin-dashboard/epics.md#F-02.3] - Status Distribution feature

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- Fixed TypeScript error: ChartDataItem index signature for Recharts compatibility
- Fixed TypeScript error: renderCustomLabel optional parameters for PieLabelRenderProps

### Completion Notes List
- All 7 tasks completed
- 15 new tests added (8 chart, 3 skeleton, 4 empty)
- Total test count: 288 passing
- Build successful
- Integrated into dashboard page in 2-column grid layout

### File List
- src/components/dashboard/status-distribution-chart.tsx (created)
- src/components/dashboard/status-distribution-container.tsx (created)
- src/components/dashboard/status-distribution-skeleton.tsx (created)
- src/components/dashboard/status-distribution-empty.tsx (created)
- src/components/dashboard/index.ts (updated)
- src/lib/chart-config.ts (updated with STATUS_COLORS, STATUS_LABELS)
- src/app/(dashboard)/dashboard/page.tsx (updated)
- src/__tests__/status-distribution-chart.test.tsx (created)
- src/__tests__/status-distribution-skeleton.test.tsx (created)
- src/__tests__/status-distribution-empty.test.tsx (created)
- src/__tests__/lead-trend-chart.test.tsx (updated mock from Tremor to Recharts)
- src/__tests__/lead-trend-chart-container.test.tsx (updated mock from Tremor to Recharts)

---

## Code Review Record

### Review Date
2026-01-13

### Reviewer
Claude Opus 4.5 (Dev Agent - Amelia)

### Issues Found & Fixed

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| H1 | HIGH | Missing StatusDistributionContainer test file | ✅ Fixed |
| H2 | HIGH | Legend uses key={index} - violates project-context.md | ✅ Fixed |
| H3 | HIGH | AC#3 center label not in donut center | ✅ Fixed |
| H4 | HIGH | AC#4 segment highlight not implemented | ✅ Fixed (CSS hover) |
| M1 | MEDIUM | Cell key using index | ✅ Fixed |
| L1 | LOW | ESLint configuration issue with next lint | ✅ Fixed |

### Fixes Applied

1. **H1**: Created `src/__tests__/status-distribution-container.test.tsx` with 7 tests
2. **H2 & M1**: Changed `key={index}` to `key={entry.payload.key}` in CustomLegend and `key={entry.key}` in Cell
3. **H3**: Moved center label to absolute positioning inside chart container with proper centering
4. **H4**: Added CSS hover effect with `transition-opacity duration-200 hover:opacity-80 cursor-pointer`
5. **L1**: Updated package.json lint script from `next lint` to `eslint src --ext .ts,.tsx`

### Post-Review Verification

- ✅ TypeScript: `npm run type-check` passes
- ✅ ESLint: `npm run lint` passes
- ✅ Tests: 295 tests passing (was 288, +7 container tests)
- ✅ Build: Ready for deployment

### Updated File List (Code Review)
- src/components/dashboard/status-distribution-chart.tsx (modified - key props, center label, hover)
- src/__tests__/status-distribution-container.test.tsx (created - 7 tests)
- package.json (modified - lint script)
