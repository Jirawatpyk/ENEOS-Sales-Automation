# Story 4.1: Lead List Table

Status: done

## Story

As an **ENEOS manager**,
I want **to see a comprehensive table of all leads with their details**,
so that **I can review lead information, track status, and manage the sales pipeline effectively**.

## Acceptance Criteria

1. **AC1: Page Setup**
   - Given I am authenticated as @eneos.co.th user
   - When I navigate to `/leads`
   - Then I see a page titled "Lead Management"
   - And the page renders within 3 seconds
   - And the page shows a data table with all leads

2. **AC2: Table Columns**
   - Given the table is displayed
   - When I view the columns
   - Then I see columns: Company, Contact Name, Email, Phone, Status, Sales Owner, Campaign, Created Date
   - And columns are properly aligned (text left, dates right)
   - And headers have tooltips explaining each column
   - And the Company column includes the Industry badge if available

3. **AC3: Data Display**
   - Given the table shows lead data
   - When I view each row
   - Then Company shows company name with Industry_AI in a subtle badge
   - And Contact Name shows Customer Name
   - And Email shows clickable email link (mailto:)
   - And Phone shows formatted Thai phone number
   - And Status shows colored badge matching STATUS_COLORS
   - And Sales Owner shows assigned owner name or "Unassigned"
   - And Campaign shows Campaign Name
   - And Created Date shows formatted date (DD MMM YYYY)

4. **AC4: Status Badge Colors**
   - Given status badges are displayed
   - When I view different statuses
   - Then 'new' shows gray badge (bg-gray-100)
   - And 'claimed' shows blue badge (bg-blue-100)
   - And 'contacted' shows amber badge (bg-amber-100)
   - And 'closed' shows green badge (bg-green-100)
   - And 'lost' shows red badge (bg-red-100)
   - And 'unreachable' shows muted gray badge

5. **AC5: Row Click Navigation**
   - Given I click on a lead's row
   - When the click is registered
   - Then a detail Sheet/Dialog panel opens showing full lead information
   - And the panel shows all lead fields including: Company, Contact, Industry_AI, Website, Talking_Point, Timeline
   - And the row has hover highlight indicating it's clickable
   - And keyboard navigation works (Enter/Space to select)
   - And panel can be closed with X button or Escape key

6. **AC6: Loading & Empty States**
   - Given data is loading or no leads exist
   - When the table renders
   - Then loading shows skeleton table rows (8 columns structure)
   - And empty shows "No leads found" with helpful message
   - And error shows retry button with error message

7. **AC7: Responsive Design**
   - Given I view on different screen sizes
   - When screen width is < 1024px (tablet)
   - Then table has horizontal scroll with `overflow-x-auto`
   - And sticky first column (Company) remains visible during scroll
   - When screen width is < 768px (mobile)
   - Then table continues to use horizontal scroll
   - And touch scrolling works smoothly

8. **AC8: Default Sort**
   - Given the table is displayed
   - When data first loads
   - Then leads are sorted by Created Date descending (newest first)
   - And the sort indicator shows on the Date column

9. **AC9: TanStack Table Integration**
   - Given TanStack Table is used
   - When the table is rendered
   - Then column definitions support future sorting (Story 4-7)
   - And column definitions support future filtering (Story 4-4 to 4-6)
   - And table state is managed properly for pagination integration (Story 4-2)

## Tasks / Subtasks

