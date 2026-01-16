# Story 3.1: Sales Team Performance Table

Status: complete

## Story

As an **ENEOS manager**,
I want **to see a comprehensive table of all sales team members with their performance metrics**,
so that **I can evaluate individual performance, identify top performers, and spot team members who need support**.

## Acceptance Criteria

1. **AC1: Table Display**
   - Given I am on the Sales Performance page (`/sales`)
   - When the page loads
   - Then I see a data table showing ALL sales team members
   - And the table has a clear header "Sales Team Performance"
   - And the page renders within 3 seconds

2. **AC2: Table Columns**
   - Given the table is displayed
   - When I view the columns
   - Then I see columns: Name, Claimed, Contacted, Closed, Lost, Unreachable, Conversion Rate, Avg Response Time
   - And columns are properly aligned (text left, numbers right)
   - And headers have tooltips explaining each metric

3. **AC3: Data Accuracy**
   - Given the table shows performance data
   - When I verify the numbers
   - Then Claimed count matches leads with `Sales_Owner_ID` = user
   - And Contacted count matches leads with status = 'contacted'
   - And Closed count matches leads with status = 'closed'
   - And Lost count matches leads with status = 'lost'
   - And Unreachable count matches leads with status = 'unreachable'
   - And all counts are from the selected time period

4. **AC4: Conversion Rate Calculation**
   - Given conversion rates are displayed
   - When I view the percentage
   - Then it shows as "XX.X%" format (e.g., "32.5%")
   - And calculation is: (Closed / Claimed) × 100
   - And rates >= 30% are highlighted in green
   - And rates < 10% are highlighted in amber/warning
   - And shows "N/A" if Claimed = 0

5. **AC5: Response Time Display**
   - Given response times are displayed
   - When I view the column
   - Then it shows average time in human-readable format
   - And times < 60 minutes show as "XX min"
   - And times >= 60 minutes show as "X.X hrs"
   - And times >= 24 hours show as "X.X days"
   - And shows "N/A" if no data available
   - **Note:** Backend returns time in MINUTES

6. **AC6: Column Sorting**
   - Given the table is displayed
   - When I click on a column header
   - Then the table sorts by that column
   - And clicking again reverses the sort order
   - And a sort indicator (arrow) shows the current sort direction
   - And default sort is by Conversion Rate descending

7. **AC7: Row Click Navigation**
   - Given I click on a sales person's row
   - When the click is registered
   - Then a detail Sheet/Dialog panel opens showing individual metrics
   - And the panel shows: name, email, all metrics, and period breakdown
   - And the row has hover highlight indicating it's clickable
   - And keyboard navigation works (Enter/Space to select)
   - And panel can be closed with X button or Escape key

8. **AC8: Loading & Empty States**
   - Given data is loading or no sales data exists
   - When the table renders
   - Then loading shows skeleton table rows (matching column structure)
   - And empty shows "No sales team data available" with helpful message
   - And error shows retry button with error message

9. **AC9: Responsive Design**
   - Given I view on different screen sizes
   - When screen width is < 1024px (tablet)
   - Then table has horizontal scroll with `overflow-x-auto`
   - And sticky first column (Name) remains visible during scroll
   - When screen width is < 768px (mobile)
   - Then table continues to use horizontal scroll (card view is OUT OF SCOPE for this story)
   - And touch scrolling works smoothly

## Tasks / Subtasks

