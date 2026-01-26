# Story 4.8: Lead Detail Modal (Enhanced)

Status: ready-for-dev

## Story

As an **ENEOS manager**,
I want **to view comprehensive lead details including status history and performance metrics**,
so that **I can understand the full context of each lead and track sales performance effectively**.

## Acceptance Criteria

1. **AC1: Enhanced Detail Sheet**
   - Given I click on a lead row in the Lead List Table
   - When the detail Sheet opens
   - Then the system fetches full lead details from `/api/admin/leads/:id`
   - And displays a loading skeleton while fetching
   - And shows enriched data upon successful fetch

2. **AC2: Status History Section**
   - Given lead details are loaded
   - When I view the Status History section
   - Then I see a timeline of all status changes
   - And each entry shows: Status badge, Changed by (name), Timestamp
   - And entries are sorted chronologically (newest first)
   - And status changes use the same badge colors as the table

3. **AC3: Performance Metrics Section**
   - Given lead details are loaded
   - When I view the Performance Metrics section
   - Then I see "Response Time" (time from new → claimed) formatted as "X hours Y minutes" or "X days"
   - And I see "Closing Time" (time from claimed → closed) if lead is closed
   - And I see "Lead Age" (time since created)
   - And metrics show "-" when not applicable (e.g., closing time for unclosed leads)

4. **AC4: Owner Contact Details**
   - Given lead has an assigned owner
   - When I view the Sales Information section
   - Then I see owner's name, email, and phone number
   - And email is clickable (mailto:)
   - And phone is displayed in Thai format
   - And shows "Unassigned" when no owner is assigned

5. **AC5: Loading State**
   - Given the detail Sheet is opening
   - When data is being fetched
   - Then skeleton loaders appear in the new sections (History, Metrics)
   - And existing data from table row is displayed immediately (Company, Status, etc.)
   - And loading completes within 3 seconds under normal conditions

6. **AC6: Error Handling**
   - Given the detail fetch fails
   - When an error occurs
   - Then an error message appears with retry button
   - And basic info from the table row is still visible (graceful degradation)
   - And retry button triggers a new fetch attempt

7. **AC7: Campaign Details**
   - Given lead has campaign information
   - When I view the Campaign section
   - Then I see Campaign Name, Campaign ID, and Email Subject
   - And Email Subject is shown if available

8. **AC8: Keyboard & Accessibility**
   - Given the Sheet is open
   - When I press Escape
   - Then the Sheet closes
   - And focus returns to the previously focused row
   - And all sections have proper headings (h3)
   - And interactive elements have aria-labels

9. **AC9: Data Refresh**
   - Given lead details are displayed
   - When the list table is refreshed (e.g., after filter change)
   - Then reopening the same lead fetches fresh data
   - And cache is invalidated properly (staleTime: 30 seconds)

## Tasks / Subtasks

