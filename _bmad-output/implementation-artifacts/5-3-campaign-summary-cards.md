# Story 5.3: Campaign Summary Cards

Status: done

## Story

As an **ENEOS manager**,
I want **to see campaign email metrics (Total Campaigns, Delivered, Opened, Clicked) at a glance on the Campaigns page**,
so that **I can quickly understand the effectiveness of our email marketing campaigns**.

## Acceptance Criteria

1. **AC1: Four Campaign KPI Cards Display**
   - Given I navigate to the Campaigns page
   - When the page loads
   - Then I see 4 KPI cards: Total Campaigns, Delivered, Opened, Clicked
   - And each card displays a numeric value and a label
   - And cards follow the same visual pattern as Dashboard KPI cards (Story 2-1)

2. **AC2: Accurate Data from Backend API**
   - Given the Campaigns page loads
   - When KPI data is fetched from `GET /api/admin/campaigns/stats`
   - Then Total Campaigns shows count of campaigns with data
   - And Delivered shows sum of all `delivered` counts
   - And Opened shows sum of all `opened` counts (or `uniqueOpens`)
   - And Clicked shows sum of all `clicked` counts (or `uniqueClicks`)

3. **AC3: Rate Display for Opened/Clicked**
   - Given the campaign KPI cards are displayed
   - When I view Open Rate card
   - Then it shows aggregated Open Rate = (Total Unique Opens / Total Delivered) * 100
   - When I view Click Rate card
   - Then it shows aggregated Click Rate = (Total Unique Clicks / Total Delivered) * 100
   - And rates are formatted to 1 decimal place (e.g., "42.5%")

4. **AC4: Loading State**
   - Given the Campaigns page is loading
   - When data is being fetched
   - Then I see skeleton loaders in place of KPI cards
   - And skeletons match the dimensions of actual KPI cards

5. **AC5: Error State**
   - Given the API call fails (503, 500, network error)
   - When the page cannot load campaign data
   - Then I see an error message with a "Retry" button
   - And clicking Retry re-fetches the data

6. **AC6: Empty State**
   - Given there are no campaigns yet
   - When the API returns empty data (0 campaigns)
   - Then KPI cards show 0 values
   - And a message hints "No campaign data available yet"

7. **AC7: Responsive Layout**
   - Given I view the Campaigns page on different screen sizes
   - When on desktop (≥1024px), cards display in a 4-column row
   - When on tablet (768-1023px), cards display in a 2x2 grid
   - When on mobile (<768px), cards stack vertically

## Tasks / Subtasks

