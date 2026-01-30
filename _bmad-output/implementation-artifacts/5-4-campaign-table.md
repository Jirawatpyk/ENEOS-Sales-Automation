# Story 5.4: Campaign Table

Status: done

## Story

As an **ENEOS manager**,
I want **to see a table listing all email campaigns with their metrics (Delivered, Opened, Clicked, Open Rate, Click Rate)**,
so that **I can compare campaign performance and identify which campaigns are most effective**.

## Acceptance Criteria

1. **AC1: Campaign Table Display**
   - Given I am on the Campaigns page
   - When the page loads (below the KPI cards from Story 5-3)
   - Then I see a table with columns: Campaign Name, Delivered, Opened, Clicked, Open Rate, Click Rate, Last Updated
   - And each row represents one campaign

2. **AC2: Data from Backend API**
   - Given the Campaigns page loads
   - When data is fetched from `GET /api/admin/campaigns/stats`
   - Then the table displays all campaigns returned by the API
   - And numeric values are formatted with locale separators (1,234)
   - And rates are displayed as percentages with 1 decimal (42.5%)
   - And Last Updated shows relative time (e.g., "2 hours ago")

3. **AC3: Pagination**
   - Given there are more than 10 campaigns
   - When I view the table
   - Then I see pagination controls at the bottom
   - And I can navigate between pages
   - And page size options are: 10, 20, 50

4. **AC4: Sorting**
   - Given I view the campaign table
   - When I click a column header (Delivered, Opened, Clicked, Open Rate, Click Rate, Last Updated)
   - Then the table sorts by that column
   - And clicking again toggles between ascending/descending
   - And a sort indicator arrow shows current sort direction

5. **AC5: Loading State**
   - Given the table is loading data
   - When API request is in progress
   - Then I see skeleton rows in the table
   - And skeletons match the table row dimensions

6. **AC6: Empty State**
   - Given there are no campaigns
   - When the API returns empty data
   - Then I see an empty state message: "No campaigns yet"
   - And a hint: "Campaign data will appear here once Brevo sends events"

7. **AC7: Error State**
   - Given the API call fails
   - When the table cannot load data
   - Then I see an error message with "Retry" button
   - And clicking Retry re-fetches the data

8. **AC8: Responsive Layout**
   - Given I view the table on different screen sizes
   - When on desktop (≥1024px), full table with all columns visible
   - When on tablet (768-1023px), table scrolls horizontally
   - When on mobile (<768px), table scrolls horizontally with sticky first column

## Tasks / Subtasks