- [ ] **Task 1: Update Types** (AC: #2, #3)
  - [ ] 1.1 Create `src/types/lead-detail.ts` with `LeadDetail`, `StatusHistoryItem`, `LeadMetrics` interfaces
  - [ ] 1.2 Add `LeadDetail` interface matching backend response data structure (owner object, campaign object, history, metrics)
  - [ ] 1.3 Update `LeadDetailResponse.data` type from `Lead` to `LeadDetail` in `src/types/lead.ts`
  - [ ] 1.4 Export types from `src/types/index.ts`

- [ ] **Task 2: Update useLead Hook** (AC: #1, #5, #9)
  - [ ] 2.1 Update `src/hooks/use-lead.ts` to return `LeadDetail` type
  - [ ] 2.2 Ensure query is enabled only when `id` is defined
  - [ ] 2.3 Set `staleTime: 30 * 1000` (30 seconds)
  - [ ] 2.4 Set `gcTime: 5 * 60 * 1000` (5 minutes)
  - [ ] 2.5 Handle retry logic (2 retries)

- [ ] **Task 3: Update API Client** (AC: #1)
  - [ ] 3.1 Update `src/lib/api/leads.ts` `fetchLeadById()` to return `LeadDetail`
  - [ ] 3.2 Ensure proper error transformation

- [ ] **Task 4: Create Helper Components** (AC: #2, #3)
  - [ ] 4.1 Create `src/components/leads/status-history.tsx` for timeline display
  - [ ] 4.2 Create `src/components/leads/lead-metrics.tsx` for metrics display
  - [ ] 4.3 Create `src/components/leads/lead-detail-skeleton.tsx` for loading state
  - [ ] 4.4 Create `src/lib/format-duration.ts` for formatting minutes to "X hours Y minutes"
  - [ ] 4.5 Add barrel exports in `src/components/leads/index.ts`

- [ ] **Task 5: Update LeadDetailSheet** (AC: #1, #4, #5, #6, #7, #8)
  - [ ] 5.1 Add `useLead` hook call with lead row ID
  - [ ] 5.2 Show skeleton while loading detail data
  - [ ] 5.3 Add Status History section using `StatusHistory` component
  - [ ] 5.4 Add Performance Metrics section using `LeadMetrics` component
  - [ ] 5.5 Update Sales Information with owner email and phone
  - [ ] 5.6 Add Campaign section with subject
  - [ ] 5.7 Add error state with retry button
  - [ ] 5.8 Ensure graceful degradation (show basic info on error)

- [ ] **Task 6: Create LeadDetailError Component** (AC: #6)
  - [ ] 6.1 Create `src/components/leads/lead-detail-error.tsx`
  - [ ] 6.2 Display error message and retry button
  - [ ] 6.3 Style consistently with other error components

- [ ] **Task 7: Testing** (AC: #1-9)
  - [ ] 7.1 Test StatusHistory component renders timeline correctly
  - [ ] 7.2 Test LeadMetrics formats durations correctly
  - [ ] 7.3 Test format-duration utility with various inputs
  - [ ] 7.4 Test LeadDetailSheet shows skeleton during loading
  - [ ] 7.5 Test error state displays retry button
  - [ ] 7.6 Test graceful degradation on error
  - [ ] 7.7 Test keyboard navigation (Escape closes)
  - [ ] 7.8 Test cache invalidation behavior
  - [ ] 7.9 Test accessibility (aria-labels, headings)

- [ ] **Task 8: Integration Testing** (AC: #1, #9)
  - [ ] 8.1 Test clicking row opens Sheet and fetches detail
  - [ ] 8.2 Test data refresh after filter change
  - [ ] 8.3 Test network error handling

- [x] **Task 9: Reorder Company Information Fields** (UI Enhancement)
  - [x] 9.1 Reorder Company Information section in Lead Detail Modal
    - Company (1st)
    - DBD Sector (2nd)
    - Industry (3rd - changed label from "Industry (AI)" to "Industry")
    - Juristic ID (4th)
    - Capital (5th)
    - Website (6th)
    - Address (7th - kept at bottom)
  - [x] 9.2 Update label "Industry (AI)" → "Industry"
  - [x] 9.3 Add numbered comments for clarity

## Dev Notes

### Type Definitions

```typescript
// src/types/lead-detail.ts
import type { LeadStatus } from './lead';

export interface StatusHistoryItem {
  status: LeadStatus;
  by: string;              // ชื่อผู้ทำการเปลี่ยนสถานะ
  timestamp: string;       // ISO 8601
}

export interface LeadMetrics {
  responseTime: number;    // นาที - เวลาที่ใช้ในการรับ lead (claimed - new)
  closingTime: number;     // นาที - เวลาที่ใช้ในการปิดการขาย (closed - claimed)
  age: number;             // นาที - อายุของ lead ตั้งแต่สร้าง
}

export interface LeadDetailOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface LeadDetailCampaign {
  id: string;
  name: string;
  subject: string;
}

export interface LeadDetail {
  row: number;
  date: string;
  customerName: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  website: string;
  capital: string;
  status: LeadStatus;
  owner: LeadDetailOwner | null;
  campaign: LeadDetailCampaign;
  source: string;
  leadId: string;
  eventId: string;
  talkingPoint: string;
  history: StatusHistoryItem[];
  metrics: LeadMetrics;
  // Additional fields for display (from table data)
  jobTitle?: string;
  city?: string;
  leadUuid?: string;
  version?: number;
}
```

### Duration Formatting Utility

```typescript
// src/lib/format-duration.ts
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '-';

  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = Math.floor(minutes % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0) parts.push(`${hours} ชั่วโมง`);
  if (mins > 0 && days === 0) parts.push(`${mins} นาที`);

  return parts.length > 0 ? parts.join(' ') : '-';
}

export function formatDurationShort(minutes: number): string {
  if (minutes <= 0) return '-';

  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.floor(minutes / (24 * 60))}d`;
}
```

### StatusHistory Component

```typescript
// src/components/leads/status-history.tsx
'use client';

import { Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LeadStatusBadge } from './lead-status-badge';
import { formatLeadDateTime } from '@/lib/format-lead';
import type { StatusHistoryItem } from '@/types/lead-detail';

interface StatusHistoryProps {
  history: StatusHistoryItem[];
}

export function StatusHistory({ history }: StatusHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          No status history available
        </CardContent>
      </Card>
    );
  }

  // Sort by timestamp descending (newest first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="relative space-y-4">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" aria-hidden="true" />

          {sortedHistory.map((item) => (
            <div key={`${item.status}-${item.timestamp}`} className="relative pl-10">
              {/* Timeline dot */}
              <div
                className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-background border-2 border-primary"
                aria-hidden="true"
              />

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <LeadStatusBadge status={item.status} />
                  {item.by && (
                    <span className="text-sm text-muted-foreground">
                      by {item.by}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <time dateTime={item.timestamp}>
                    {formatLeadDateTime(item.timestamp)}
                  </time>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### LeadMetrics Component

```typescript
// src/components/leads/lead-metrics.tsx
'use client';

import { Clock, Timer, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatDuration } from '@/lib/format-duration';
import type { LeadMetrics as LeadMetricsType } from '@/types/lead-detail';

interface LeadMetricsProps {
  metrics: LeadMetricsType;
}

interface MetricItemProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}

function MetricItem({ label, value, icon, description }: MetricItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-muted shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium text-lg" title={description}>{value}</p>
      </div>
    </div>
  );
}

export function LeadMetrics({ metrics }: LeadMetricsProps) {
  return (
    <Card>
      <CardContent className="p-4 grid gap-4 sm:grid-cols-3">
        <MetricItem
          label="Response Time"
          value={formatDuration(metrics.responseTime)}
          icon={<Timer className="h-4 w-4 text-blue-500" />}
          description="เวลาที่ใช้ในการรับ lead (new → claimed)"
        />
        <MetricItem
          label="Closing Time"
          value={formatDuration(metrics.closingTime)}
          icon={<Clock className="h-4 w-4 text-green-500" />}
          description="เวลาที่ใช้ในการปิดการขาย (claimed → closed)"
        />
        <MetricItem
          label="Lead Age"
          value={formatDuration(metrics.age)}
          icon={<Calendar className="h-4 w-4 text-amber-500" />}
          description="อายุของ lead ตั้งแต่สร้าง"
        />
      </CardContent>
    </Card>
  );
}
```

### LeadDetailSkeleton Component

```typescript
// src/components/leads/lead-detail-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function LeadDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading lead details">
      {/* Metrics skeleton */}
      <section>
        <Skeleton className="h-5 w-40 mb-4" />
        <Card>
          <CardContent className="p-4 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* History skeleton */}
      <section>
        <Skeleton className="h-5 w-32 mb-4" />
        <Card>
          <CardContent className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 pl-6">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
```

### Updated LeadDetailSheet Integration

```typescript
// src/components/leads/lead-detail-sheet.tsx (updated)
'use client';

import { useLead } from '@/hooks/use-lead';
import { StatusHistory } from './status-history';
import { LeadMetrics } from './lead-metrics';
import { LeadDetailSkeleton } from './lead-detail-skeleton';
import { LeadDetailError } from './lead-detail-error';
// ... existing imports

interface LeadDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;  // Basic lead data from table for immediate display
}

export function LeadDetailSheet({ open, onOpenChange, lead }: LeadDetailSheetProps) {
  // Fetch full details when sheet opens
  const {
    data: leadDetail,
    isLoading,
    isError,
    refetch
  } = useLead(lead?.row, { enabled: open && !!lead?.row });

  // ... existing Sheet wrapper code

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {/* Header with basic info (immediate display from table data) */}
        <SheetHeader>
          <SheetTitle>{lead?.company ?? 'Loading...'}</SheetTitle>
          {lead?.status && <LeadStatusBadge status={lead.status} />}
        </SheetHeader>

        {/* Loading state for detail data */}
        {isLoading && <LeadDetailSkeleton />}

        {/* Error state with retry */}
        {isError && (
          <LeadDetailError onRetry={refetch} />
        )}

        {/* Full details when loaded */}
        {leadDetail && (
          <>
            {/* Performance Metrics Section */}
            <section>
              <h3 className="text-sm font-semibold mb-4">Performance Metrics</h3>
              <LeadMetrics metrics={leadDetail.metrics} />
            </section>

            {/* Status History Section */}
            <section>
              <h3 className="text-sm font-semibold mb-4">Status History</h3>
              <StatusHistory history={leadDetail.history} />
            </section>

            {/* ... existing sections (Contact, Company, Sales) */}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

### Component Structure

```
src/
├── components/leads/
│   ├── index.ts                     # Update barrel exports
│   ├── lead-detail-sheet.tsx        # UPDATE: Add detail fetch
│   ├── lead-detail-skeleton.tsx     # NEW: Loading state
│   ├── lead-detail-error.tsx        # NEW: Error state with retry
│   ├── status-history.tsx           # NEW: Timeline component
│   └── lead-metrics.tsx             # NEW: Metrics display
├── hooks/
│   └── use-lead.ts                  # UPDATE: Return LeadDetail type
├── lib/
│   ├── api/leads.ts                 # UPDATE: Type adjustment
│   └── format-duration.ts           # NEW: Duration formatting
└── types/
    ├── lead-detail.ts               # NEW: Detail types
    └── index.ts                     # UPDATE: Export new types
```

### Testing Notes

**Pattern for testing async components:**
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeadDetailSheet } from './lead-detail-sheet';

const mockLead = { row: 1, company: 'Test Corp', status: 'new' };

function renderWithQuery(component: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

it('shows skeleton while loading', async () => {
  renderWithQuery(<LeadDetailSheet open lead={mockLead} onOpenChange={() => {}} />);
  expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
});
```

**Pattern for format-duration tests:**
```typescript
import { describe, it, expect } from 'vitest';
import { formatDuration, formatDurationShort } from './format-duration';

describe('formatDuration', () => {
  it('returns "-" for 0 or negative', () => {
    expect(formatDuration(0)).toBe('-');
    expect(formatDuration(-10)).toBe('-');
  });

  it('formats minutes only', () => {
    expect(formatDuration(45)).toBe('45 นาที');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(90)).toBe('1 ชั่วโมง 30 นาที');
  });

  it('formats days and hours', () => {
    expect(formatDuration(1500)).toBe('1 วัน 1 ชั่วโมง');
  });

  it('omits minutes when showing days', () => {
    expect(formatDuration(1470)).toBe('1 วัน');  // 24h + 30m = doesn't show minutes
  });
});
```

### Relationship to Story 4-1

Story 4-1 created the basic `LeadDetailSheet` that displays data passed from the table row. This story (4-8) enhances it by:

1. **Fetching additional data** from `/api/admin/leads/:id` (metrics, history)
2. **Adding new sections**: Performance Metrics, Status History
3. **Adding loading/error states** for the async fetch
4. **Enriching owner info** with email and phone from detail API

The component signature remains the same (`LeadDetailSheetProps`), ensuring backward compatibility.

### API Response Example

```json
{
  "success": true,
  "data": {
    "row": 42,
    "date": "2026-01-15T08:30:00.000Z",
    "customerName": "สมชาย ใจดี",
    "email": "somchai@example.com",
    "phone": "0812345678",
    "company": "บริษัท ทดสอบ จำกัด",
    "industry": "Manufacturing",
    "website": "https://example.com",
    "capital": "10,000,000",
    "status": "closed",
    "owner": {
      "id": "U1234567890",
      "name": "สมหญิง ขายเก่ง",
      "email": "somying@eneos.co.th",
      "phone": "0898765432"
    },
    "campaign": {
      "id": "campaign_001",
      "name": "Q1 2026 Promotion",
      "subject": "พิเศษ! น้ำมันหล่อลื่น ENEOS ลด 20%"
    },
    "source": "email_click",
    "leadId": "lead_abc123",
    "eventId": "evt_xyz789",
    "talkingPoint": "ลูกค้าสนใจน้ำมันหล่อลื่นสำหรับเครื่องจักรอุตสาหกรรม",
    "history": [
      { "status": "new", "by": "System", "timestamp": "2026-01-15T08:30:00.000Z" },
      { "status": "claimed", "by": "สมหญิง", "timestamp": "2026-01-15T09:15:00.000Z" },
      { "status": "contacted", "by": "สมหญิง", "timestamp": "2026-01-15T14:00:00.000Z" },
      { "status": "closed", "by": "สมหญิง", "timestamp": "2026-01-16T11:30:00.000Z" }
    ],
    "metrics": {
      "responseTime": 45,
      "closingTime": 1335,
      "age": 2880
    }
  }
}
```

## Code Review

### Review Date: 2026-01-17

**Issues Found: 3**

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | Medium | Task 1 missing subtask to update `LeadDetailResponse.data` type from `Lead` to `LeadDetail` | Added Task 1.3 for explicit type update |
| 2 | Low | StatusHistory component has unused `index` parameter causing ESLint error | Removed unused parameter |
| 3 | Low | LeadDetailSheet snippet passes potentially undefined `status` to LeadStatusBadge | Added conditional rendering with null check |

**Verdict:** ✅ APPROVED after fixes

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-26 | UI Enhancement: Reordered Company Information fields (Task 9) | Claude Sonnet 4.5 |
| 2026-01-17 | Code review passed - 3 issues fixed | Claude |
| 2026-01-17 | Story created by SM Agent | Claude |