- [x] **Task 1: Create Campaigns Page Route** (AC: #1, #7)
  - [x] 1.1 Create `src/app/(dashboard)/campaigns/page.tsx` - Server component wrapper
  - [x] 1.2 Create `src/app/(dashboard)/campaigns/layout.tsx` if needed (or reuse dashboard layout) - reusing dashboard layout
  - [x] 1.3 Update sidebar navigation to include "Campaigns" link with Mail icon
  - [x] 1.4 Add page title and breadcrumb

- [x] **Task 2: API Integration - Campaign Stats Hook** (AC: #2, #4, #5)
  - [x] 2.1 Create `src/lib/api/campaigns.ts` - API client functions
  - [x] 2.2 Define TypeScript types in `src/types/campaigns.ts`
  - [x] 2.3 Create `src/hooks/use-campaign-stats.ts` - TanStack Query hook
  - [x] 2.4 Configure staleTime: 60s, gcTime: 5min (rate limit aware)
  - [x] 2.5 Implement error handling with `CampaignApiError` class
  - [x] 2.6 Write unit tests (10+ test cases) - 16 test cases in campaigns-api.test.ts

- [x] **Task 3: Campaign KPI Card Component** (AC: #1, #3)
  - [x] 3.1 Create `src/components/campaigns/campaign-kpi-card.tsx`
  - [x] 3.2 Reuse pattern from `src/components/dashboard/kpi-card.tsx`
  - [x] 3.3 Accept props: title, value, rate, rateLabel, icon
  - [x] 3.4 Display numeric value with formatting (1,234,567)
  - [x] 3.5 Display rate below value (neutral color, not green/red)
  - [x] 3.6 Add icons: Mail, Send, Eye, MousePointerClick (from lucide-react)
  - [x] 3.7 Write unit tests (5+ test cases) - 13 test cases in campaign-kpi-card.test.tsx

- [x] **Task 4: Campaign KPI Cards Grid** (AC: #1, #2, #3, #6, #7)
  - [x] 4.1 Create `src/components/campaigns/campaign-kpi-cards-grid.tsx`
  - [x] 4.2 Fetch data using `useCampaignStats()` hook
  - [x] 4.3 Calculate aggregated totals from API response
  - [x] 4.4 Render 4 CampaignKPICard components
  - [x] 4.5 Implement responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
  - [x] 4.6 Handle empty state (0 campaigns)
  - [x] 4.7 Write unit tests (8+ test cases) - 14 test cases in campaign-kpi-cards-grid.test.tsx

- [x] **Task 5: Loading State** (AC: #4)
  - [x] 5.1 Create `src/components/campaigns/campaign-kpi-card-skeleton.tsx`
  - [x] 5.2 Reuse pattern from `src/components/dashboard/kpi-card-skeleton.tsx`
  - [x] 5.3 Add aria-busy and aria-label for accessibility
  - [x] 5.4 Write unit tests (3+ test cases including accessibility: aria-busy, aria-label) - 6 test cases

- [x] **Task 6: Error State** (AC: #5)
  - [x] 6.1 Create `src/components/campaigns/campaigns-error.tsx`
  - [x] 6.2 Reuse pattern from `src/components/dashboard/dashboard-error.tsx`
  - [x] 6.3 Implement retry functionality using TanStack Query refetch
  - [x] 6.4 Write unit tests (3+ test cases) - 7 test cases in campaigns-error.test.tsx

- [x] **Task 7: Barrel Export & Integration** (AC: #1)
  - [x] 7.1 Create `src/components/campaigns/index.ts` barrel export (include CampaignKPICardsSkeleton)
  - [x] 7.2 Update Campaigns page to use CampaignKPICardsGrid
  - [x] 7.3 Add Suspense boundary with CampaignKPICardsSkeleton fallback

- [x] **Task 8: E2E / Manual Testing** (AC: #1-#7)
  - [x] 8.1 Verify 4 cards display with correct values - via unit tests
  - [x] 8.2 Verify loading skeleton appears - via unit tests
  - [x] 8.3 Verify error state and retry works - via unit tests
  - [x] 8.4 Verify responsive layout on different screen sizes - via unit tests checking CSS classes
  - [x] 8.5 Verify rate calculations are accurate - via unit tests

## Dev Notes

### Backend API Reference (Story 5-2)

**Endpoint:** `GET /api/admin/campaigns/stats`

**Response Format:**
```typescript
// Backend wraps data: { success, data: { data: [...], pagination: {...} } }
interface CampaignStatsResponse {
  success: boolean;
  data: {
    data: CampaignStatsItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface CampaignStatsItem {
  campaignId: number;
  campaignName: string;
  delivered: number;
  opened: number;
  clicked: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;      // Already calculated: Unique_Opens / Delivered * 100
  clickRate: number;     // Already calculated: Unique_Clicks / Delivered * 100
  hardBounce: number;    // Future (always 0)
  softBounce: number;    // Future (always 0)
  unsubscribe: number;   // Future (always 0)
  spam: number;          // Future (always 0)
  firstEvent: string;    // ISO 8601
  lastUpdated: string;   // ISO 8601
}
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |

### Aggregation Logic (Frontend Calculation)

Since the API returns per-campaign stats, the frontend must aggregate:

```typescript
// src/lib/api/campaigns.ts
export function aggregateCampaignStats(campaigns: CampaignStatsItem[]): CampaignAggregate {
  const totalCampaigns = campaigns.length;

  const totals = campaigns.reduce((acc, campaign) => ({
    delivered: acc.delivered + campaign.delivered,
    opened: acc.opened + campaign.opened,
    clicked: acc.clicked + campaign.clicked,
    uniqueOpens: acc.uniqueOpens + campaign.uniqueOpens,
    uniqueClicks: acc.uniqueClicks + campaign.uniqueClicks,
  }), { delivered: 0, opened: 0, clicked: 0, uniqueOpens: 0, uniqueClicks: 0 });

  // Calculate aggregated rates (avoid division by zero)
  const openRate = totals.delivered > 0
    ? (totals.uniqueOpens / totals.delivered) * 100
    : 0;
  const clickRate = totals.delivered > 0
    ? (totals.uniqueClicks / totals.delivered) * 100
    : 0;

  return {
    totalCampaigns,
    ...totals,
    openRate: Number(openRate.toFixed(1)),
    clickRate: Number(clickRate.toFixed(1)),
  };
}
```

### TypeScript Types

```typescript
// src/types/campaigns.ts
export interface CampaignStatsItem {
  campaignId: number;
  campaignName: string;
  delivered: number;
  opened: number;
  clicked: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;
  clickRate: number;
  hardBounce: number;
  softBounce: number;
  unsubscribe: number;
  spam: number;
  firstEvent: string;
  lastUpdated: string;
}

export interface CampaignStatsResponse {
  success: boolean;
  data: CampaignStatsItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: {
    message: string;
    code?: string;
  };
}

export interface CampaignAggregate {
  totalCampaigns: number;
  delivered: number;
  opened: number;
  clicked: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;
  clickRate: number;
}

export class CampaignApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'CampaignApiError';
  }
}
```

### TanStack Query Hook Pattern

```typescript
// src/hooks/use-campaign-stats.ts
import { useQuery } from '@tanstack/react-query';
import { fetchCampaignStats, aggregateCampaignStats } from '@/lib/api/campaigns';
import type { CampaignAggregate, CampaignApiError } from '@/types/campaigns';

export interface UseCampaignStatsOptions {
  enabled?: boolean;
}

export function useCampaignStats(options: UseCampaignStatsOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['campaigns', 'stats'],
    queryFn: async () => {
      // Fetch all campaigns (set high limit to get all for aggregation)
      // NOTE: If >100 campaigns exist, consider pagination loop or backend summary endpoint
      const response = await fetchCampaignStats({ limit: 100 });
      return aggregateCampaignStats(response.data);
    },
    staleTime: 60 * 1000,      // 1 minute
    gcTime: 5 * 60 * 1000,     // 5 minutes
    retry: 2,
    enabled,
  });
}
```

### API Client

```typescript
// src/lib/api/campaigns.ts
import { CampaignStatsResponse, CampaignApiError } from '@/types/campaigns';

export async function fetchCampaignStats(
  params: { page?: number; limit?: number } = {}
): Promise<CampaignStatsResponse> {
  const { page = 1, limit = 100 } = params;
  const url = `/api/admin/campaigns/stats?page=${page}&limit=${limit}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  // Handle service unavailable (circuit breaker)
  if (response.status === 503) {
    throw new CampaignApiError(
      'Campaign service temporarily unavailable',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }

  if (!response.ok) {
    throw new CampaignApiError(
      `Failed to fetch campaign stats: ${response.statusText}`,
      response.status
    );
  }

  const result = await response.json();

  if (!result.success) {
    throw new CampaignApiError(
      result.error?.message || 'Unknown error',
      response.status,
      result.error?.code
    );
  }

  return result;
}
```

### Campaign KPI Card Component

```typescript
// src/components/campaigns/campaign-kpi-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Send, Eye, MousePointerClick, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CampaignIconType = 'campaigns' | 'delivered' | 'opened' | 'clicked';

interface CampaignKPICardProps {
  title: string;
  value: number;
  rate?: number;
  rateLabel?: string;
  icon: CampaignIconType;
}

const icons: Record<CampaignIconType, LucideIcon> = {
  campaigns: Mail,
  delivered: Send,
  opened: Eye,
  clicked: MousePointerClick,
};

export function CampaignKPICard({
  title,
  value,
  rate,
  rateLabel,
  icon
}: CampaignKPICardProps) {
  const Icon = icons[icon];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {rate !== undefined && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span>{rate.toFixed(1)}%</span>
            {rateLabel && <span>{rateLabel}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### Campaign KPI Cards Grid

```typescript
// src/components/campaigns/campaign-kpi-cards-grid.tsx
'use client';

import { CampaignKPICard } from './campaign-kpi-card';
import { CampaignKPICardSkeleton } from './campaign-kpi-card-skeleton';
import { CampaignsError } from './campaigns-error';
import { useCampaignStats } from '@/hooks/use-campaign-stats';

export function CampaignKPICardsGrid() {
  const { data, isLoading, isError, error, refetch } = useCampaignStats();

  if (isLoading) {
    return <CampaignKPICardsSkeleton />;
  }

  if (isError) {
    return <CampaignsError message={error?.message} onRetry={refetch} />;
  }

  if (!data) return null;

  const {
    totalCampaigns,
    delivered,
    uniqueOpens,
    uniqueClicks,
    openRate,
    clickRate
  } = data;

  // Empty state: show cards with 0 values + hint message (AC6)
  const isEmpty = totalCampaigns === 0;

  return (
    <div className="space-y-4">
      {isEmpty && (
        <div className="text-center py-4 text-muted-foreground">
          No campaign data available yet. Campaign metrics will appear here once Brevo sends events.
        </div>
      )}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <CampaignKPICard
          title="Total Campaigns"
          value={totalCampaigns}
          icon="campaigns"
        />
        <CampaignKPICard
          title="Delivered"
          value={delivered}
          icon="delivered"
        />
        <CampaignKPICard
          title="Opened"
          value={uniqueOpens}
          rate={openRate}
          rateLabel="open rate"
          icon="opened"
        />
        <CampaignKPICard
          title="Clicked"
          value={uniqueClicks}
          rate={clickRate}
          rateLabel="click rate"
          icon="clicked"
        />
      </div>
    </div>
  );
}

// Skeleton wrapper for Suspense fallback
export function CampaignKPICardsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <CampaignKPICardSkeleton key={i} />
      ))}
    </div>
  );
}
```

### Campaigns Page Structure

```typescript
// src/app/(dashboard)/campaigns/page.tsx
import { Suspense } from 'react';
import { CampaignKPICardsGrid, CampaignKPICardsSkeleton } from '@/components/campaigns';

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

      <Suspense fallback={<CampaignKPICardsSkeleton />}>
        <CampaignKPICardsGrid />
      </Suspense>

      {/* Future: Campaign Table (Story 5-4), Charts (Story 5-6) */}
    </div>
  );
}
```

### File Structure

```
eneos-admin-dashboard/src/
├── app/(dashboard)/campaigns/
│   └── page.tsx                    # Campaigns page (NEW)
├── components/campaigns/
│   ├── campaign-kpi-card.tsx       # Single KPI card (NEW)
│   ├── campaign-kpi-card-skeleton.tsx  # Loading skeleton (NEW)
│   ├── campaign-kpi-cards-grid.tsx # Grid of 4 cards + CampaignKPICardsSkeleton (NEW)
│   ├── campaigns-error.tsx         # Error state (NEW)
│   └── index.ts                    # Barrel export (NEW)
├── hooks/
│   └── use-campaign-stats.ts       # TanStack Query hook (NEW)
├── lib/api/
│   └── campaigns.ts                # API client & aggregation (NEW)
├── types/
│   └── campaigns.ts                # TypeScript types (NEW)
└── __tests__/
    ├── components/
    │   └── campaigns/
    │       ├── campaign-kpi-card.test.tsx
    │       ├── campaign-kpi-cards-grid.test.tsx
    │       └── campaigns-error.test.tsx
    ├── hooks/
    │   └── use-campaign-stats.test.ts
    └── lib/api/
        └── campaigns.test.ts