- [x] **Task 1: Create Campaign Table Hook** (AC: #2, #3, #4)
  - [x] 1.1 Create `src/hooks/use-campaigns-table.ts` - TanStack Query hook for table data
  - [x] 1.2 Support pagination params (page, limit)
  - [x] 1.3 Support sorting params (sortBy, sortOrder)
  - [x] 1.4 Reuse types from `src/types/campaigns.ts`
  - [x] 1.5 **Update API proxy route** `src/app/api/admin/campaigns/stats/route.ts` to forward sortBy, sortOrder params
  - [x] 1.6 Write unit tests (8+ test cases) - 14 tests

- [x] **Task 2: Create Campaign Table Component** (AC: #1, #2, #4, #8)
  - [x] 2.1 Create `src/components/campaigns/campaign-table.tsx`
  - [x] 2.2 Use TanStack Table for table management
  - [x] 2.3 Define columns: Campaign Name, Delivered, Opened, Clicked, Open Rate, Click Rate, Last Updated
  - [x] 2.4 Format numbers with `.toLocaleString()`
  - [x] 2.5 Format rates as percentages (42.5%)
  - [x] 2.6 Format Last Updated with `formatDistanceToNow` from date-fns
  - [x] 2.7 Create `SortableHeader` helper component for sortable column headers
  - [x] 2.8 Implement sort indicators (ArrowUp/ArrowDown/ArrowUpDown icons)
  - [x] 2.9 Add horizontal scroll for responsive layout
  - [x] 2.10 Write unit tests (10+ test cases) - 16 tests

- [x] **Task 3: Create Table Pagination** (AC: #3)
  - [x] 3.1 Create `src/components/campaigns/campaign-table-pagination.tsx`
  - [x] 3.2 Reuse pattern from leads table pagination
  - [x] 3.3 Page size selector (10, 20, 50)
  - [x] 3.4 Page navigation (Previous, Next, page numbers)
  - [x] 3.5 Show total count and current range
  - [x] 3.6 Write unit tests (5+ test cases) - 12 tests

- [x] **Task 4: Loading State** (AC: #5)
  - [x] 4.1 Create `src/components/campaigns/campaign-table-skeleton.tsx`
  - [x] 4.2 Skeleton rows matching table structure
  - [x] 4.3 Add aria-busy for accessibility
  - [x] 4.4 Write unit tests (3+ test cases) - 5 tests

- [x] **Task 5: Empty & Error States** (AC: #6, #7)
  - [x] 5.1 Add empty state to campaign-table.tsx
  - [x] 5.2 Reuse CampaignsError component from Story 5-3
  - [x] 5.3 Write unit tests (4+ test cases) - included in campaign-table.test.tsx

- [x] **Task 6: Integration** (AC: #1)
  - [x] 6.1 Update `src/app/(dashboard)/campaigns/page.tsx` to include CampaignTable
  - [x] 6.2 Add Suspense boundary with skeleton fallback
  - [x] 6.3 Update barrel export `src/components/campaigns/index.ts`

- [x] **Task 7: Testing** (AC: #1-#8)
  - [x] 7.1 Verify table displays with correct columns
  - [x] 7.2 Verify pagination works
  - [x] 7.3 Verify sorting works
  - [x] 7.4 Verify loading skeleton appears
  - [x] 7.5 Verify error state and retry works
  - [x] 7.6 Verify responsive horizontal scroll

## Dev Notes

### Backend API Reference (Story 5-2)

**Endpoint:** `GET /api/admin/campaigns/stats`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `sortBy` | string | 'Last_Updated' | Sort column |
| `sortOrder` | 'asc' \| 'desc' | 'desc' | Sort direction |
| `search` | string | - | Search by campaign name |

**sortBy Options:**
- `Last_Updated` (default)
- `First_Event`
- `Campaign_Name`
- `Delivered`
- `Opened`
- `Clicked`
- `Open_Rate`
- `Click_Rate`

**Response Format:**
```typescript
// Note: Backend wraps data in nested structure
interface CampaignStatsResponse {
  success: boolean;
  data: {
    data: CampaignStatsItem[];  // Array of campaigns
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
  openRate: number;
  clickRate: number;
  firstEvent: string;
  lastUpdated: string;
}
```

### TypeScript Types (Extend from Story 5-3)

```typescript
// src/types/campaigns.ts - Add these types
export interface CampaignTableParams {
  page?: number;
  limit?: number;
  sortBy?: CampaignSortBy;
  sortOrder?: 'asc' | 'desc';
}

export type CampaignSortBy =
  | 'Last_Updated'
  | 'First_Event'
  | 'Campaign_Name'
  | 'Delivered'
  | 'Opened'
  | 'Clicked'
  | 'Open_Rate'
  | 'Click_Rate';
```

### TanStack Query Hook for Table

```typescript
// src/hooks/use-campaigns-table.ts
import { useQuery } from '@tanstack/react-query';
import { fetchCampaignStats } from '@/lib/api/campaigns';
import type { CampaignTableParams, CampaignStatsResponse } from '@/types/campaigns';

export function useCampaignsTable(params: CampaignTableParams = {}) {
  const { page = 1, limit = 20, sortBy = 'Last_Updated', sortOrder = 'desc' } = params;

  return useQuery({
    queryKey: ['campaigns', 'table', { page, limit, sortBy, sortOrder }],
    queryFn: () => fetchCampaignStats({ page, limit, sortBy, sortOrder }),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });
}
```

### Update API Client

```typescript
// src/lib/api/campaigns.ts - Update fetchCampaignStats to support sorting
export async function fetchCampaignStats(
  params: CampaignTableParams = {}
): Promise<CampaignStatsResponse> {
  const { page = 1, limit = 20, sortBy, sortOrder } = params;

  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  // Only add sorting params if provided (API has defaults)
  if (sortBy) searchParams.set('sortBy', sortBy);
  if (sortOrder) searchParams.set('sortOrder', sortOrder);

  const url = `/api/admin/campaigns/stats?${searchParams.toString()}`;
  // ... rest of fetch logic (same as Story 5-3)
}
```

### Update API Proxy Route

```typescript
// src/app/api/admin/campaigns/stats/route.ts - Add sortBy, sortOrder forwarding
// Inside GET handler, update query param extraction:

const page = searchParams.get('page') || '1';
const limit = searchParams.get('limit') || '100';
const sortBy = searchParams.get('sortBy') || 'Last_Updated';
const sortOrder = searchParams.get('sortOrder') || 'desc';

// Update backend URL:
const backendUrl = `${BACKEND_URL}/api/admin/campaigns/stats?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
```

### Column Data Mapping Note

| AC Column Name | API Field | Description |
|----------------|-----------|-------------|
| Campaign Name | `campaignName` | Campaign title |
| Delivered | `delivered` | Total delivered count |
| **Opened** | `uniqueOpens` | **Unique** open count (not total opens) |
| **Clicked** | `uniqueClicks` | **Unique** click count (not total clicks) |
| Open Rate | `openRate` | Already calculated by backend |
| Click Rate | `clickRate` | Already calculated by backend |
| Last Updated | `lastUpdated` | ISO timestamp → format with date-fns |

### Campaign Table Component

```typescript
// src/components/campaigns/campaign-table.tsx
'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCampaignsTable } from '@/hooks/use-campaigns-table';
import { CampaignTablePagination } from './campaign-table-pagination';
import { CampaignTableSkeleton } from './campaign-table-skeleton';
import { CampaignsError } from './campaigns-error';
import type { CampaignStatsItem, CampaignSortBy } from '@/types/campaigns';

const columns: ColumnDef<CampaignStatsItem>[] = [
  {
    accessorKey: 'campaignName',
    header: 'Campaign Name',
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue('campaignName')}</span>
    ),
  },
  {
    accessorKey: 'delivered',
    header: ({ column }) => <SortableHeader column={column} label="Delivered" />,
    cell: ({ row }) => row.getValue<number>('delivered').toLocaleString(),
  },
  {
    accessorKey: 'uniqueOpens',
    header: ({ column }) => <SortableHeader column={column} label="Opened" />,
    cell: ({ row }) => row.getValue<number>('uniqueOpens').toLocaleString(),
  },
  {
    accessorKey: 'uniqueClicks',
    header: ({ column }) => <SortableHeader column={column} label="Clicked" />,
    cell: ({ row }) => row.getValue<number>('uniqueClicks').toLocaleString(),
  },
  {
    accessorKey: 'openRate',
    header: ({ column }) => <SortableHeader column={column} label="Open Rate" />,
    cell: ({ row }) => `${row.getValue<number>('openRate').toFixed(1)}%`,
  },
  {
    accessorKey: 'clickRate',
    header: ({ column }) => <SortableHeader column={column} label="Click Rate" />,
    cell: ({ row }) => `${row.getValue<number>('clickRate').toFixed(1)}%`,
  },
  {
    accessorKey: 'lastUpdated',
    header: ({ column }) => <SortableHeader column={column} label="Last Updated" />,
    cell: ({ row }) => formatDistanceToNow(new Date(row.getValue('lastUpdated')), { addSuffix: true }),
  },
];

export function CampaignTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<CampaignSortBy>('Last_Updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, isError, error, refetch } = useCampaignsTable({
    page,
    limit: pageSize,
    sortBy,
    sortOrder,
  });

  const handleSort = (columnId: string) => {
    const columnToSortBy = mapColumnToSortBy(columnId);
    if (sortBy === columnToSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnToSortBy);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return <CampaignTableSkeleton />;
  }

  if (isError) {
    return <CampaignsError message={error?.message} onRetry={refetch} />;
  }

  // Access nested data: response.data.data = campaigns array
  const campaigns = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No campaigns yet</p>
        <p className="text-sm">Campaign data will appear here once Brevo sends events</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.id || column.accessorKey}>
                  {/* Render header */}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.campaignId}>
                {/* Render cells */}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CampaignTablePagination
        page={page}
        pageSize={pageSize}
        total={pagination?.total ?? 0}
        totalPages={pagination?.totalPages ?? 1}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}

function mapColumnToSortBy(columnId: string): CampaignSortBy {
  const map: Record<string, CampaignSortBy> = {
    delivered: 'Delivered',
    uniqueOpens: 'Opened',
    uniqueClicks: 'Clicked',
    openRate: 'Open_Rate',
    clickRate: 'Click_Rate',
    lastUpdated: 'Last_Updated',
    campaignName: 'Campaign_Name',
  };
  return map[columnId] || 'Last_Updated';
}

// SortableHeader helper component
interface SortableHeaderProps {
  column: Column<CampaignStatsItem>;
  label: string;
  currentSortBy: CampaignSortBy;
  currentSortOrder: 'asc' | 'desc';
  onSort: (columnId: string) => void;
}

function SortableHeader({ column, label, currentSortBy, currentSortOrder, onSort }: SortableHeaderProps) {
  const columnSortBy = mapColumnToSortBy(column.id);
  const isActive = currentSortBy === columnSortBy;

  return (
    <Button
      variant="ghost"
      onClick={() => onSort(column.id)}
      className="-ml-4"
    >
      {label}
      {isActive ? (
        currentSortOrder === 'asc' ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
```

### Campaign Table Pagination

```typescript
// src/components/campaigns/campaign-table-pagination.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CampaignTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function CampaignTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: CampaignTablePaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-sm text-muted-foreground">
        Showing {start} to {end} of {total} campaigns
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
              onPageChange(1); // Reset to first page
            }}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
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
    </div>
  );
}
```

### File Structure

```
eneos-admin-dashboard/src/
├── components/campaigns/
│   ├── campaign-kpi-card.tsx           # From Story 5-3
│   ├── campaign-kpi-card-skeleton.tsx  # From Story 5-3
│   ├── campaign-kpi-cards-grid.tsx     # From Story 5-3
│   ├── campaigns-error.tsx             # From Story 5-3 (reuse)
│   ├── campaign-table.tsx              # NEW - Story 5-4
│   ├── campaign-table-skeleton.tsx     # NEW - Story 5-4
│   ├── campaign-table-pagination.tsx   # NEW - Story 5-4
│   └── index.ts                        # Update barrel export
├── hooks/
│   ├── use-campaign-stats.ts           # From Story 5-3
│   └── use-campaigns-table.ts          # NEW - Story 5-4
├── types/
│   └── campaigns.ts                    # Update with table types
└── __tests__/
    ├── campaign-table.test.tsx         # NEW
    ├── campaign-table-skeleton.test.tsx # NEW
    ├── campaign-table-pagination.test.tsx # NEW
    └── use-campaigns-table.test.tsx    # NEW
```

### Existing Pattern References

**CRITICAL:** Follow exact patterns from these existing components:

| Pattern | Source File | What to Reuse |
|---------|-------------|---------------|
| Table Component | `src/components/leads/lead-table.tsx` | TanStack Table setup, column definitions |
| Table Pagination | `src/components/leads/lead-table-pagination.tsx` | Pagination UI pattern |
| Table Skeleton | `src/components/leads/lead-table-skeleton.tsx` | Skeleton row structure |
| Error Component | `src/components/campaigns/campaigns-error.tsx` | Already created in Story 5-3 |
| API Client | `src/lib/api/campaigns.ts` | Already created in Story 5-3 |

### Dependencies (Already Installed)

- `@tanstack/react-table` ^8.x - Table management
- `@tanstack/react-query` ^5.x - Data fetching
- `date-fns` ^3.x - Date formatting
- `lucide-react` - Sort icons (ArrowUpDown, ArrowUp, ArrowDown)
- shadcn/ui Table components - Already available

### Do NOT

- ❌ Create new error component - REUSE `CampaignsError` from Story 5-3
- ❌ Duplicate API client - REUSE/EXTEND `src/lib/api/campaigns.ts`
- ❌ Different pagination pattern - MATCH leads table pagination
- ❌ Skip sorting functionality - IMPLEMENT server-side sorting via API
- ❌ Skip responsive scroll - ADD horizontal scroll for mobile/tablet

### References

- [Source: _bmad-output/implementation-artifacts/5-3-campaign-summary-cards.md] - Previous story patterns
- [Source: _bmad-output/implementation-artifacts/5-2-campaign-stats-api.md] - Backend API spec
- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#EPIC-05] - Feature requirements
- [Source: eneos-admin-dashboard/src/components/leads/lead-table.tsx] - Table pattern reference

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All 47 tests passing for Story 5-4 components
- TypeScript and ESLint checks pass

### Completion Notes List

- **Task 1:** Created `use-campaigns-table.ts` hook with TanStack Query v5 - supports pagination (page, limit) and sorting (sortBy, sortOrder) params. Updated API proxy route to forward sorting params. 14 tests passing.
- **Task 2:** Created `campaign-table.tsx` with TanStack Table - 7 columns (Campaign Name, Delivered, Opened, Clicked, Open Rate, Click Rate, Last Updated), SortableHeader component, server-side sorting. 16 tests passing.
- **Task 3:** Created `campaign-table-pagination.tsx` with page size options (10, 20, 50), Previous/Next navigation, current range display. 12 tests passing.
- **Task 4:** Created `campaign-table-skeleton.tsx` with 10 skeleton rows, aria-busy for accessibility. 5 tests passing.
- **Task 5:** Added empty state ("No campaigns yet") and error state (reused CampaignsError component). Tests included in campaign-table.test.tsx.
- **Task 6:** Updated campaigns page with Suspense boundary and skeleton fallback. Updated barrel exports.
- **Task 7:** All AC#1-#8 verified via 47 unit tests.

### File List

**Frontend (eneos-admin-dashboard):**
- `src/types/campaigns.ts` - Added CampaignSortBy and CampaignTableParams types
- `src/lib/api/campaigns.ts` - Updated fetchCampaignStats to support sorting params
- `src/app/api/admin/campaigns/stats/route.ts` - Added sortBy, sortOrder param forwarding
- `src/hooks/use-campaigns-table.ts` - NEW - TanStack Query hook for table data
- `src/components/campaigns/campaign-table.tsx` - NEW - Campaign table component
- `src/components/campaigns/campaign-table-pagination.tsx` - NEW - Pagination component
- `src/components/campaigns/campaign-table-skeleton.tsx` - NEW - Skeleton component
- `src/components/campaigns/index.ts` - Updated barrel exports
- `src/app/(dashboard)/campaigns/page.tsx` - Added CampaignTable with Suspense

**Tests:**
- `src/__tests__/use-campaigns-table.test.tsx` - NEW - 14 tests
- `src/__tests__/campaign-table.test.tsx` - NEW - 16 tests
- `src/__tests__/campaign-table-pagination.test.tsx` - NEW - 12 tests
- `src/__tests__/campaign-table-skeleton.test.tsx` - NEW - 5 tests

