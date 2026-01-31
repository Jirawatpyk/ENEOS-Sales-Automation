# Story 5.6: Campaign Performance Chart

Status: done

## Story

As an **ENEOS manager**,
I want **to see a bar chart comparing campaign performance (Open Rate vs Click Rate) across all campaigns**,
so that **I can visually identify which campaigns perform best and make data-driven decisions for future email marketing**.

## Acceptance Criteria

1. **AC1: Bar Chart Display**
   - Given I am on the Campaigns page (below the Campaign Table)
   - When the page loads
   - Then I see a horizontal bar chart comparing campaigns
   - And each campaign has two bars: Open Rate (blue) and Click Rate (green)
   - And campaigns are sorted by Open Rate descending (best performers at top)

2. **AC2: Data from Backend API**
   - Given the Campaigns page loads
   - When chart data is fetched from `GET /api/admin/campaigns/stats`
   - Then the chart displays up to 10 campaigns (configurable via dropdown)
   - And rates are displayed as percentages (0-100%)
   - And campaign names appear on the Y-axis
   - And values appear on the X-axis (0%, 25%, 50%, 75%, 100%)

3. **AC3: Interactive Tooltips**
   - Given I view the bar chart
   - When I hover over a bar
   - Then I see a tooltip with:
     - Campaign name
     - Metric type (Open Rate or Click Rate)
     - Exact percentage value (e.g., "42.5%")
     - Delivered count for context

4. **AC4: Campaign Count Selector**
   - Given I view the chart section
   - When I see the chart header
   - Then I see a dropdown to select number of campaigns: 5, 10, 20
   - And default is 10 campaigns
   - And chart updates when selection changes

5. **AC5: Loading State**
   - Given the chart is loading data
   - When API request is in progress
   - Then I see a skeleton placeholder matching chart dimensions
   - And skeleton includes animated pulse effect

6. **AC6: Empty State**
   - Given there are no campaigns
   - When the API returns empty data
   - Then I see "No campaign data yet" message
   - And a placeholder chart outline with hint text

7. **AC7: Error State**
   - Given the API call fails
   - When the chart cannot load data
   - Then I see an error message with "Retry" button
   - And clicking Retry re-fetches the data

8. **AC8: Responsive Layout**
   - Given I view the chart on different screen sizes
   - When on desktop (≥1024px), chart shows full width with readable labels (12px font)
   - When on tablet (768-1023px), chart adjusts with smaller text (11px font)
   - When on mobile (<768px):
     - Default campaign count reduces from 10 to 5
     - Y-axis labels use 10px font
     - Chart maintains horizontal bars with minimum height 250px
     - Campaign names truncate at 20 characters

9. **AC9: Benchmark Lines (Should Have)**
   - Given I view the chart
   - When campaigns are displayed
   - Then I see vertical reference lines at Open Rate benchmark thresholds:
     - 15% (yellow dashed) - "Good" threshold
     - 25% (green dashed) - "Excellent" threshold
   - And lines have subtle styling (dashed, semi-transparent)
   - **Note:** Click Rate benchmarks (2%, 5%) are NOT shown as reference lines because they would be nearly invisible on the 0-100% scale. Click Rate performance is better assessed in the Campaign Table (Story 5-5).

## Tasks / Subtasks

- [x] **Task 0: Verify Prerequisites** (AC: all)
  - [x] 0.1 Check if `src/lib/campaign-benchmarks.ts` exists (from Story 5-5)
  - [x] 0.2 If NOT exists → Create it with `RATE_BENCHMARKS` constant (see Dev Notes below)
  - [x] 0.3 Check if `CampaignsError` component exists in `src/components/campaigns/`
  - [x] 0.4 Verify campaigns API proxy route exists at `src/app/api/admin/campaigns/stats/route.ts`
  - [x] 0.5 If any prerequisite missing → Create it before proceeding