```

### Sidebar Navigation Update

Update `src/components/layout/sidebar.tsx` to include Campaigns link:

```typescript
// Add to navigation items
{
  title: 'Campaigns',
  href: '/campaigns',
  icon: Mail,
}
```

### Icons Used (lucide-react)

| Card | Icon | Import |
|------|------|--------|
| Total Campaigns | Mail | `import { Mail } from 'lucide-react'` |
| Delivered | Send | `import { Send } from 'lucide-react'` |
| Opened | Eye | `import { Eye } from 'lucide-react'` |
| Clicked | MousePointerClick | `import { MousePointerClick } from 'lucide-react'` |

### Existing Pattern References

**CRITICAL:** Follow exact patterns from these existing components:

| Pattern | Source File | What to Reuse |
|---------|-------------|---------------|
| KPI Card UI | `src/components/dashboard/kpi-card.tsx` | Card layout, icon placement, value formatting |
| KPI Card Skeleton | `src/components/dashboard/kpi-card-skeleton.tsx` | Skeleton dimensions, aria attributes |
| KPI Cards Grid | `src/components/dashboard/kpi-cards-grid.tsx` | Grid layout, loading/error/data states |
| Error Component | `src/components/dashboard/dashboard-error.tsx` | Error UI, retry button pattern |
| TanStack Query Hook | `src/hooks/use-dashboard-data.ts` | Hook structure, error handling, cache config |
| API Client | `src/lib/api/dashboard.ts` | Fetch pattern, error class, response handling |

### Testing Patterns

**Use Vitest + React Testing Library:**

```typescript
// src/__tests__/components/campaigns/campaign-kpi-card.test.tsx
import { render, screen } from '@testing-library/react';
import { CampaignKPICard } from '@/components/campaigns/campaign-kpi-card';

