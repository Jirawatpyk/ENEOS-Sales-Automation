# Story 2.3: Status Distribution Chart

Status: ready-for-dev

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

- [ ] **Task 1: Donut Chart Component** (AC: #1, #2)
  - [ ] 1.1 Create `src/components/dashboard/status-distribution-chart.tsx`
  - [ ] 1.2 Use Tremor DonutChart component
  - [ ] 1.3 Configure 6 data segments for each status
  - [ ] 1.4 Position next to trend chart in grid

- [ ] **Task 2: Data Integration** (AC: #2, #3)
  - [ ] 2.1 Extract status counts from dashboard API `summary`
  - [ ] 2.2 Calculate percentages for each status
  - [ ] 2.3 Transform to pie chart data format

- [ ] **Task 3: Styling** (AC: #3, #6)
  - [ ] 3.1 Define color palette for 6 statuses
  - [ ] 3.2 Add center label showing total
  - [ ] 3.3 Style to match ENEOS design system

- [ ] **Task 4: Interactivity** (AC: #4)
  - [ ] 4.1 Implement hover tooltip
  - [ ] 4.2 Add segment highlight on hover
  - [ ] 4.3 Show count and percentage in tooltip

- [ ] **Task 5: Legend** (AC: #5)
  - [ ] 5.1 Create custom legend component
  - [ ] 5.2 Display status, color dot, and count
  - [ ] 5.3 Position below chart

- [ ] **Task 6: States** (AC: #7)
  - [ ] 6.1 Create skeleton loader
  - [ ] 6.2 Create empty state component
  - [ ] 6.3 Handle edge cases

- [ ] **Task 7: Testing** (AC: #1-7)
  - [ ] 7.1 Test chart renders with data
  - [ ] 7.2 Test hover interactions
  - [ ] 7.3 Test percentages are correct
  - [ ] 7.4 Test loading/empty states

## Dev Notes

### Tremor Implementation (Recommended)

```typescript
// src/components/dashboard/status-distribution-chart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DonutChart, Legend } from '@tremor/react';
import { PieChart as PieIcon } from 'lucide-react';
import { StatusChartSkeleton } from './status-distribution-skeleton';
import { StatusChartEmpty } from './status-distribution-empty';

// Tremor color mapping
const STATUS_COLORS: Record<string, string> = {
  New: 'gray',
  Claimed: 'blue',
  Contacted: 'yellow',
  Closed: 'emerald',
  Lost: 'red',
  Unreachable: 'orange',
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

// Transform API data to Tremor format
function transformToTremorData(data: StatusDistributionChartProps['data']) {
  return [
    { name: 'New', value: data.new },
    { name: 'Claimed', value: data.claimed },
    { name: 'Contacted', value: data.contacted },
    { name: 'Closed', value: data.closed },
    { name: 'Lost', value: data.lost },
    { name: 'Unreachable', value: data.unreachable },
  ].filter(item => item.value > 0);
}

export function StatusDistributionChart({ data, isLoading }: StatusDistributionChartProps) {
  if (isLoading) return <StatusChartSkeleton />;

  const chartData = transformToTremorData(data);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) return <StatusChartEmpty />;

  // Get colors array in same order as data
  const colors = chartData.map(item => STATUS_COLORS[item.name]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieIcon className="h-5 w-5" />
          Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DonutChart
          className="h-72"
          data={chartData}
          category="value"
          index="name"
          colors={colors}
          valueFormatter={(value) => `${value} leads`}
          showAnimation={true}
          showTooltip={true}
          label={`${total} Total`}
        />
        <Legend
          className="mt-4 justify-center"
          categories={chartData.map(item => item.name)}
          colors={colors}
        />
      </CardContent>
    </Card>
  );
}
```

### Why Tremor?

- ✅ Beautiful donut chart with center label built-in
- ✅ Smooth hover animations
- ✅ Dark mode support
- ✅ Less code than Recharts
- ✅ Consistent styling with other charts

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
│   ├── status-distribution-skeleton.tsx
│   └── status-distribution-empty.tsx
└── constants/
    └── status-colors.ts
```

### Dependencies

- `@tremor/react` - Charting library (shared with 2-2)
- `lucide-react` - Icons (PieChart)
- Story 2-1 and 2-2 should be complete for shared patterns

### References

- [Source: docs/admin-dashboard/ux-ui.md#4.2] - Dashboard wireframe
- [Source: docs/admin-dashboard/epics.md#F-02.3] - Status Distribution feature

## Dev Agent Record

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

