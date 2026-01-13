# Story 2.4: Top Sales Table

Status: done

## Story

As an **ENEOS manager**,
I want **to see a table of top 5 performing sales team members**,
so that **I can recognize top performers and identify success patterns**.

## Acceptance Criteria

1. **AC1: Table Display**
   - Given I am on the dashboard page
   - When the page loads
   - Then I see a table showing top 5 sales performers
   - And the table has a clear "Top Sales This Month" header

2. **AC2: Table Columns**
   - Given the table is displayed
   - When I view the columns
   - Then I see: Rank, Name, Claimed, Contacted, Closed, Conversion Rate
   - And columns are properly aligned

3. **AC3: Ranking Display**
   - Given the table shows rankings
   - When I view the rank column
   - Then positions 1-3 show medal icons (🥇🥈🥉)
   - And positions 4-5 show numeric rank

4. **AC4: Sorting Logic**
   - Given the top sales are calculated
   - When the table renders
   - Then sales are sorted by Conversion Rate (Closed/Claimed) descending
   - And ties are broken by total Closed count

5. **AC5: Conversion Rate Format**
   - Given conversion rates are displayed
   - When I view the percentage
   - Then it shows as "XX%" format (e.g., "32%")
   - And rates above 30% are highlighted in green

6. **AC6: Click to Detail**
   - Given I click on a sales person's name
   - When the click is registered
   - Then I am navigated to `/sales?userId={id}` for detailed view
   - And the row has hover highlight indicating it's clickable

7. **AC7: Loading & Empty States**
   - Given data is loading or no sales data exists
   - When the table renders
   - Then loading shows skeleton rows
   - And empty shows "No sales data available"

## Tasks / Subtasks