- [x] **Task 1: Page Setup** (AC: #1)
  - [x] 1.1 Create `/leads` page at `src/app/(dashboard)/leads/page.tsx`
  - [x] 1.2 Add page metadata and title "Lead Management"
  - [x] 1.3 Verify route protection with auth middleware
  - [x] 1.4 Add navigation link in sidebar if not exists

- [x] **Task 2: API Route & Hook** (AC: #3, #5)
  - [x] 2.1 Create `src/app/api/admin/leads/route.ts` proxy to backend
  - [x] 2.2 Create `src/app/api/admin/leads/[id]/route.ts` for single lead detail
  - [x] 2.3 Create `src/lib/api/leads.ts` API client function (fetchLeads, fetchLeadById)
  - [x] 2.4 Create `src/hooks/use-leads.ts` TanStack Query hook
  - [x] 2.5 Create `src/hooks/use-lead.ts` for single lead query (detail sheet)
  - [x] 2.6 Configure staleTime (60 seconds per architecture)
  - [x] 2.7 Handle error and retry logic

- [x] **Task 3: TypeScript Types** (AC: #3)
  - [x] 3.1 Create `src/types/lead.ts` with Lead interface
  - [x] 3.2 Include all fields: row, company, customerName, email, phone, status, salesOwnerId, salesOwnerName, campaignId, campaignName, industryAI, website, talkingPoint, createdAt, etc.
  - [x] 3.3 Add LeadStatus type with 6 values
  - [x] 3.4 Add LeadsResponse interface matching backend format

- [x] **Task 4: Lead Table Component** (AC: #2, #3, #4, #7, #8, #9)
  - [x] 4.1 Create `src/components/leads/index.ts` barrel exports
  - [x] 4.2 Create `src/components/leads/lead-table.tsx`
  - [x] 4.3 Use TanStack Table with column definitions
  - [x] 4.4 Define 8 columns with proper alignment (Company left, Date right)
  - [x] 4.5 Add tooltips to column headers using shadcn/ui Tooltip
  - [x] 4.6 Implement status badge with STATUS_COLORS
  - [x] 4.7 Format phone number with Thai format
  - [x] 4.8 Format date as "DD MMM YYYY"
  - [x] 4.9 Wrap table in `overflow-x-auto` for horizontal scroll
  - [x] 4.10 Implement sticky first column (Company)
  - [x] 4.11 Set default sort: createdAt DESC

- [x] **Task 5: Status Badge Component** (AC: #4)
  - [x] 5.1 Create `src/components/leads/lead-status-badge.tsx`
  - [x] 5.2 Use STATUS_COLORS from chart-config or create leads-constants
  - [x] 5.3 Add proper styling for each of 6 statuses
  - [x] 5.4 Include aria-label for accessibility

- [x] **Task 6: Row Interactivity & Detail Panel** (AC: #5)
  - [x] 6.1 Add onClick handler to table rows
  - [x] 6.2 Implement hover state styling
  - [x] 6.3 Add keyboard navigation (onKeyDown Enter/Space)
  - [x] 6.4 Create `src/components/leads/lead-detail-sheet.tsx` using Sheet component
  - [x] 6.5 Display all lead fields in Sheet: company, contact, email, phone, industry, website, talking point, timeline, status history
  - [x] 6.6 Add close button (X) and Escape key handler
  - [x] 6.7 Add cursor-pointer style to rows

- [x] **Task 7: Loading & Error States** (AC: #6)
  - [x] 7.1 Create `src/components/leads/lead-table-skeleton.tsx`
  - [x] 7.2 Create `src/components/leads/lead-table-empty.tsx`
  - [x] 7.3 Create `src/components/leads/lead-table-error.tsx` with retry button
  - [x] 7.4 Add aria-busy for accessibility

- [x] **Task 8: Container Component** (AC: #1-8)
  - [x] 8.1 Create `src/components/leads/lead-table-container.tsx`
  - [x] 8.2 Handle data fetching with useLeads hook
  - [x] 8.3 Pass data to presentation component
  - [x] 8.4 Handle loading/error/empty states
  - [x] 8.5 Wire up detail sheet open/close state

- [x] **Task 9: Testing** (AC: #1-9)
  - [x] 9.1 Test table renders with mock data
  - [x] 9.2 Test status badge color mapping
  - [x] 9.3 Test phone number formatting
  - [x] 9.4 Test date formatting
  - [x] 9.5 Test row click opens detail sheet
  - [x] 9.6 Test keyboard navigation
  - [x] 9.7 Test loading/empty/error states
  - [x] 9.8 Test responsive behavior
  - [x] 9.9 Test accessibility (aria-busy, roles)

## Dev Notes

### API Response Format

Backend endpoint: `GET /api/admin/leads`

```typescript
// Expected response structure (from EPIC-00 deliverables)
interface LeadsResponse {
  success: boolean;
  data: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Lead {
  row: number;                    // Row number = Primary Key
  date: string;                   // Created date (ISO string)
  customerName: string;
  email: string;
  phone: string;
  company: string;
  industryAI: string | null;      // AI-analyzed industry
  website: string | null;
  capital: string | null;
  status: LeadStatus;
  salesOwnerId: string | null;
  salesOwnerName: string | null;
  campaignId: string;
  campaignName: string;
  emailSubject: string | null;
  source: string;
  leadId: string | null;
  eventId: string | null;
  clickedAt: string | null;
  talkingPoint: string | null;
  closedAt: string | null;
  lostAt: string | null;
  unreachableAt: string | null;
  version: number;
  leadSource: string | null;
  jobTitle: string | null;
  city: string | null;
  leadUuid: string | null;
  createdAt: string;
  updatedAt: string | null;
}

type LeadStatus = 'new' | 'claimed' | 'contacted' | 'closed' | 'lost' | 'unreachable';
```

### Component Structure

```
src/
├── app/(dashboard)/leads/
│   └── page.tsx                     # Page component
├── app/api/admin/leads/
│   └── route.ts                     # API proxy route
├── components/leads/
│   ├── index.ts                     # Barrel exports
│   ├── lead-table.tsx               # Main table component
│   ├── lead-table-skeleton.tsx
│   ├── lead-table-empty.tsx
│   ├── lead-table-error.tsx
│   ├── lead-table-container.tsx
│   ├── lead-status-badge.tsx        # Status badge component
│   └── lead-detail-sheet.tsx        # Detail panel
├── hooks/
│   └── use-leads.ts                 # TanStack Query hook
├── lib/
│   ├── api/leads.ts                 # API client function
│   └── leads-constants.ts           # Status colors, labels
└── types/
    └── lead.ts                      # TypeScript interfaces
```

### Status Colors (from project-context.md)

```typescript
// src/lib/leads-constants.ts
export const LEAD_STATUS_COLORS = {
  new: 'bg-gray-100 text-gray-800',
  claimed: 'bg-blue-100 text-blue-800',
  contacted: 'bg-amber-100 text-amber-800',
  closed: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  unreachable: 'bg-gray-100 text-gray-500',
} as const;

export const LEAD_STATUS_LABELS = {
  new: 'ใหม่',
  claimed: 'รับแล้ว',
  contacted: 'ติดต่อแล้ว',
  closed: 'ปิดสำเร็จ',
  lost: 'ปิดไม่สำเร็จ',
  unreachable: 'ติดต่อไม่ได้',
} as const;
```

### TanStack Table Column Definition

```typescript
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';

const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: 'company',
    header: 'Company',
    cell: ({ row }) => (
      <div>
        <span className="font-medium">{row.original.company}</span>
        {row.original.industryAI && (
          <Badge variant="outline" className="ml-2 text-xs">
            {row.original.industryAI}
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'customerName',
    header: 'Contact Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ getValue }) => (
      <a href={`mailto:${getValue()}`} className="text-blue-600 hover:underline">
        {getValue() as string}
      </a>
    ),
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ getValue }) => formatThaiPhone(getValue() as string),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <LeadStatusBadge status={getValue() as LeadStatus} />,
  },
  {
    accessorKey: 'salesOwnerName',
    header: 'Sales Owner',
    cell: ({ getValue }) => getValue() || 'Unassigned',
  },
  {
    accessorKey: 'campaignName',
    header: 'Campaign',
  },
  {
    accessorKey: 'createdAt',
    header: 'Created Date',
    cell: ({ getValue }) => format(new Date(getValue() as string), 'dd MMM yyyy'),
  },
];
```

### Phone Formatting

```typescript
// src/lib/format-phone.ts
export function formatThaiPhone(phone: string | null): string {
  if (!phone) return '-';

  // Remove non-digits
  const digits = phone.replace(/\D/g, '');

  // Format as XXX-XXX-XXXX for Thai numbers
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone;
}
```

### Detail Sheet Pattern

```typescript
// src/components/leads/lead-detail-sheet.tsx
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Lead } from '@/types/lead';
import { LeadStatusBadge } from './lead-status-badge';

interface LeadDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

export function LeadDetailSheet({ open, onOpenChange, lead }: LeadDetailSheetProps) {
  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{lead.company}</SheetTitle>
          <SheetDescription>{lead.customerName}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Contact Section */}
          <section>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Contact</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Email:</span> {lead.email}</p>
              <p><span className="font-medium">Phone:</span> {formatThaiPhone(lead.phone)}</p>
              {lead.jobTitle && <p><span className="font-medium">Title:</span> {lead.jobTitle}</p>}
            </div>
          </section>

          {/* Company Section */}
          <section>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Company</h3>
            <div className="space-y-2">
              {lead.industryAI && <p><span className="font-medium">Industry:</span> {lead.industryAI}</p>}
              {lead.website && (
                <p>
                  <span className="font-medium">Website:</span>{' '}
                  <a href={lead.website} target="_blank" className="text-blue-600 hover:underline">
                    {lead.website}
                  </a>
                </p>
              )}
              {lead.capital && <p><span className="font-medium">Capital:</span> {lead.capital}</p>}
            </div>
          </section>

          {/* Status Section */}
          <section>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Status</h3>
            <div className="flex items-center gap-2">
              <LeadStatusBadge status={lead.status} />
              <span className="text-sm text-muted-foreground">
                {lead.salesOwnerName || 'Unassigned'}
              </span>
            </div>
          </section>

          {/* Talking Point Section */}
          {lead.talkingPoint && (
            <section>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Talking Point</h3>
              <p className="text-sm">{lead.talkingPoint}</p>
            </section>
          )}

          {/* Timeline Section */}
          <section>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Timeline</h3>
            <div className="space-y-1 text-sm">
              <p>Created: {format(new Date(lead.createdAt), 'dd MMM yyyy HH:mm')}</p>
              {lead.closedAt && <p>Closed: {format(new Date(lead.closedAt), 'dd MMM yyyy HH:mm')}</p>}
              {lead.lostAt && <p>Lost: {format(new Date(lead.lostAt), 'dd MMM yyyy HH:mm')}</p>}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Patterns from Previous Stories

**From Story 3-1 (Performance Table):**
- Container pattern separates data fetching from presentation
- Skeleton matches exact column structure
- Empty state shows helpful message in card
- Keyboard navigation with onKeyDown handler
- aria-busy for loading accessibility
- TanStack Table for sorting

**From Test Pattern Library:**
- Use TanStack Query provider wrapper (Pattern 1.2)
- Mock next/navigation for URL params (Pattern 2.1)
- Test callback handlers (Pattern 1.3)
- Include loading/empty/error state tests (Pattern 7.1-7.3)
- Use data-testid convention: `lead-table`, `lead-row-{id}`, `lead-status-badge`

### Architecture Compliance

From project-context.md:
- TanStack Query v5 object syntax (CRITICAL)
- TanStack Table for table functionality
- URL state for filters (future stories)
- shadcn/ui + Tailwind CSS
- Next.js App Router with 'use client' where needed
- Time values in MINUTES from backend

### Dependencies

Existing:
- `@tanstack/react-query` - Data fetching
- `@tanstack/react-table` - Table functionality (from Story 3-1)
- `date-fns` - Date formatting
- `lucide-react` - Icons
- shadcn/ui components (Table, Sheet, Badge, Skeleton)

### Epic 4 Story Dependencies

This story lays foundation for:
- **4-2 Pagination**: Table ready for pagination integration
- **4-3 Search**: Column accessors ready for search
- **4-4-6 Filters**: TanStack Table column filtering ready
- **4-7 Sort Columns**: Sorting state already configured
- **4-8 Lead Detail Modal**: Detail Sheet already implemented

### References

- [Source: epics.md#EPIC-04] - Epic description
- [Source: epics.md#F-04.1] - Feature definition
- [Source: project-context.md] - Project rules and constraints
- [Source: stories/3-1-performance-table.md] - Similar table pattern
- [Source: docs/test-pattern-library.md] - Testing patterns

### Critical Don't-Miss Rules

1. **TanStack Query v5 syntax** - Use object syntax {queryKey, queryFn}
2. **Status exactly 6 values** - new, claimed, contacted, closed, lost, unreachable
3. **Time values in MINUTES** - All time from backend is minutes
4. **Row number = Primary Key** - Lead ID is lead.row
5. **Google domain only** - @eneos.co.th
6. **API proxy pattern** - Never call backend directly from client

## Code Review

### Implementation Summary (2026-01-17)

**Files Created:**
- `src/app/(dashboard)/leads/page.tsx` - Main leads page with Suspense
- `src/app/api/admin/leads/route.ts` - API proxy for leads list
- `src/app/api/admin/leads/[id]/route.ts` - API proxy for single lead
- `src/lib/api/leads.ts` - API client with fetchLeads, fetchLeadById, LeadsApiError
- `src/hooks/use-leads.ts` - TanStack Query hook for leads list
- `src/hooks/use-lead.ts` - TanStack Query hook for single lead
- `src/types/lead.ts` - Lead interface and LeadStatus type
- `src/lib/leads-constants.ts` - Status colors and labels
- `src/lib/format-lead.ts` - Phone/date formatting utilities
- `src/components/leads/lead-table.tsx` - Main table with TanStack Table
- `src/components/leads/lead-status-badge.tsx` - Status badge component
- `src/components/leads/lead-detail-sheet.tsx` - Detail panel Sheet
- `src/components/leads/lead-table-skeleton.tsx` - Loading skeleton
- `src/components/leads/lead-table-empty.tsx` - Empty state
- `src/components/leads/lead-table-error.tsx` - Error state with retry
- `src/components/leads/lead-table-container.tsx` - Container component
- `src/components/leads/index.ts` - Barrel exports

**Files Modified:**
- `src/config/nav-items.ts` - Enabled Leads navigation link
- `package.json` - Added `test:run` script
- `.gitignore` - Added test output file patterns

**Test Files Created:**
- `src/__tests__/lead-table.test.tsx` - Table component tests (AC#1-9)
- `src/__tests__/lead-table-states.test.tsx` - Loading/Empty/Error tests (AC#6)
- `src/__tests__/lead-status-badge.test.tsx` - Status badge tests (AC#4)
- `src/__tests__/format-lead.test.ts` - Formatting utility tests (AC#3)
- `src/__tests__/lead-table-container.test.tsx` - Container integration tests
- `src/__tests__/config/nav-items.test.ts` - Updated for Leads enabled
- `src/__tests__/api/admin/leads/route.test.ts` - API proxy route tests (6 tests)
- `src/__tests__/api/admin/leads/[id]/route.test.ts` - Lead detail API tests (6 tests)

**Test Results:**
- All 1058 tests passing
- TypeScript type check passing
- ESLint lint passing

**Architecture Compliance:**
- ✅ TanStack Query v5 object syntax `{queryKey, queryFn}`
- ✅ TanStack Table for table rendering
- ✅ Container/Presentation component separation
- ✅ API proxy pattern (never call backend directly)
- ✅ Status colors matching project-context.md
- ✅ staleTime 60 seconds, gcTime 5 minutes
- ✅ Keyboard navigation (Enter/Space)
- ✅ Accessibility (aria-busy, role="button", tabIndex)
- ✅ Sticky first column for responsive scroll

### Code Review Findings & Fixes (2026-01-17)

**Issues Found:** 0 High, 4 Medium, 2 Low

**Fixed Issues:**
1. ✅ **M3**: Added test output files to `.gitignore` (test-output.json, test-result.json, vitest-result.json, run-test.js)
2. ✅ **M4**: Created API route tests - `src/__tests__/api/admin/leads/route.test.ts` and `[id]/route.test.ts` (12 tests added)
3. ✅ **M2**: Documented `package.json` changes in File List
4. ✅ **M1**: Clarified `src/lib/index.ts` is from Epic 3 tech debt, not Story 4.1

**Noted (Low Priority):**
- L1: `docs/test-pattern-library.md` is unrelated to Story 4.1
- L2: Touch scrolling (AC#7) requires E2E testing with Playwright

**Code Review Status: PASSED**

### Bugfix: API Parameter Mapping (2026-01-17)

**Issue:** "Bad Request" error on Lead Management page after initial deployment.

**Root Cause Analysis:**
1. Frontend sends `salesOwnerId`, backend expects `owner`
2. Frontend sends `sortDir`, backend expects `sortOrder`
3. Frontend sends `sortBy=createdAt`, backend only accepted `date`, `company`, `status`
4. Response format mismatch: backend returns `{data: {data: [], pagination}}`, frontend expects `{data: [], pagination}`

**Backend Changes (eneos-sales-automation):**
- `src/constants/admin.constants.ts` - Added `createdAt` to SORT_OPTIONS.LEADS as alias for `date`
- `src/controllers/admin.controller.ts` - Added case `createdAt` in sorting switch
- `src/__tests__/constants/admin.constants.test.ts` - Updated to expect 4 sort options

**Frontend Changes (eneos-admin-dashboard):**
- `src/app/api/admin/leads/route.ts` - Parameter mapping + response transformation
- `src/__tests__/api/admin/leads/route.test.ts` - Updated test expectations

**Resolution:** Fixed both backend (accept `createdAt`) and frontend (parameter mapping, response transformation).