- [x] **Task 1: Create Campaign Chart Component** (AC: #1, #2, #8)
  - [x] 1.1 Create `src/components/campaigns/campaign-performance-chart.tsx`
  - [x] 1.2 Use Recharts library (already installed for Dashboard charts)
  - [x] 1.3 Implement horizontal `BarChart` with `XAxis`, `YAxis`, `Bar`, `Tooltip`
  - [x] 1.4 Define colors: Open Rate = `hsl(var(--chart-1))`, Click Rate = `hsl(var(--chart-2))`
  - [x] 1.5 Sort campaigns by openRate descending
  - [x] 1.6 Format Y-axis labels (truncate long campaign names)
  - [x] 1.7 Format X-axis as percentages (0%, 25%, 50%, 75%, 100%)
  - [x] 1.8 Add responsive container for chart resize
  - [x] 1.9 Write unit tests (10+ test cases)

- [x] **Task 2: Create Custom Tooltip** (AC: #3)
  - [x] 2.1 Create custom tooltip component inside chart file
  - [x] 2.2 Display campaign name, metric type, percentage, delivered count
  - [x] 2.3 Style with Card component for consistency
  - [x] 2.4 Write unit tests (4+ test cases)

- [x] **Task 3: Create Chart Hook** (AC: #2, #4)
  - [x] 3.1 Create `src/hooks/use-campaign-chart.ts`
  - [x] 3.2 Accept `limit` parameter (5, 10, 20)
  - [x] 3.3 Reuse `fetchCampaignStats` from `src/lib/api/campaigns.ts`
  - [x] 3.4 Sort and slice data for chart
  - [x] 3.5 Write unit tests (6+ test cases)

- [x] **Task 4: Create Campaign Count Selector** (AC: #4)
  - [x] 4.1 Add Select dropdown to chart header
  - [x] 4.2 Options: 5, 10, 20 campaigns
  - [x] 4.3 Update chart when selection changes
  - [x] 4.4 Write unit tests (3+ test cases)

- [x] **Task 5: Loading State** (AC: #5)
  - [x] 5.1 Create `src/components/campaigns/campaign-chart-skeleton.tsx`
  - [x] 5.2 Skeleton matching chart dimensions (height: 400px)
  - [x] 5.3 Add aria-busy for accessibility
  - [x] 5.4 Write unit tests (3+ test cases)

- [x] **Task 6: Empty & Error States** (AC: #6, #7)
  - [x] 6.1 Add empty state with placeholder chart outline
  - [x] 6.2 Reuse CampaignsError component from Story 5-3
  - [x] 6.3 Write unit tests (4+ test cases)

- [x] **Task 7: Benchmark Reference Lines** (AC: #9)
  - [x] 7.1 Add `ReferenceLine` components to chart for Open Rate only
  - [x] 7.2 15% line: yellow dashed (`RATE_BENCHMARKS.openRate.good`)
  - [x] 7.3 25% line: green dashed (`RATE_BENCHMARKS.openRate.excellent`)
  - [x] 7.4 **Skip Click Rate lines** - they're too small (2%, 5%) on 0-100% scale
  - [x] 7.5 Write unit tests (3+ test cases)

- [x] **Task 8: Integration** (AC: #1)
  - [x] 8.1 Update `src/app/(dashboard)/campaigns/page.tsx` to include chart
  - [x] 8.2 Add section heading "Campaign Performance"
  - [x] 8.3 Add Suspense boundary with skeleton fallback
  - [x] 8.4 Update barrel export `src/components/campaigns/index.ts`

- [x] **Task 9: Testing** (AC: #1-#9)
  - [x] 9.1 Verify chart displays with correct bars
  - [x] 9.2 Verify tooltips show correct information
  - [x] 9.3 Verify campaign count selector works
  - [x] 9.4 Verify loading skeleton appears
  - [x] 9.5 Verify error state and retry works
  - [x] 9.6 Verify responsive behavior on different screen sizes
  - [x] 9.7 Verify benchmark lines display correctly

## Dev Notes

### ⚠️ Story Dependencies

| Dependency | Status | Action if Missing |
|------------|--------|-------------------|
| Story 5-2 Backend API | ✅ done | Required - API must exist |
| Story 5-3 CampaignsError | ✅ done | Reuse error component |
| Story 5-3 API proxy route | ✅ done | Reuse `/api/admin/campaigns/stats` |
| Story 5-5 campaign-benchmarks.ts | 📋 ready-for-dev | **Create inline** (see Prerequisite section) |

**Task 0 handles missing dependencies.** If `campaign-benchmarks.ts` doesn't exist, create it as part of this story.

---

### Backend API Reference (Story 5-2)

**Endpoint:** `GET /api/admin/campaigns/stats`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `sortBy` | string | 'Last_Updated' | Sort column |
| `sortOrder` | 'asc' \| 'desc' | 'desc' | Sort direction |

**Response Data (CampaignStatsItem):**
```typescript
interface CampaignStatsItem {
  campaignId: number;
  campaignName: string;
  delivered: number;
  opened: number;
  clicked: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;      // Pre-calculated: 0-100
  clickRate: number;     // Pre-calculated: 0-100
  firstEvent: string;
  lastUpdated: string;
}
```

### Prerequisite: Campaign Benchmarks (If Story 5-5 Not Done)

If `src/lib/campaign-benchmarks.ts` does NOT exist, create it:

```typescript
// src/lib/campaign-benchmarks.ts
export const RATE_BENCHMARKS = {
  openRate: { excellent: 25, good: 15 },
  clickRate: { excellent: 5, good: 2 },
} as const;

export type RatePerformanceLevel = 'excellent' | 'good' | 'poor';

export function classifyRatePerformance(
  value: number,
  type: 'openRate' | 'clickRate'
): RatePerformanceLevel {
  const benchmark = RATE_BENCHMARKS[type];
  if (value >= benchmark.excellent) return 'excellent';
  if (value >= benchmark.good) return 'good';
  return 'poor';
}
```

### TypeScript Types

Add to `src/types/campaigns.ts`:

```typescript
// Chart-specific type for Story 5-6
export interface ChartDataItem {
  campaignName: string;
  campaignId: number;
  openRate: number;
  clickRate: number;
  delivered: number;
}
```

### Chart Data Transformation

```typescript
// src/hooks/use-campaign-chart.ts
import type { ChartDataItem } from '@/types/campaigns';

export function useCampaignChart(limit: number = 10) {
  return useQuery({
    queryKey: ['campaigns', 'chart', limit],
    queryFn: async () => {
      const response = await fetchCampaignStats({
        limit: 100,  // Fetch more, then sort and slice client-side
        sortBy: 'Open_Rate',
        sortOrder: 'desc',
      });

      const campaigns = response.data?.data ?? [];

      // Transform for chart
      return campaigns
        .slice(0, limit)
        .map((c) => ({
          campaignName: truncateName(c.campaignName, 25),
          campaignId: c.campaignId,
          openRate: c.openRate,
          clickRate: c.clickRate,
          delivered: c.delivered,
        }));
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

function truncateName(name: string, maxLength: number): string {
  return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
}
```

### Chart Component Structure

```typescript
// src/components/campaigns/campaign-performance-chart.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCampaignChart } from '@/hooks/use-campaign-chart';
import { CampaignChartSkeleton } from './campaign-chart-skeleton';
import { CampaignsError } from './campaigns-error';
import { RATE_BENCHMARKS } from '@/lib/campaign-benchmarks';
import type { ChartDataItem } from '@/types/campaigns';

const CHART_COLORS = {
  openRate: 'hsl(var(--chart-1))',
  clickRate: 'hsl(var(--chart-2))',
  benchmarkGood: 'hsl(var(--chart-3))',
  benchmarkExcellent: 'hsl(var(--chart-4))',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    payload: ChartDataItem;
    color: string;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <Card className="p-3 shadow-lg">
      <p className="font-semibold text-sm mb-2">{data.campaignName}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex justify-between gap-4 text-sm">
          <span style={{ color: entry.color }}>
            {entry.dataKey === 'openRate' ? 'Open Rate' : 'Click Rate'}:
          </span>
          <span className="font-medium">{entry.value.toFixed(1)}%</span>
        </div>
      ))}
      <p className="text-xs text-muted-foreground mt-2">
        Delivered: {data.delivered.toLocaleString()}
      </p>
    </Card>
  );
}

// Custom hook for responsive default (SSR-safe)
function useDefaultLimit(): number {
  const [defaultLimit, setDefaultLimit] = useState(10);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setDefaultLimit(5);
    }
  }, []);

  return defaultLimit;
}

export function CampaignPerformanceChart() {
  const defaultLimit = useDefaultLimit();
  const [limit, setLimit] = useState(defaultLimit);
  const { data, isLoading, isError, error, refetch } = useCampaignChart(limit);

  // Sync limit when defaultLimit changes (after hydration)
  useEffect(() => {
    setLimit(defaultLimit);
  }, [defaultLimit]);

  if (isLoading) {
    return <CampaignChartSkeleton />;
  }

  if (isError) {
    return <CampaignsError message={error?.message} onRetry={refetch} />;
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">No campaign data yet</p>
            <p className="text-sm">Performance chart will appear once campaigns have data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Campaign Performance</CardTitle>
        <Select
          value={String(limit)}
          onValueChange={(value) => setLimit(Number(value))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Top 5</SelectItem>
            <SelectItem value="10">Top 10</SelectItem>
            <SelectItem value="20">Top 20</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              ticks={[0, 25, 50, 75, 100]}
            />
            <YAxis
              type="category"
              dataKey="campaignName"
              width={150}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Benchmark Reference Lines */}
            <ReferenceLine
              x={RATE_BENCHMARKS.openRate.good}
              stroke={CHART_COLORS.benchmarkGood}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              label={{ value: '15%', position: 'top', fontSize: 10 }}
            />
            <ReferenceLine
              x={RATE_BENCHMARKS.openRate.excellent}
              stroke={CHART_COLORS.benchmarkExcellent}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              label={{ value: '25%', position: 'top', fontSize: 10 }}
            />

            <Bar
              dataKey="openRate"
              name="Open Rate"
              fill={CHART_COLORS.openRate}
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="clickRate"
              name="Click Rate"
              fill={CHART_COLORS.clickRate}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### Chart Skeleton Component

```typescript
// src/components/campaigns/campaign-chart-skeleton.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CampaignChartSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Loading campaign performance chart">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Campaign Performance</CardTitle>
        <Skeleton className="h-9 w-[120px]" />
      </CardHeader>
      <CardContent className="h-[400px]">
        <div className="space-y-4">
          {/* Y-axis labels + bars */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" /> {/* Campaign name */}
              <Skeleton className="h-6 flex-1" style={{ maxWidth: `${80 - i * 10}%` }} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Update Campaigns Page

```typescript
// src/app/(dashboard)/campaigns/page.tsx
import { Suspense } from 'react';
import {
  CampaignKPICardsGrid,
  CampaignKPICardsSkeleton,
  CampaignTable,
  CampaignTableSkeleton,
  CampaignPerformanceChart,
  CampaignChartSkeleton,
} from '@/components/campaigns';

export const metadata = {
  title: 'Campaigns | ENEOS Admin',
  description: 'Email campaign analytics and metrics',
};

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-muted-foreground">
          Email campaign performance metrics
        </p>
      </div>

      {/* KPI Cards from Story 5-3 */}
      <Suspense fallback={<CampaignKPICardsSkeleton />}>
        <CampaignKPICardsGrid />
      </Suspense>

      {/* Campaign Table from Story 5-4 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">All Campaigns</h2>
        <Suspense fallback={<CampaignTableSkeleton />}>
          <CampaignTable />
        </Suspense>
      </div>

      {/* Campaign Performance Chart from Story 5-6 */}
      <Suspense fallback={<CampaignChartSkeleton />}>
        <CampaignPerformanceChart />
      </Suspense>
    </div>
  );
}
```

### File Structure

```
eneos-admin-dashboard/src/
├── components/campaigns/
│   ├── campaign-kpi-card.tsx              # Story 5-3 (existing)
│   ├── campaign-kpi-card-skeleton.tsx     # Story 5-3 (existing)
│   ├── campaign-kpi-cards-grid.tsx        # Story 5-3 (existing)
│   ├── campaigns-error.tsx                # Story 5-3 (REUSE)
│   ├── campaign-table.tsx                 # Story 5-4 (existing)
│   ├── campaign-table-skeleton.tsx        # Story 5-4 (existing)
│   ├── campaign-table-pagination.tsx      # Story 5-4 (existing)
│   ├── rate-performance-badge.tsx         # Story 5-5 (existing)
│   ├── campaign-performance-chart.tsx     # Story 5-6 (NEW)
│   ├── campaign-chart-skeleton.tsx        # Story 5-6 (NEW)
│   └── index.ts                           # Update barrel export
├── hooks/
│   ├── use-campaign-stats.ts              # Story 5-3 (existing)
│   ├── use-campaigns-table.ts             # Story 5-4 (existing)
│   └── use-campaign-chart.ts              # Story 5-6 (NEW)
├── lib/
│   ├── api/campaigns.ts                   # Story 5-3 (REUSE)
│   └── campaign-benchmarks.ts             # Story 5-5 (REUSE for reference lines)
└── __tests__/
    ├── campaign-performance-chart.test.tsx # NEW
    ├── campaign-chart-skeleton.test.tsx    # NEW
    └── use-campaign-chart.test.tsx         # NEW
```

### Existing Pattern References

**CRITICAL:** Follow exact patterns from these existing components:

| Pattern | Source File | What to Reuse |
|---------|-------------|---------------|
| Bar Chart | `src/components/dashboard/lead-trend-chart.tsx` | Recharts setup, responsive container |
| Chart Card | `src/components/dashboard/status-distribution-chart.tsx` | Card wrapper, header pattern |
| Chart Skeleton | `src/components/dashboard/chart-skeleton.tsx` | Skeleton dimensions, aria attributes |
| Error Component | `src/components/campaigns/campaigns-error.tsx` | Already created in Story 5-3 |
| API Client | `src/lib/api/campaigns.ts` | Already created in Story 5-3 |
| Rate Benchmarks | `src/lib/campaign-benchmarks.ts` | Already created in Story 5-5 |

### Dependencies (Already Installed)

- `recharts` ^2.x - Chart library (used in Dashboard)
- `@tanstack/react-query` ^5.x - Data fetching
- `tailwindcss` - Styling
- shadcn/ui components (Card, Select, Skeleton)

### Chart Color Variables

Use CSS custom properties for consistent theming:

```css
/* From tailwind.config.ts / globals.css */
--chart-1: 221.2 83.2% 53.3%;  /* Blue - Open Rate */
--chart-2: 142.1 76.2% 36.3%;  /* Green - Click Rate */
--chart-3: 47.9 95.8% 53.1%;   /* Yellow - Benchmark lines */
--chart-4: 142.1 70.6% 45.3%;  /* Green - Excellent benchmark */
```

### Benchmark Integration

Reuse benchmarks from Story 5-5 (or create if not exists - see Prerequisite section above):

```typescript
// From src/lib/campaign-benchmarks.ts
export const RATE_BENCHMARKS = {
  openRate: { excellent: 25, good: 15 },  // Used for reference lines
  clickRate: { excellent: 5, good: 2 },   // NOT used for chart lines (too small on scale)
};
```

**Chart uses only Open Rate benchmarks** for reference lines because:
- X-axis domain is 0-100%
- Click Rate benchmarks (2%, 5%) would be nearly invisible at left edge
- Open Rate benchmarks (15%, 25%) are visually meaningful on this scale

### Responsive Chart Height

Dynamic height based on number of campaigns:

```typescript
// Calculate chart height based on data length
const chartHeight = Math.max(300, data.length * 50);

<ResponsiveContainer width="100%" height={chartHeight}>
```

### Testing Patterns

```typescript
// src/__tests__/campaign-performance-chart.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignPerformanceChart } from '@/components/campaigns/campaign-performance-chart';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Recharts to avoid SVG rendering issues in tests
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

describe('CampaignPerformanceChart', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient.clear();
  });

  it('renders chart with campaign data', async () => {
    // Mock successful API response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          data: [
            { campaignId: 1, campaignName: 'Campaign A', openRate: 30, clickRate: 5, delivered: 1000 },
            { campaignId: 2, campaignName: 'Campaign B', openRate: 20, clickRate: 3, delivered: 800 },
          ],
        },
      }),
    } as Response);

    render(<CampaignPerformanceChart />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Campaign Performance')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton initially', () => {
    render(<CampaignPerformanceChart />, { wrapper });
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state when no campaigns', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { data: [] } }),
    } as Response);

    render(<CampaignPerformanceChart />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/no campaign data yet/i)).toBeInTheDocument();
    });
  });

  it('allows changing campaign count', async () => {
    const user = userEvent.setup();
    // ... test implementation
  });
});
```

### Do NOT

- ❌ Create new chart library - REUSE Recharts (already in project)
- ❌ Create new error component - REUSE `CampaignsError` from Story 5-3
- ❌ Hardcode colors - USE CSS variables for theming
- ❌ Skip responsive design - USE ResponsiveContainer
- ❌ Create new benchmark constants - REUSE from Story 5-5
- ❌ Duplicate API fetching logic - REUSE/EXTEND existing hooks

### Performance Considerations

1. **Chart Rendering:** Recharts handles large datasets well, limit to 20 campaigns max
2. **Data Fetching:** TanStack Query caching (staleTime: 60s, gcTime: 5min)
3. **Re-renders:** Chart only re-renders when data or limit changes
4. **Height Calculation:** Dynamic height `Math.max(300, data.length * 50)`
5. **Separate API Call:** Chart fetches independently from Table (both use same backend endpoint but different query keys). This is acceptable - TanStack Query may dedupe if called simultaneously.

### Accessibility Requirements

1. **Screen Readers:** Chart should have descriptive aria-label
2. **Keyboard Navigation:** Select dropdown is keyboard accessible
3. **Color Contrast:** Chart colors meet WCAG 2.1 guidelines
4. **Focus Indicators:** Interactive elements have visible focus states

### References

- [Source: _bmad-output/implementation-artifacts/5-3-campaign-summary-cards.md] - KPI Cards pattern
- [Source: _bmad-output/implementation-artifacts/5-4-campaign-table.md] - Table pattern
- [Source: _bmad-output/implementation-artifacts/5-5-open-click-rates.md] - Rate benchmarks
- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#EPIC-05] - F-05.F4 requirements
- [Source: eneos-admin-dashboard/src/components/dashboard/lead-trend-chart.tsx] - Recharts pattern
- [Source: _bmad-output/project-context.md] - Project standards and patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All 49 tests pass (3 test files) - 48 original + 1 new AC#8 mobile truncation test
- Full regression: 2521 passed, 2 pre-existing failures (middleware-role timeout, mobile-filter-sheet disabled state), 2 skipped
- No regressions introduced by Story 5-6
- Post-review: 8 Rex findings fixed (3 HIGH, 4 MEDIUM, 1 LOW), all tests green

### Completion Notes List

- **Task 0**: All prerequisites verified - `campaign-benchmarks.ts`, `campaigns-error.tsx`, API proxy route, campaigns API client, campaigns types all exist
- **Task 1**: Created `campaign-performance-chart.tsx` with horizontal BarChart (Recharts), vertical layout, responsive container, dynamic height calculation `Math.max(300, data.length * 50)`
- **Task 2**: Created `ChartTooltip` component inside chart file - displays campaign name, metric type (Open Rate/Click Rate), percentage value with `.toFixed(1)`, and delivered count with `.toLocaleString()`
- **Task 3**: Created `use-campaign-chart.ts` hook - TanStack Query v5 object syntax, fetches with `limit: 100, sortBy: 'Open_Rate', sortOrder: 'desc'`, slices to user-selected limit, truncates names to 25 chars
- **Task 4**: Campaign count selector using shadcn Select component (Top 5/10/20), default 10 on desktop, auto-reduces to 5 on mobile (<768px) via `useDefaultLimit()` hook
- **Task 5**: Created `campaign-chart-skeleton.tsx` with 5 skeleton rows, aria-busy/aria-label for accessibility, matching chart card layout
- **Task 6**: Empty state shows "No campaign data yet" message in card; Error state reuses `CampaignsError` from Story 5-3 with retry
- **Task 7**: Two ReferenceLine components for Open Rate benchmarks only (15% Good yellow dashed, 25% Excellent green dashed). Click Rate lines intentionally skipped (2%/5% too small on 0-100% scale)
- **Task 8**: Updated campaigns page with Suspense boundary + skeleton fallback, updated barrel export in index.ts
- **Task 9**: 48 tests total: 15 hook tests (data fetching, limit, error, empty, enabled, truncation), 5 skeleton tests (render, aria, title, rows), 28 chart tests (loading, error, empty, bars, axes, selector, height, accessibility, benchmarks, colors)
- **Design Decision**: Used `CHART_COLORS` from `chart-config.ts` (HEX values) instead of CSS variables `hsl(var(--chart-N))` for consistency with existing dashboard charts pattern. Open Rate = Blue (#3B82F6), Click Rate = Emerald (#10B981)

### File List

**New Files:**
- `eneos-admin-dashboard/src/components/campaigns/campaign-performance-chart.tsx`
- `eneos-admin-dashboard/src/components/campaigns/campaign-chart-skeleton.tsx`
- `eneos-admin-dashboard/src/hooks/use-campaign-chart.ts`
- `eneos-admin-dashboard/src/__tests__/campaign-performance-chart.test.tsx`
- `eneos-admin-dashboard/src/__tests__/campaign-chart-skeleton.test.tsx`
- `eneos-admin-dashboard/src/__tests__/use-campaign-chart.test.tsx`

**Modified Files:**
- `eneos-admin-dashboard/src/types/campaigns.ts` (added `ChartDataItem` interface)
- `eneos-admin-dashboard/src/components/campaigns/index.ts` (added barrel exports)
- `eneos-admin-dashboard/src/app/(dashboard)/campaigns/page.tsx` (added chart section)

### Change Log

- 2026-01-31: Story 5-6 implementation complete - Campaign Performance Chart with horizontal bar chart, custom tooltip, count selector, loading/empty/error states, benchmark reference lines, and 48 tests
- 2026-01-31: Code review fixes applied (Rex review round 1):
  - **H-1**: Removed `limit` from queryKey, moved slicing to `select` option → single API call for all limit values
  - **H-2**: Replaced `useDefaultLimit` useEffect pattern with `useState(getResponsiveConfig)` function initializer → no double-render on mobile
  - **H-3**: Added `@internal` JSDoc to `ChartTooltip` export (kept exported for testing)
  - **M-1**: Implemented AC#8 responsive font sizes (12px desktop, 11px tablet, 10px mobile) and responsive truncation (25 chars desktop/tablet, 20 chars mobile) via `useResponsiveChart` hook
  - **M-2**: Added `resize` event listener to `useResponsiveChart` for reactive viewport changes
  - **M-3**: Fixed skeleton row count test - use `.flex.items-center.gap-4` selector with exact `toHaveLength(5)`
  - **M-4**: Fixed TestWrapper in hook tests - each test now uses `createWrapper()` for isolated QueryClient
  - **L-1**: Changed `aria-busy="true"` to `aria-busy={true}` boolean
  - Added new test: AC#8 mobile truncation at 20 characters
  - All 49 tests pass (48 original + 1 new), no type errors in Story 5-6 files