describe('CampaignKPICard', () => {
  it('displays value with formatting', () => {
    render(
      <CampaignKPICard
        title="Delivered"
        value={1234567}
        icon="delivered"
      />
    );
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('displays rate when provided', () => {
    render(
      <CampaignKPICard
        title="Opened"
        value={1000}
        rate={42.5}
        rateLabel="open rate"
        icon="opened"
      />
    );
    expect(screen.getByText('42.5%')).toBeInTheDocument();
    expect(screen.getByText('open rate')).toBeInTheDocument();
  });
});
```

### Project Structure Notes

**Alignment with Admin Dashboard Structure:**
- Components in `src/components/campaigns/` (parallel to `src/components/dashboard/`)
- Hooks in `src/hooks/` (alongside other hooks)
- Types in `src/types/campaigns.ts`
- API client in `src/lib/api/campaigns.ts`
- Page in `src/app/(dashboard)/campaigns/page.tsx`

### Dependencies (Already Installed)

- `@tanstack/react-query` ^5.x - Data fetching
- `lucide-react` ^0.5x - Icons
- `tailwindcss` ^3.x - Styling
- shadcn/ui components (Card, Skeleton) - Already available

### Do NOT

- ❌ Create duplicate KPI card implementation - REUSE existing pattern
- ❌ Use different styling than Dashboard cards - MATCH existing design
- ❌ Skip error/loading states - IMPLEMENT all states
- ❌ Hardcode API URL - USE environment variable via fetch
- ❌ Forget responsive layout - FOLLOW same grid pattern
- ❌ Skip tests - WRITE comprehensive tests

### Known Limitations

- **Pagination Cap:** Current implementation fetches max 100 campaigns. If ENEOS runs >100 campaigns, consider:
  - Option A: Loop through pagination pages in `fetchCampaignStats`
  - Option B: Add backend summary endpoint (GET /api/admin/campaigns/summary)
  - **For now:** 100 campaigns is sufficient for current business needs

### References

- [Source: _bmad-output/implementation-artifacts/5-2-campaign-stats-api.md] - Backend API spec
- [Source: _bmad-output/implementation-artifacts/stories/2-1-kpi-cards.md] - KPI Cards pattern
- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#EPIC-05] - Feature requirements
- [Source: _bmad-output/planning-artifacts/admin-dashboard/architecture.md#4] - Component architecture
- [Source: eneos-admin-dashboard/src/components/dashboard/kpi-card.tsx] - Existing KPI component

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- **2026-01-30:** Implemented all 8 tasks for Story 5-3 Campaign Summary Cards
- **2026-01-30:** Added API proxy route `src/app/api/admin/campaigns/stats/route.ts` for frontend-to-backend communication
- Created Campaigns page route with Suspense boundary and page metadata
- Enabled Campaigns navigation in sidebar by updating nav-items.ts (Mail icon)
- Created TypeScript types in src/types/campaigns.ts (CampaignStatsItem, CampaignStatsResponse, CampaignAggregate, CampaignApiError)
- Created API client src/lib/api/campaigns.ts with fetchCampaignStats and aggregateCampaignStats functions
- Created TanStack Query v5 hook src/hooks/use-campaign-stats.ts with proper caching (staleTime: 60s, gcTime: 5min)
- Created CampaignKPICard component matching Dashboard KPI card pattern
- Created CampaignKPICardSkeleton with accessibility attributes (aria-busy, aria-label)
- Created CampaignsError component with retry functionality
- Created CampaignKPICardsGrid with loading, error, empty, and data states
- Created barrel export src/components/campaigns/index.ts
- All 63 campaign-related tests pass (API: 17, Card: 13, Grid: 14, Skeleton: 6, Error: 7, Hook: 6)
- Full test suite passes (2247 tests, no regressions)
- TypeScript type-check passes
- ESLint lint passes
- Updated nav-items test to reflect Campaigns being enabled
- **2026-01-31 (Code Review Fixes):**
  - Fixed Dev Notes response structure documentation
  - Added 'use client' directive to skeleton component
  - Added Cache-Control headers to API proxy route
  - Added test for invalid response format validation
  - Simplified error logging in campaigns-error component

### File List

**Frontend (eneos-admin-dashboard)**

New Files:
- src/app/(dashboard)/campaigns/page.tsx
- src/app/api/admin/campaigns/stats/route.ts (API proxy to backend)
- src/components/campaigns/campaign-kpi-card.tsx
- src/components/campaigns/campaign-kpi-card-skeleton.tsx
- src/components/campaigns/campaign-kpi-cards-grid.tsx
- src/components/campaigns/campaigns-error.tsx
- src/components/campaigns/index.ts
- src/hooks/use-campaign-stats.ts
- src/lib/api/campaigns.ts
- src/types/campaigns.ts
- src/__tests__/campaigns-api.test.ts
- src/__tests__/campaign-kpi-card.test.tsx
- src/__tests__/campaign-kpi-card-skeleton.test.tsx
- src/__tests__/campaigns-error.test.tsx
- src/__tests__/campaign-kpi-cards-grid.test.tsx
- src/__tests__/use-campaign-stats.test.tsx

Modified Files:
- src/config/nav-items.ts (enabled Campaigns, changed icon to Mail)
- src/__tests__/config/nav-items.test.ts (updated test for Campaigns enabled)
- src/__tests__/components/layout/sidebar.test.tsx (updated test for Campaigns visible)

