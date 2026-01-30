# Story 5.7: Campaign Detail Sheet

Status: ready-for-dev

## Story

As an **ENEOS manager**,
I want **to click on a campaign row to see detailed event logs (delivered, opened, clicked events) in a side sheet**,
so that **I can analyze individual campaign engagement and understand which contacts interacted with the email**.

## Acceptance Criteria

1. **AC1: Sheet Opens on Row Click**
   - Given I am viewing the Campaign Table (Story 5-4)
   - When I click on a campaign row
   - Then a side sheet opens with the campaign name as the title
   - And the sheet displays campaign details and event log

2. **AC2: Campaign Summary in Sheet Header**
   - Given the campaign detail sheet is open
   - When I view the header section
   - Then I see: Campaign Name, Total Delivered, Unique Opens, Unique Clicks
   - And I see Open Rate and Click Rate percentages
   - And I see First Event date and Last Updated date

3. **AC3: Event Log Table Display**
   - Given the campaign detail sheet is open
   - When I view the event log section
   - Then I see a table with columns: Email, Event Type, Timestamp, URL (for clicks)
   - And events are sorted by timestamp (newest first)
   - And each row shows one event

4. **AC4: Event Type Filter**
   - Given the event log is displayed
   - When I click event type filter tabs/buttons (All, Delivered, Opened, Clicked)
   - Then the table filters to show only events of that type
   - And the count updates to reflect filtered results

5. **AC5: Pagination in Event Log**
   - Given there are more than 20 events
   - When I view the event log
   - Then I see pagination controls at the bottom
   - And I can navigate between pages
   - And page size is 20 events per page

6. **AC6: Loading State**
   - Given I click on a campaign row
   - When event data is being fetched
   - Then I see a loading spinner in the sheet body
   - And the sheet header shows campaign name immediately (from table data)

7. **AC7: Error State**
   - Given the event log API fails
   - When I cannot load event data
   - Then I see an error message with "Retry" button
   - And clicking Retry re-fetches the events

8. **AC8: Empty State**
   - Given a campaign has no events yet
   - When the API returns empty data
   - Then I see: "No events recorded for this campaign"

9. **AC9: Sheet Close**
   - Given the sheet is open
   - When I click the X button OR click outside the sheet OR press Escape
   - Then the sheet closes
   - And the Campaign Table remains visible

10. **AC10: Responsive Layout**
    - Given I view the sheet on different screen sizes
    - When on desktop (>=1024px), sheet width is max-w-xl (consistent with LeadDetailSheet)
    - When on tablet/mobile (<1024px), sheet is full-width

11. **AC11: Search by Email** (Optional Enhancement)
    - Given the event log is displayed
    - When I type in the email search box
    - Then the table filters to show only events matching that email (debounce 300ms)
    - And the search is case-insensitive partial match

12. **AC12: Copy Email to Clipboard** (Optional Enhancement)
    - Given I view an event row
    - When I click the copy icon next to the email
    - Then the email is copied to clipboard
    - And I see a toast notification "Email copied"

13. **AC13: Date Range Filter** (Optional Enhancement)
    - Given I view the event log
    - When I select a date range (From/To date pickers)
    - Then the table filters to show only events within that range
    - And clearing the dates shows all events again

## Tasks / Subtasks

