# Story 2.2: Lead Trend Chart

Status: ready-for-dev

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

- [ ] **Task 1: Chart Component Setup** (AC: #1, #2)
  - [ ] 1.1 Install Tremor (`npm install @tremor/react`)
  - [ ] 1.2 Create `src/components/dashboard/lead-trend-chart.tsx`
  - [ ] 1.3 Configure chart with Tremor AreaChart
  - [ ] 1.4 Set up data transformation from API response

- [ ] **Task 2: Data Integration** (AC: #1, #2)
  - [ ] 2.1 Extract `trends.daily` from dashboard API response
  - [ ] 2.2 Transform data to chart format: `{ date, newLeads, closed }`
  - [ ] 2.3 Handle date formatting with date-fns
  - [ ] 2.4 Ensure 30-day window is displayed

- [ ] **Task 3: Chart Styling** (AC: #2, #3, #5)
  - [ ] 3.1 Configure line colors (blue for New, green for Closed)
  - [ ] 3.2 Set up X-axis with date formatting
  - [ ] 3.3 Set up Y-axis with auto-scaling
  - [ ] 3.4 Add legend component below chart
  - [ ] 3.5 Style to match ENEOS brand

- [ ] **Task 4: Interactivity** (AC: #4, #5)
  - [ ] 4.1 Configure tooltip to show date and values
  - [ ] 4.2 Format tooltip content nicely
  - [ ] 4.3 Implement legend click to toggle series
  - [ ] 4.4 Add cursor indicator on hover

- [ ] **Task 5: Loading State** (AC: #6)
  - [ ] 5.1 Create chart skeleton component
  - [ ] 5.2 Match chart container dimensions
  - [ ] 5.3 Show skeleton while data loads

- [ ] **Task 6: Empty State** (AC: #7)
  - [ ] 6.1 Create empty state component
  - [ ] 6.2 Show when `trends.daily` is empty array
  - [ ] 6.3 Display helpful message

- [ ] **Task 7: Responsive Design** (AC: #8)
  - [ ] 7.1 Use responsive container wrapper
  - [ ] 7.2 Test at various breakpoints
  - [ ] 7.3 Ensure readability on mobile

- [ ] **Task 8: Testing** (AC: #1-8)
  - [ ] 8.1 Test chart renders with data
  - [ ] 8.2 Test tooltip shows correct values
  - [ ] 8.3 Test legend toggle works
  - [ ] 8.4 Test loading and empty states
  - [ ] 8.5 Test responsive behavior

## Dev Notes

### Tremor Implementation (Recommended)

```typescript
// src/components/dashboard/lead-trend-chart.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart } from '@tremor/react';
import { TrendingUp } from 'lucide-react';
import { LeadTrendChartSkeleton } from './lead-trend-chart-skeleton';
import { LeadTrendChartEmpty } from './lead-trend-chart-empty';

interface TrendData {
  date: string;
  'New Leads': number;
  'Closed': number;
}

interface LeadTrendChartProps {
  data: TrendData[];
  isLoading?: boolean;
}

// Transform API data to Tremor format
function transformToTremorData(apiData: { date: string; newLeads: number; closed: number }[]): TrendData[] {
  return apiData.map(item => ({
    date: item.date,
    'New Leads': item.newLeads,
    'Closed': item.closed,
  }));
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
        <AreaChart
          className="h-72"
          data={data}
          index="date"
          categories={['New Leads', 'Closed']}
          colors={['blue', 'emerald']}
          valueFormatter={(value) => value.toLocaleString()}
          showLegend={true}
          showGridLines={true}
          showAnimation={true}
          curveType="monotone"
          connectNulls={true}
        />
      </CardContent>
    </Card>
  );
}
```

### Why Tremor?

- ✅ Beautiful out-of-the-box styling
- ✅ Built-in dark mode support
- ✅ Smooth animations
- ✅ Less code to write
- ✅ Consistent design language

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
npm install @tremor/react
npm install date-fns
```

- `@tremor/react` - Beautiful chart components with Tailwind CSS
- `date-fns` - Date formatting utilities
- `lucide-react` - Icons (TrendingUp)
- Story 2-1 (KPI Cards) should be complete for shared components

### Tremor Setup

Add Tremor colors to `tailwind.config.js`:

```javascript
// tailwind.config.js
module.exports = {
  // ...existing config
  plugins: [
    // ...existing plugins
  ],
}
```

Note: Tremor works out-of-the-box with Tailwind CSS. No additional configuration needed for basic usage.

### References

- [Source: docs/admin-dashboard/ux-ui.md#4.2-dashboard-page] - Dashboard wireframe
- [Source: docs/admin-dashboard/epics.md#F-02.2] - Lead Trend Chart feature
- [Source: docs/admin-dashboard/technical-design.md#2.3] - Charts library

## Dev Agent Record

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