- [x] **Task 1: Table Component** (AC: #1, #2)
  - [x] 1.1 Create `src/components/dashboard/top-sales-table.tsx`
  - [x] 1.2 Use shadcn/ui Table component
  - [x] 1.3 Define columns: Rank, Name, Claimed, Contacted, Closed, Conv.Rate
  - [x] 1.4 Style table with proper spacing

- [x] **Task 2: Data Integration** (AC: #4)
  - [x] 2.1 Extract `topSales` from dashboard API response
  - [x] 2.2 Ensure data is sorted by conversion rate
  - [x] 2.3 Limit to top 5 entries

- [x] **Task 3: Ranking Display** (AC: #3)
  - [x] 3.1 Create rank display component
  - [x] 3.2 Show medals for positions 1-3
  - [x] 3.3 Show numbers for positions 4-5

- [x] **Task 4: Formatting** (AC: #5)
  - [x] 4.1 Format conversion rate as percentage
  - [x] 4.2 Add green highlight for rates > 30%
  - [x] 4.3 Format numbers with locale separators

- [x] **Task 5: Interactivity** (AC: #6)
  - [x] 5.1 Add click handler to name column
  - [x] 5.2 Navigate to sales detail page
  - [x] 5.3 Add hover state to rows
  - [x] 5.4 Add cursor pointer style

- [x] **Task 6: States** (AC: #7)
  - [x] 6.1 Create skeleton table rows
  - [x] 6.2 Create empty state component
  - [x] 6.3 Handle loading prop

- [x] **Task 7: Testing** (AC: #1-7)
  - [x] 7.1 Test table renders with data
  - [x] 7.2 Test sorting is correct
  - [x] 7.3 Test navigation works
  - [x] 7.4 Test loading/empty states

## Dev Notes

### Implementation

```typescript
// src/components/dashboard/top-sales-table.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopSalesTableSkeleton } from './top-sales-table-skeleton';
import { TopSalesTableEmpty } from './top-sales-table-empty';

interface SalesPerson {
  userId: string;
  name: string;
  claimed: number;
  contacted: number;
  closed: number;
  conversionRate: number;
}

interface TopSalesTableProps {
  data: SalesPerson[];
  isLoading?: boolean;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function TopSalesTable({ data, isLoading }: TopSalesTableProps) {
  const router = useRouter();

  if (isLoading) return <TopSalesTableSkeleton />;
  if (!data || data.length === 0) return <TopSalesTableEmpty />;

  const handleRowClick = (userId: string) => {
    router.push(`/sales?userId=${userId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Top Sales This Month
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Claimed</TableHead>
              <TableHead className="text-right">Contacted</TableHead>
              <TableHead className="text-right">Closed</TableHead>
              <TableHead className="text-right">Conv. Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 5).map((person, index) => (
              <TableRow
                key={person.userId}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(person.userId)}
              >
                <TableCell className="font-medium">
                  {index < 3 ? (
                    <span className="text-xl">{MEDALS[index]}</span>
                  ) : (
                    <span className="text-muted-foreground">{index + 1}</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">{person.name}</TableCell>
                <TableCell className="text-right">{person.claimed}</TableCell>
                <TableCell className="text-right">{person.contacted}</TableCell>
                <TableCell className="text-right">{person.closed}</TableCell>
                <TableCell className={cn(
                  "text-right font-medium",
                  person.conversionRate >= 30 && "text-green-600"
                )}>
                  {person.conversionRate}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

### Skeleton Component

```typescript
// src/components/dashboard/top-sales-table-skeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TopSalesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-12 ml-auto" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Empty State Component

```typescript
// src/components/dashboard/top-sales-table-empty.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export function TopSalesTableEmpty() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Top Sales This Month
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-[200px] items-center justify-center">
        <p className="text-muted-foreground">No sales data available</p>
      </CardContent>
    </Card>
  );
}
```

### shadcn/ui Components Required

```bash
npx shadcn-ui@latest add table
```

### Dependencies

- `lucide-react` - Icons (Trophy)
- `shadcn/ui table` - Table components
- Story 2-1 should be complete for shared Card/Skeleton patterns

### File Structure

```
src/components/dashboard/
├── top-sales-table.tsx
├── top-sales-table-skeleton.tsx
└── top-sales-table-empty.tsx
```

### References

- [Source: docs/admin-dashboard/ux-ui.md#4.2] - Dashboard wireframe
- [Source: docs/admin-dashboard/epics.md#F-02.4] - Top Sales Table feature

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- Installed shadcn/ui Table component
- Type check passed with 0 errors
- All 329 tests passed (34 new tests for Story 2.4)
- Code review: Fixed 4 medium issues, 3 low issues

### Completion Notes List
- Created TopSalesTable component with full AC coverage
- Implemented medal display (🥇🥈🥉) for ranks 1-3
- Added green highlight for conversion rates >= 30%
- Implemented keyboard navigation (Enter/Space) for accessibility
- Created container component for data fetching with error handling
- Added comprehensive test coverage for all acceptance criteria
- **[Code Review Fix]** Added defensive frontend sorting (AC#4 tie-breaking)
- **[Code Review Fix]** Added Math.round for conversion rate display (AC#5)
- **[Code Review Fix]** Added aria-busy for accessibility
- **[Code Review Fix]** Added tests for sorting and decimal rounding

### File List
**New Files:**
- `eneos-admin-dashboard/src/components/dashboard/top-sales-table.tsx`
- `eneos-admin-dashboard/src/components/dashboard/top-sales-table-skeleton.tsx`
- `eneos-admin-dashboard/src/components/dashboard/top-sales-table-empty.tsx`
- `eneos-admin-dashboard/src/components/dashboard/top-sales-table-container.tsx`
- `eneos-admin-dashboard/src/__tests__/top-sales-table.test.tsx`
- `eneos-admin-dashboard/src/__tests__/top-sales-table-skeleton.test.tsx`
- `eneos-admin-dashboard/src/__tests__/top-sales-table-empty.test.tsx`
- `eneos-admin-dashboard/src/__tests__/top-sales-table-container.test.tsx`
- `eneos-admin-dashboard/src/components/ui/table.tsx` (shadcn/ui component)

**Modified Files:**
- `eneos-admin-dashboard/src/types/dashboard.ts` - Added TopSalesPerson interface
- `eneos-admin-dashboard/src/components/dashboard/index.ts` - Added exports
- `eneos-admin-dashboard/src/app/(dashboard)/dashboard/page.tsx` - Added TopSalesTableContainer

**Note:** Other modified files in git (`package.json`, `src/lib/auth.ts`, etc.) are from previous stories or unrelated changes.

### Cleanup Notes
**Debug files to clean up or add to .gitignore:**
- `dashboard-screenshot.png` - Development screenshot
- `screenshot-dashboard.ts` - Screenshot utility
- `src/app/api/debug/` - Debug API routes (dev only)

### Change Log
- 2026-01-13: Implemented Story 2.4 Top Sales Table with all ACs satisfied
- 2026-01-13: Code Review - Fixed MEDIUM-1 (defensive sorting), MEDIUM-2 (tie-breaking tests), MEDIUM-3 (decimal rounding), LOW-1 (aria-busy)
- 2026-01-13: Added cleanup notes for debug files (LOW-3)