- [x] **Task 1: Page Setup** (AC: #1)
  - [x] 1.1 Create `/sales` page at `src/app/(dashboard)/sales/page.tsx`
  - [x] 1.2 Add page metadata and title
  - [x] 1.3 Add navigation link in sidebar (if not exists) - N/A, TopSalesTable already links to /sales
  - [x] 1.4 Verify route protection with auth middleware

- [x] **Task 2: Performance Table Component** (AC: #1, #2, #9)
  - [x] 2.1 Create `src/components/sales/performance-table.tsx`
  - [x] 2.2 Use shadcn/ui Table component (already installed from Story 2-4)
  - [x] 2.3 Define all columns with proper alignment (text-left for Name, text-right for numbers)
  - [x] 2.4 Add tooltips to column headers using shadcn/ui Tooltip
  - [x] 2.5 Wrap table in `overflow-x-auto` container for horizontal scroll
  - [x] 2.6 Implement sticky first column using `sticky left-0 bg-background` CSS
  - [x] 2.7 Ensure touch scrolling works on mobile (no card view needed)

- [x] **Task 3: API Integration** (AC: #3)
  - [x] 3.1 Create `src/hooks/use-sales-performance.ts` using TanStack Query
  - [x] 3.2 Call `GET /api/admin/sales-performance` endpoint
  - [x] 3.3 Handle pagination if backend returns paginated data
  - [x] 3.4 Configure stale time (60 seconds as per architecture)
  - [x] 3.5 Implement error handling and retry logic

- [x] **Task 4: Conversion Rate Display** (AC: #4)
  - [x] 4.1 Create utility function `formatConversionRate(closed, claimed)`
  - [x] 4.2 Add green highlight style for >= 30%
  - [x] 4.3 Add amber/warning highlight style for < 10%
  - [x] 4.4 Handle N/A case when Claimed = 0
  - [x] 4.5 Round to 1 decimal place

- [x] **Task 5: Response Time Formatting** (AC: #5)
  - [x] 5.1 Create utility function `formatResponseTime(minutes: number)`
  - [x] 5.2 Handle < 60 minutes → "XX min"
  - [x] 5.3 Handle >= 60 minutes → "X.X hrs"
  - [x] 5.4 Handle >= 1440 minutes (24h) → "X.X days"
  - [x] 5.5 Handle null/undefined → "N/A"

- [x] **Task 6: Sorting Implementation** (AC: #6)
  - [x] 6.1 Use TanStack Table for sorting functionality
  - [x] 6.2 Enable sorting on all numeric columns
  - [x] 6.3 Add sort direction indicator icons
  - [x] 6.4 Set default sort: conversionRate DESC
  - [x] 6.5 Persist sort state in URL params (shareable)

- [x] **Task 7: Row Interactivity & Detail Panel** (AC: #7)
  - [x] 7.1 Add onClick handler to table rows
  - [x] 7.2 Implement hover state styling
  - [x] 7.3 Add keyboard navigation (onKeyDown Enter/Space)
  - [x] 7.4 Create `sales-detail-sheet.tsx` using shadcn/ui Sheet component
  - [x] 7.5 Display individual metrics in Sheet: name, email, all counts, conversion rate
  - [x] 7.6 Add close button (X) and Escape key handler
  - [x] 7.7 Add cursor-pointer style to rows

- [x] **Task 8: Loading & Error States** (AC: #8)
  - [x] 8.1 Create `performance-table-skeleton.tsx`
  - [x] 8.2 Create `performance-table-empty.tsx`
  - [x] 8.3 Create error state with retry button
  - [x] 8.4 Add aria-busy for accessibility

- [x] **Task 9: Container Component** (AC: #1-8)
  - [x] 9.1 Create `performance-table-container.tsx`
  - [x] 9.2 Handle data fetching with useSalesPerformance hook
  - [x] 9.3 Pass data to presentation component
  - [x] 9.4 Handle loading/error/empty states

- [x] **Task 10: Testing** (AC: #1-9)
  - [x] 10.1 Test table renders with mock data
  - [x] 10.2 Test conversion rate calculation and formatting
  - [x] 10.3 Test response time formatting (all ranges)
  - [x] 10.4 Test sorting functionality
  - [x] 10.5 Test loading/empty/error states
  - [x] 10.6 Test accessibility (keyboard navigation, aria)
  - [x] 10.7 Test responsive behavior

## Dev Notes

### API Response Format

Backend endpoint is already implemented: `GET /api/admin/sales-performance`

```typescript
// Expected response structure (from EPIC-00 deliverables)
interface SalesPerformanceResponse {
  success: boolean;
  data: {
    teamPerformance: SalesPersonMetrics[];
    summary: {
      totalClaimed: number;
      totalContacted: number;
      totalClosed: number;
      avgConversionRate: number;
      avgResponseTime: number; // IN MINUTES!
    };
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SalesPersonMetrics {
  userId: string;
  name: string;
  email: string;
  claimed: number;
  contacted: number;
  closed: number;
  lost: number;
  unreachable: number;
  conversionRate: number;      // Already calculated by backend
  avgResponseTime: number;     // IN MINUTES!
}
```

### Time Unit Convention (CRITICAL)

**ALL time values from backend are in MINUTES.** This is defined in `src/constants/admin.constants.ts`:

```typescript
// Time Units: ทุกค่าเวลาเป็น นาที (minutes)
avgResponseTime: number;  // นาที
```

Frontend must format for display:
- < 60 → "XX min"
- >= 60 → "X.X hrs" (divide by 60)
- >= 1440 → "X.X days" (divide by 1440)

### Component Structure

```
src/
├── app/(dashboard)/sales/
│   └── page.tsx                    # Page component
├── components/sales/
│   ├── index.ts                    # Barrel exports
│   ├── performance-table.tsx       # Main table component
│   ├── performance-table-skeleton.tsx
│   ├── performance-table-empty.tsx
│   ├── performance-table-container.tsx
│   └── sales-detail-sheet.tsx      # Detail panel (Sheet component)
├── hooks/
│   └── use-sales-performance.ts    # TanStack Query hook
└── lib/
    └── format-utils.ts             # Utility functions (or add to existing)
```

### shadcn/ui Components Required

Already installed from previous stories:
- Table, TableHeader, TableBody, TableRow, TableCell, TableHead
- Card, CardHeader, CardTitle, CardContent
- Skeleton

**Must add for this story:**
```bash
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add sheet
```

### Sorting with TanStack Table

```typescript
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';

const [sorting, setSorting] = useState<SortingState>([
  { id: 'conversionRate', desc: true } // Default sort
]);

const table = useReactTable({
  data,
  columns,
  state: { sorting },
  onSortingChange: setSorting,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
});
```

### Conversion Rate Formatting

```typescript
export function formatConversionRate(closed: number, claimed: number): string {
  if (claimed === 0) return 'N/A';
  const rate = (closed / claimed) * 100;
  return `${rate.toFixed(1)}%`;
}

export function getConversionRateColor(rate: number): string {
  if (rate >= 30) return 'text-green-600';
  if (rate < 10) return 'text-amber-600';
  return '';
}
```

### Response Time Formatting

```typescript
export function formatResponseTime(minutes: number | null | undefined): string {
  if (minutes == null) return 'N/A';

  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  if (minutes < 1440) { // Less than 24 hours
    return `${(minutes / 60).toFixed(1)} hrs`;
  }

  return `${(minutes / 1440).toFixed(1)} days`;
}
```

### Detail Sheet Pattern

```typescript
// src/components/sales/sales-detail-sheet.tsx
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface SalesDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesPerson: SalesPersonMetrics | null;
}

export function SalesDetailSheet({ open, onOpenChange, salesPerson }: SalesDetailSheetProps) {
  if (!salesPerson) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{salesPerson.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">{salesPerson.email}</p>
          {/* Metrics display */}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### Sticky Column CSS Pattern

```typescript
// Sticky first column implementation
<div className="overflow-x-auto">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="sticky left-0 z-10 bg-background">Name</TableHead>
        <TableHead className="text-right">Claimed</TableHead>
        {/* ... other columns */}
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map((person) => (
        <TableRow key={person.userId}>
          <TableCell className="sticky left-0 z-10 bg-background font-medium">
            {person.name}
          </TableCell>
          <TableCell className="text-right">{person.claimed}</TableCell>
          {/* ... other cells */}
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

### Patterns from Previous Stories

**From Story 2-4 (Top Sales Table):**
- Container pattern separates data fetching from presentation
- Skeleton matches exact column structure
- Empty state shows helpful message in card
- Medal/highlight patterns for visual emphasis
- Keyboard navigation with onKeyDown handler
- aria-busy for loading accessibility

### Project Structure Notes

Following established patterns from `eneos-admin-dashboard/`:
- Components go in `src/components/sales/`
- Hooks go in `src/hooks/`
- Pages use App Router at `src/app/(dashboard)/sales/`
- Tests go in `src/__tests__/` mirroring component structure

### Architecture Compliance

From architecture.md:
- TanStack Query for server state (NOT Redux/Zustand)
- URL state for filters/sorting (shareable URLs)
- Responsive: horizontal scroll on tablet, card view option on mobile
- shadcn/ui + Tailwind CSS for styling
- Next.js App Router with 'use client' where needed

### Dependencies

Existing:
- `@tanstack/react-query` - Data fetching
- `@tanstack/react-table` - Table functionality
- `lucide-react` - Icons
- shadcn/ui components

### References

- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#EPIC-03] - Epic description
- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#F-03.1] - Feature definition
- [Source: _bmad-output/planning-artifacts/admin-dashboard/architecture.md#4.1] - Component hierarchy
- [Source: _bmad-output/planning-artifacts/admin-dashboard/architecture.md#5.1] - Data sources
- [Source: _bmad-output/implementation-artifacts/stories/2-4-top-sales-table.md] - Similar table pattern
- [Source: _bmad-output/project-context.md] - Project rules and constraints

### Previous Story Intelligence

From Story 2-4 (Top Sales Table) learnings:
- Always add defensive sorting on frontend even if backend sorts
- Use Math.round for percentage display
- Add aria-busy for accessibility during loading
- Create container component for clean separation
- Test sorting edge cases (ties, empty data)
- Code review identified need for tooltip explanations

### Critical Don't-Miss Rules

1. **Time is in MINUTES** - Don't assume seconds or milliseconds
2. **Use TanStack Query** - NOT fetch directly in component
3. **Persist sort in URL** - For shareable links
4. **Test all number edge cases** - Zero, null, undefined
5. **Follow existing component patterns** - See Story 2-4 structure

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None required - all tests pass.

### Completion Notes List

1. **All 10 Tasks Complete** - All 36 subtasks completed per story requirements
2. **74 New Tests** - Added comprehensive test coverage for sales components
3. **563 Total Tests** - Full test suite passes with no regressions
4. **TypeScript Strict** - No type errors, full strict mode compliance
5. **Dependencies Added**:
   - `@tanstack/react-table` - For TanStack Table sorting functionality
   - shadcn/ui Sheet component - For detail panel

### File List

**New Files Created:**
- `eneos-admin-dashboard/src/app/(dashboard)/sales/page.tsx` - Sales page
- `eneos-admin-dashboard/src/app/api/admin/sales-performance/route.ts` - API proxy route
- `eneos-admin-dashboard/src/types/sales.ts` - TypeScript types for sales data
- `eneos-admin-dashboard/src/lib/api/sales-performance.ts` - API client function
- `eneos-admin-dashboard/src/lib/format-sales.ts` - Formatting utilities
- `eneos-admin-dashboard/src/hooks/use-sales-performance.ts` - TanStack Query hook
- `eneos-admin-dashboard/src/components/sales/index.ts` - Barrel exports
- `eneos-admin-dashboard/src/components/sales/performance-table.tsx` - Main table component
- `eneos-admin-dashboard/src/components/sales/performance-table-skeleton.tsx` - Loading state
- `eneos-admin-dashboard/src/components/sales/performance-table-empty.tsx` - Empty state
- `eneos-admin-dashboard/src/components/sales/performance-table-error.tsx` - Error state
- `eneos-admin-dashboard/src/components/sales/performance-table-container.tsx` - Container
- `eneos-admin-dashboard/src/components/sales/sales-detail-sheet.tsx` - Detail panel
- `eneos-admin-dashboard/src/components/ui/sheet.tsx` - shadcn/ui Sheet (auto-generated)
- `eneos-admin-dashboard/src/__tests__/format-sales.test.ts` - Format utility tests (17 tests)
- `eneos-admin-dashboard/src/__tests__/performance-table.test.tsx` - Table tests (22 tests)
- `eneos-admin-dashboard/src/__tests__/performance-table-states.test.tsx` - State tests (14 tests)
- `eneos-admin-dashboard/src/__tests__/performance-table-container.test.tsx` - Container tests (7 tests)
- `eneos-admin-dashboard/src/__tests__/sales-detail-sheet.test.tsx` - Sheet tests (14 tests)

**Modified Files:**
- `eneos-admin-dashboard/package.json` - Added @tanstack/react-table dependency