- [ ] **Task 1: Create Campaign Detail Sheet Component** (AC: #1, #2, #9, #10)
  - [ ] 1.1 Create `src/components/campaigns/campaign-detail-sheet.tsx`
  - [ ] 1.2 Use shadcn/ui Sheet component (consistent with LeadDetailSheet pattern)
  - [ ] 1.3 Accept props: `campaign`, `open`, `onOpenChange`
  - [ ] 1.4 Display campaign summary header (passed from table data)
  - [ ] 1.5 Implement close on X, outside click, and Escape key (Sheet handles automatically)
  - [ ] 1.6 Add responsive width classes (`w-full sm:max-w-xl overflow-y-auto`)
  - [ ] 1.7 Write unit tests (10+ test cases)

- [ ] **Task 2: Create Campaign Events Hook** (AC: #3, #4, #5, #6, #7)
  - [ ] 2.1 Create `src/hooks/use-campaign-events.ts`
  - [ ] 2.2 TanStack Query hook calling `GET /api/admin/campaigns/:id/events`
  - [ ] 2.3 Support pagination params (page, limit)
  - [ ] 2.4 Support event type filter param
  - [ ] 2.5 Reuse types from `src/types/campaigns.ts`
  - [ ] 2.6 Write unit tests (8+ test cases)

- [ ] **Task 3: Create API Client for Events** (AC: #3)
  - [ ] 3.1 Add `fetchCampaignEvents()` to `src/lib/api/campaigns.ts`
  - [ ] 3.2 Handle error responses consistently
  - [ ] 3.3 Write unit tests (5+ test cases)

- [ ] **Task 4: Create API Proxy Route for Events** (AC: #3)
  - [ ] 4.1 Create `src/app/api/admin/campaigns/[id]/events/route.ts`
  - [ ] 4.2 Forward to backend with auth token
  - [ ] 4.3 Support query params (page, limit, event, dateFrom, dateTo)
  - [ ] 4.4 Add Cache-Control headers

- [ ] **Task 5: Create Event Log Table** (AC: #3, #5)
  - [ ] 5.1 Create `src/components/campaigns/campaign-events-table.tsx`
  - [ ] 5.2 Display columns: Email, Event Type, Timestamp, URL
  - [ ] 5.3 Format timestamp with date-fns
  - [ ] 5.4 Show URL as link (for click events only)
  - [ ] 5.5 Add pagination controls
  - [ ] 5.6 Write unit tests (8+ test cases)

- [ ] **Task 6: Event Type Filter Tabs** (AC: #4)
  - [ ] 6.1 Create `src/components/campaigns/campaign-event-filter.tsx`
  - [ ] 6.2 Use shadcn/ui Tabs or Button group
  - [ ] 6.3 Options: All, Delivered, Opened, Clicked
  - [ ] 6.4 Show event count per type (optional, from API if available)
  - [ ] 6.5 Write unit tests (5+ test cases)

- [ ] **Task 7: Loading, Error, Empty States** (AC: #6, #7, #8)
  - [ ] 7.1 Create `src/components/campaigns/campaign-events-skeleton.tsx`
  - [ ] 7.2 Reuse CampaignsError component for error state
  - [ ] 7.3 Create empty state message component
  - [ ] 7.4 Write unit tests (5+ test cases)

- [ ] **Task 8: Integration with Campaign Table** (AC: #1)
  - [ ] 8.1 Update `src/components/campaigns/campaign-table.tsx`
  - [ ] 8.2 Add onClick handler to table rows
  - [ ] 8.3 Manage sheet state (selectedCampaign, isOpen)
  - [ ] 8.4 Pass campaign data to sheet
  - [ ] 8.5 Update barrel export `src/components/campaigns/index.ts`

- [ ] **Task 9: TypeScript Types** (AC: #3)
  - [ ] 9.1 Update `src/types/campaigns.ts` with event types
  - [ ] 9.2 Add CampaignEventItem, CampaignEventsResponse interfaces

- [ ] **Task 10: Email Search Feature** (AC: #11)
  - [ ] 10.1 Add search input to sheet header area
  - [ ] 10.2 Implement debounced search (300ms) using `useDebouncedValue` or similar
  - [ ] 10.3 Filter events client-side OR pass `search` param to API (if supported)
  - [ ] 10.4 Case-insensitive partial match
  - [ ] 10.5 Clear button to reset search
  - [ ] 10.6 Write unit tests (4+ test cases)

- [ ] **Task 11: Copy Email Feature** (AC: #12)
  - [ ] 11.1 Add copy button/icon next to email in table cell
  - [ ] 11.2 Use `navigator.clipboard.writeText()` for copy
  - [ ] 11.3 Show toast notification using `sonner` or existing toast system
  - [ ] 11.4 Add visual feedback on click (icon change briefly)
  - [ ] 11.5 Write unit tests (3+ test cases)

- [ ] **Task 12: Date Range Filter** (AC: #13)
  - [ ] 12.1 Add date picker inputs (From/To) using shadcn/ui DatePicker or Calendar
  - [ ] 12.2 Pass `dateFrom` and `dateTo` to `useCampaignEvents` hook
  - [ ] 12.3 Update API proxy to forward date params (already supported)
  - [ ] 12.4 Add clear button to reset date range
  - [ ] 12.5 Validate that From <= To
  - [ ] 12.6 Write unit tests (5+ test cases)

- [ ] **Task 13: Testing** (AC: #1-#13)
  - [ ] 13.1 Verify sheet opens on row click
  - [ ] 13.2 Verify event filter works
  - [ ] 13.3 Verify pagination works
  - [ ] 13.4 Verify loading/error/empty states
  - [ ] 13.5 Verify sheet closes properly
  - [ ] 13.6 Verify responsive layout
  - [ ] 13.7 Verify email search filters correctly
  - [ ] 13.8 Verify copy email works and shows toast
  - [ ] 13.9 Verify date range filter works

## Dev Notes

### Backend API Reference (Story 5-2)

**Endpoint:** `GET /api/admin/campaigns/:id/events`

**Path Parameter:**
- `:id` = Campaign_ID (Brevo `camp_id`)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max 100) |
| `event` | string | - | Filter by event type (delivered/opened/click) |
| `dateFrom` | string | - | Filter by Event_At >= dateFrom (ISO 8601) |
| `dateTo` | string | - | Filter by Event_At <= dateTo (ISO 8601) |

**Response Format:**
```typescript
interface CampaignEventsResponse {
  success: boolean;
  data: {
    data: CampaignEventItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface CampaignEventItem {
  eventId: number;
  email: string;
  event: 'delivered' | 'opened' | 'click';
  eventAt: string;  // ISO 8601 timestamp
  url: string | null;  // Only for click events
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "eventId": 12345,
        "email": "john@example.com",
        "event": "click",
        "eventAt": "2026-01-30T10:05:00.000Z",
        "url": "https://example.com/promo"
      },
      {
        "eventId": 12344,
        "email": "jane@company.co.th",
        "event": "opened",
        "eventAt": "2026-01-30T09:55:00.000Z",
        "url": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1500,
      "totalPages": 75
    }
  }
}
```

### TypeScript Types to Add

```typescript
// src/types/campaigns.ts - Add these types

export interface CampaignEventItem {
  eventId: number;
  email: string;
  event: 'delivered' | 'opened' | 'click';
  eventAt: string;
  url: string | null;
}

export interface CampaignEventsResponse {
  success: boolean;
  data: {
    data: CampaignEventItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface CampaignEventsParams {
  campaignId: number;
  page?: number;
  limit?: number;
  event?: 'delivered' | 'opened' | 'click';
  dateFrom?: string;
  dateTo?: string;
}

export type CampaignEventType = 'all' | 'delivered' | 'opened' | 'click';

export interface CampaignEventsFilters {
  eventType: CampaignEventType;
  search: string;
  dateFrom: string | null;
  dateTo: string | null;
}
```

### TanStack Query Hook for Events

```typescript
// src/hooks/use-campaign-events.ts
import { useQuery } from '@tanstack/react-query';
import { fetchCampaignEvents } from '@/lib/api/campaigns';
import type { CampaignEventsParams, CampaignEventsResponse } from '@/types/campaigns';

export function useCampaignEvents(params: CampaignEventsParams) {
  const { campaignId, page = 1, limit = 20, event, dateFrom, dateTo } = params;

  return useQuery({
    queryKey: ['campaigns', campaignId, 'events', { page, limit, event, dateFrom, dateTo }],
    queryFn: () => fetchCampaignEvents(params),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!campaignId,
  });
}
```

### API Client

```typescript
// src/lib/api/campaigns.ts - Add this function

export async function fetchCampaignEvents(
  params: CampaignEventsParams
): Promise<CampaignEventsResponse> {
  const { campaignId, page = 1, limit = 20, event, dateFrom, dateTo } = params;

  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (event) searchParams.set('event', event);
  if (dateFrom) searchParams.set('dateFrom', dateFrom);
  if (dateTo) searchParams.set('dateTo', dateTo);

  const url = `/api/admin/campaigns/${campaignId}/events?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (response.status === 503) {
    throw new CampaignApiError(
      'Campaign service temporarily unavailable',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }

  if (response.status === 404) {
    throw new CampaignApiError(
      'Campaign not found',
      404,
      'NOT_FOUND'
    );
  }

  if (!response.ok) {
    throw new CampaignApiError(
      `Failed to fetch campaign events: ${response.statusText}`,
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

### API Proxy Route

```typescript
// src/app/api/admin/campaigns/[id]/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json(
      { success: false, error: { message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '20';
  const event = searchParams.get('event');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  const backendParams = new URLSearchParams({ page, limit });
  if (event) backendParams.set('event', event);
  if (dateFrom) backendParams.set('dateFrom', dateFrom);
  if (dateTo) backendParams.set('dateTo', dateTo);

  const backendUrl = `${BACKEND_URL}/api/admin/campaigns/${params.id}/events?${backendParams.toString()}`;

  try {
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('Campaign events API error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Backend unavailable' } },
      { status: 503 }
    );
  }
}
```

### Campaign Detail Sheet Component

```typescript
// src/components/campaigns/campaign-detail-sheet.tsx
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useState } from 'react';
import { useCampaignEvents } from '@/hooks/use-campaign-events';
import { CampaignEventsTable } from './campaign-events-table';
import { CampaignEventFilter } from './campaign-event-filter';
import { CampaignEventsSkeleton } from './campaign-events-skeleton';
import { CampaignsError } from './campaigns-error';
import type { CampaignStatsItem, CampaignEventType } from '@/types/campaigns';

interface CampaignDetailSheetProps {
  campaign: CampaignStatsItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignDetailSheet({
  campaign,
  open,
  onOpenChange,
}: CampaignDetailSheetProps) {
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState<CampaignEventType>('all');

  const { data, isLoading, isError, error, refetch } = useCampaignEvents({
    campaignId: campaign?.campaignId ?? 0,
    page,
    limit: 20,
    event: eventFilter === 'all' ? undefined : eventFilter,
  });

  // Reset state when sheet opens with new campaign
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setPage(1);
      setEventFilter('all');
    }
    onOpenChange(newOpen);
  };

  if (!campaign) return null;

  const events = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{campaign.campaignName}</SheetTitle>
        </SheetHeader>

        {/* Campaign Summary */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b">
          <div>
            <p className="text-sm text-muted-foreground">Delivered</p>
            <p className="text-lg font-semibold">{campaign.delivered.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Opened</p>
            <p className="text-lg font-semibold">
              {campaign.uniqueOpens.toLocaleString()}
              <span className="text-sm text-muted-foreground ml-1">
                ({campaign.openRate.toFixed(1)}%)
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Clicked</p>
            <p className="text-lg font-semibold">
              {campaign.uniqueClicks.toLocaleString()}
              <span className="text-sm text-muted-foreground ml-1">
                ({campaign.clickRate.toFixed(1)}%)
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="text-lg font-semibold">
              {new Date(campaign.lastUpdated).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Event Filter Tabs */}
        <CampaignEventFilter
          selected={eventFilter}
          onSelect={(type) => {
            setEventFilter(type);
            setPage(1); // Reset to page 1 when filter changes
          }}
        />

        {/* Event Log Content */}
        <div className="min-h-[300px]">
          {isLoading && <CampaignEventsSkeleton />}

          {isError && (
            <CampaignsError
              message={error?.message}
              onRetry={refetch}
            />
          )}

          {!isLoading && !isError && events.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No events recorded</p>
              <p className="text-sm">
                {eventFilter === 'all'
                  ? 'No events recorded for this campaign yet'
                  : `No ${eventFilter} events found`}
              </p>
            </div>
          )}

          {!isLoading && !isError && events.length > 0 && (
            <CampaignEventsTable
              events={events}
              page={page}
              pageSize={20}
              total={pagination?.total ?? 0}
              totalPages={pagination?.totalPages ?? 1}
              onPageChange={setPage}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Event Filter Component

```typescript
// src/components/campaigns/campaign-event-filter.tsx
'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CampaignEventType } from '@/types/campaigns';

interface CampaignEventFilterProps {
  selected: CampaignEventType;
  onSelect: (type: CampaignEventType) => void;
}

const filterOptions: { label: string; value: CampaignEventType }[] = [
  { label: 'All Events', value: 'all' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Opened', value: 'opened' },
  { label: 'Clicked', value: 'click' },
];

export function CampaignEventFilter({ selected, onSelect }: CampaignEventFilterProps) {
  return (
    <div className="flex gap-2 py-2">
      {filterOptions.map((option) => (
        <Button
          key={option.value}
          variant={selected === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(option.value)}
          className={cn(
            'min-w-[80px]',
            selected === option.value && 'pointer-events-none'
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
```

### Events Table Component

```typescript
// src/components/campaigns/campaign-events-table.tsx
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { CampaignEventItem } from '@/types/campaigns';

interface CampaignEventsTableProps {
  events: CampaignEventItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const eventBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  delivered: 'secondary',
  opened: 'outline',
  click: 'default',
};

export function CampaignEventsTable({
  events,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: CampaignEventsTableProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead className="w-[120px]">Event</TableHead>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead>URL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.eventId}>
                <TableCell className="font-medium">{event.email}</TableCell>
                <TableCell>
                  <Badge variant={eventBadgeVariant[event.event] ?? 'secondary'}>
                    {event.event}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(event.eventAt), 'yyyy-MM-dd HH:mm:ss')}
                </TableCell>
                <TableCell>
                  {event.url ? (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline max-w-[200px] truncate"
                    >
                      <span className="truncate">{event.url}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {start} to {end} of {total} events
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

### Events Skeleton

```typescript
// src/components/campaigns/campaign-events-skeleton.tsx
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function CampaignEventsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading events">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead className="w-[120px]">Event</TableHead>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead>URL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-[200px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-[70px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[140px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[150px]" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

### Email Search Component

```typescript
// src/components/campaigns/campaign-event-search.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CampaignEventSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CampaignEventSearch({
  value,
  onChange,
  placeholder = 'Search by email...',
}: CampaignEventSearchProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce the search
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          onClick={() => {
            setLocalValue('');
            onChange('');
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
```

### Copy Email Button

```typescript
// src/components/campaigns/copy-email-button.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface CopyEmailButtonProps {
  email: string;
}

export function CopyEmailButton({ email }: CopyEmailButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click

    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast.success('Email copied to clipboard');

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy email');
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 ml-2"
      onClick={handleCopy}
      title="Copy email"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </Button>
  );
}
```

### Date Range Filter

```typescript
// src/components/campaigns/campaign-date-filter.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CampaignDateFilterProps {
  dateFrom: Date | null;
  dateTo: Date | null;
  onDateFromChange: (date: Date | null) => void;
  onDateToChange: (date: Date | null) => void;
}

export function CampaignDateFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: CampaignDateFilterProps) {
  const hasFilter = dateFrom || dateTo;

  const clearDates = () => {
    onDateFromChange(null);
    onDateToChange(null);
  };

  return (
    <div className="flex items-center gap-2">
      {/* From Date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'w-[130px] justify-start text-left font-normal',
              !dateFrom && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateFrom ? format(dateFrom, 'MMM dd') : 'From'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateFrom ?? undefined}
            onSelect={(date) => onDateFromChange(date ?? null)}
            disabled={(date) => (dateTo ? date > dateTo : false)}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground">-</span>

      {/* To Date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'w-[130px] justify-start text-left font-normal',
              !dateTo && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateTo ? format(dateTo, 'MMM dd') : 'To'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateTo ?? undefined}
            onSelect={(date) => onDateToChange(date ?? null)}
            disabled={(date) => (dateFrom ? date < dateFrom : false)}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Clear Button */}
      {hasFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearDates}
          className="h-8 px-2"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

### Updated Campaign Detail Sheet (with all filters)

```typescript
// src/components/campaigns/campaign-detail-sheet.tsx - Updated version
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useState } from 'react';
import { format } from 'date-fns';
import { useCampaignEvents } from '@/hooks/use-campaign-events';
import { CampaignEventsTable } from './campaign-events-table';
import { CampaignEventFilter } from './campaign-event-filter';
import { CampaignEventSearch } from './campaign-event-search';
import { CampaignDateFilter } from './campaign-date-filter';
import { CampaignEventsSkeleton } from './campaign-events-skeleton';
import { CampaignsError } from './campaigns-error';
import type { CampaignStatsItem, CampaignEventType } from '@/types/campaigns';

interface CampaignDetailSheetProps {
  campaign: CampaignStatsItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignDetailSheet({
  campaign,
  open,
  onOpenChange,
}: CampaignDetailSheetProps) {
  // Pagination
  const [page, setPage] = useState(1);

  // Filters
  const [eventFilter, setEventFilter] = useState<CampaignEventType>('all');
  const [searchEmail, setSearchEmail] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  const { data, isLoading, isError, error, refetch } = useCampaignEvents({
    campaignId: campaign?.campaignId ?? 0,
    page,
    limit: 20,
    event: eventFilter === 'all' ? undefined : eventFilter,
    dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
    dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
  });

  // Reset all filters when sheet opens with new campaign
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setPage(1);
      setEventFilter('all');
      setSearchEmail('');
      setDateFrom(null);
      setDateTo(null);
    }
    onOpenChange(newOpen);
  };

  // Reset to page 1 when any filter changes
  const handleFilterChange = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  if (!campaign) return null;

  // Get events and apply client-side email search filter
  let events = data?.data?.data ?? [];
  if (searchEmail) {
    events = events.filter((e) =>
      e.email.toLowerCase().includes(searchEmail.toLowerCase())
    );
  }
  const pagination = data?.data?.pagination;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{campaign.campaignName}</SheetTitle>
        </SheetHeader>

        {/* Campaign Summary */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b">
          <div>
            <p className="text-sm text-muted-foreground">Delivered</p>
            <p className="text-lg font-semibold">{campaign.delivered.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Opened</p>
            <p className="text-lg font-semibold">
              {campaign.uniqueOpens.toLocaleString()}
              <span className="text-sm text-muted-foreground ml-1">
                ({campaign.openRate.toFixed(1)}%)
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Clicked</p>
            <p className="text-lg font-semibold">
              {campaign.uniqueClicks.toLocaleString()}
              <span className="text-sm text-muted-foreground ml-1">
                ({campaign.clickRate.toFixed(1)}%)
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="text-lg font-semibold">
              {new Date(campaign.lastUpdated).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-4 py-2">
          {/* Event Type Filter */}
          <CampaignEventFilter
            selected={eventFilter}
            onSelect={handleFilterChange(setEventFilter)}
          />

          {/* Email Search */}
          <CampaignEventSearch
            value={searchEmail}
            onChange={setSearchEmail}
          />

          {/* Date Range Filter */}
          <CampaignDateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={handleFilterChange(setDateFrom)}
            onDateToChange={handleFilterChange(setDateTo)}
          />
        </div>

        {/* Event Log Content */}
        <div className="min-h-[300px]">
          {isLoading && <CampaignEventsSkeleton />}

          {isError && (
            <CampaignsError
              message={error?.message}
              onRetry={refetch}
            />
          )}

          {!isLoading && !isError && events.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No events found</p>
              <p className="text-sm">
                {searchEmail
                  ? `No events matching "${searchEmail}"`
                  : eventFilter === 'all'
                  ? 'No events recorded for this campaign yet'
                  : `No ${eventFilter} events found`}
              </p>
            </div>
          )}

          {!isLoading && !isError && events.length > 0 && (
            <CampaignEventsTable
              events={events}
              page={page}
              pageSize={20}
              total={searchEmail ? events.length : (pagination?.total ?? 0)}
              totalPages={searchEmail ? 1 : (pagination?.totalPages ?? 1)}
              onPageChange={setPage}
              showCopyButton={true}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Updated Events Table (with Copy Button)

```typescript
// src/components/campaigns/campaign-events-table.tsx - Updated with copy button
// ... (same imports as before, plus CopyEmailButton)

import { CopyEmailButton } from './copy-email-button';

interface CampaignEventsTableProps {
  events: CampaignEventItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showCopyButton?: boolean;  // NEW prop
}

// Inside TableBody, update the email cell:
<TableCell className="font-medium">
  <div className="flex items-center">
    <span>{event.email}</span>
    {showCopyButton && <CopyEmailButton email={event.email} />}
  </div>
</TableCell>
```

### Update Campaign Table for Row Click

```typescript
// src/components/campaigns/campaign-table.tsx - Add these changes

// 1. Add state for sheet
const [selectedCampaign, setSelectedCampaign] = useState<CampaignStatsItem | null>(null);
const [isSheetOpen, setIsSheetOpen] = useState(false);

// 2. Add onClick to table rows
<TableRow
  key={campaign.campaignId}
  onClick={() => {
    setSelectedCampaign(campaign);
    setIsSheetOpen(true);
  }}
  className="cursor-pointer hover:bg-muted/50"
>
  {/* ... cells */}
</TableRow>

// 3. Add sheet at the end of the component
<CampaignDetailSheet
  campaign={selectedCampaign}
  open={isSheetOpen}
  onOpenChange={setIsSheetOpen}
/>
```

### File Structure

```
eneos-admin-dashboard/src/
├── app/api/admin/campaigns/
│   ├── stats/
│   │   └── route.ts                       # From Story 5-3
│   └── [id]/
│       ├── stats/
│       │   └── route.ts                   # NEW - Campaign detail stats
│       └── events/
│           └── route.ts                   # NEW - Story 5-7
├── components/campaigns/
│   ├── campaign-kpi-card.tsx              # From Story 5-3
│   ├── campaign-kpi-card-skeleton.tsx     # From Story 5-3
│   ├── campaign-kpi-cards-grid.tsx        # From Story 5-3
│   ├── campaigns-error.tsx                # From Story 5-3 (reuse)
│   ├── campaign-table.tsx                 # From Story 5-4 (modify)
│   ├── campaign-table-skeleton.tsx        # From Story 5-4
│   ├── campaign-table-pagination.tsx      # From Story 5-4
│   ├── campaign-detail-sheet.tsx           # NEW - Story 5-7
│   ├── campaign-events-table.tsx          # NEW - Story 5-7
│   ├── campaign-event-filter.tsx          # NEW - Story 5-7
│   ├── campaign-event-search.tsx          # NEW - Story 5-7 (AC11)
│   ├── campaign-date-filter.tsx           # NEW - Story 5-7 (AC13)
│   ├── copy-email-button.tsx              # NEW - Story 5-7 (AC12)
│   ├── campaign-events-skeleton.tsx       # NEW - Story 5-7
│   └── index.ts                           # Update barrel export
├── hooks/
│   ├── use-campaign-stats.ts              # From Story 5-3
│   ├── use-campaigns-table.ts             # From Story 5-4
│   └── use-campaign-events.ts             # NEW - Story 5-7
├── lib/api/
│   └── campaigns.ts                       # Update with fetchCampaignEvents
├── types/
│   └── campaigns.ts                       # Update with event types
└── __tests__/
    ├── campaign-detail-sheet.test.tsx     # NEW
    ├── campaign-events-table.test.tsx     # NEW
    ├── campaign-event-filter.test.tsx     # NEW
    ├── campaign-event-search.test.tsx     # NEW (AC11)
    ├── campaign-date-filter.test.tsx      # NEW (AC13)
    ├── copy-email-button.test.tsx         # NEW (AC12)
    ├── campaign-events-skeleton.test.tsx  # NEW
    └── use-campaign-events.test.tsx       # NEW
```

### Existing Pattern References

**CRITICAL:** Follow exact patterns from these existing components:

| Pattern | Source File | What to Reuse |
|---------|-------------|---------------|
| Sheet | `src/components/leads/lead-detail-sheet.tsx` | Sheet structure, close handling (LeadDetailSheet pattern) |
| Event Table | `src/components/campaigns/campaign-table.tsx` | Table structure from Story 5-4 |
| Error Component | `src/components/campaigns/campaigns-error.tsx` | Reuse from Story 5-3 |
| API Client | `src/lib/api/campaigns.ts` | Extend with fetchCampaignEvents |
| Query Hook | `src/hooks/use-campaign-events.ts` | Same pattern as use-campaigns-table |
| Pagination | `src/components/campaigns/campaign-table-pagination.tsx` | Reuse pagination pattern |
| Search Input | `src/components/leads/lead-search.tsx` | Debounced search pattern |
| Date Filter | `src/components/leads/lead-date-filter.tsx` | Date range picker pattern |
| Toast | Existing toast setup in app | Use sonner for notifications |

### Dependencies (Already Installed)

- `@tanstack/react-query` ^5.x - Data fetching
- `date-fns` ^3.x - Date formatting
- `lucide-react` - Icons (ExternalLink, ChevronLeft, ChevronRight, Search, X, Copy, Check, CalendarIcon)
- `sonner` - Toast notifications (for copy feedback)
- shadcn/ui components (Sheet, Table, Button, Badge, Skeleton, Input, Calendar, Popover)

### Do NOT

- ❌ Create duplicate error component - REUSE `CampaignsError`
- ❌ Fetch campaign summary in sheet - USE data passed from table row
- ❌ Skip event type filter - IMPLEMENT per AC4
- ❌ Hardcode page size - USE constants
- ❌ Skip loading skeleton - IMPLEMENT per AC6
- ❌ Forget responsive sheet - USE `w-full sm:max-w-xl overflow-y-auto` (consistent with LeadDetailSheet)
- ❌ Skip keyboard accessibility - Sheet handles Escape automatically
- ❌ Use synchronous clipboard API - USE async `navigator.clipboard.writeText()`
- ❌ Skip debounce on search - USE 300ms debounce
- ❌ Allow invalid date range - DISABLE dates that would create From > To

### Edge Cases to Handle

1. **Campaign with many events (1000+):** Pagination prevents loading all at once
2. **URL too long:** Truncate with ellipsis and show full URL on hover or link out
3. **Email too long:** Allow text to wrap or truncate
4. **Sheet already open, click another row:** Close and reopen with new data
5. **Network error while loading events:** Show error with retry button
6. **Campaign has 0 events:** Show empty state message
7. **Search returns no results:** Show "No events matching" message with search term
8. **Copy fails (clipboard API denied):** Show error toast, graceful degradation
9. **Date range From > To:** Prevent invalid selection via disabled dates
10. **Multiple filters active:** Combine filters correctly (event type + date + search)
11. **Clear all filters:** Reset pagination to page 1

### References

- [Source: _bmad-output/implementation-artifacts/5-4-campaign-table.md] - Campaign table context
- [Source: _bmad-output/implementation-artifacts/5-3-campaign-summary-cards.md] - API patterns
- [Source: _bmad-output/implementation-artifacts/5-2-campaign-stats-api.md] - Backend API spec
- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#EPIC-05] - Feature F-05.F5
- [Source: eneos-admin-dashboard/src/components/leads/lead-detail-sheet.tsx] - Sheet pattern
- [Source: docs/api/api-contract.md] - API response format

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
