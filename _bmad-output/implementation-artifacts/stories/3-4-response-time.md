# Story 3.4: Response Time Analytics

Status: done

## Story

As an **ENEOS manager**,
I want **to see response time analytics showing how quickly each sales person claims leads**,
so that **I can identify fast responders, coach slow responders, and improve overall team responsiveness**.

## Acceptance Criteria

1. **AC1: Response Time Summary Card**
   - Given I am on the Sales Performance page (`/sales`)
   - When the page loads
   - Then I see a Response Time summary card in the summary section
   - And it displays team average response time in human-readable format
   - And it shows comparison to target (e.g., "Target: < 30 min")

2. **AC2: Fastest Responder Highlight**
   - Given the response time card is displayed
   - When I view the card
   - Then I see the fastest responder's name and their average response time
   - And if multiple people tie for fastest, show the first alphabetically
   - And clicking highlights that person in the table
   - And shows "N/A" if no response data available

3. **AC3: Response Time Gauge/Indicator**
   - Given response time data is available
   - When I view the response time card
   - Then I see a visual gauge or indicator showing team performance
   - And the gauge shows: Green (< 30 min), Amber (30-60 min), Red (> 60 min)
   - And the current team average is indicated on the gauge

4. **AC4: Response Time Column Enhancement**
   - Given the performance table is displayed (from Story 3-1)
   - When I view the Avg Response Time column
   - Then times are formatted as: "XX min", "X.X hrs", or "X.X days"
   - And times < 30 min show green indicator
   - And times 30-60 min show amber indicator
   - And times > 60 min show red indicator
   - And "N/A" is shown for sales with no claimed leads

5. **AC5: Response Time Ranking (Optional Enhancement)**
   - Given I want to see more than just the fastest responder
   - When I view the response time card or an expanded section
   - Then I can see a mini ranking showing top 3 fastest responders
   - And each shows position (🥇🥈🥉), name, and average response time
   - And clicking a name highlights them in the table
   - **Note:** This extends AC2's single fastest to show top 3; can be in same card or separate component

6. **AC6: Slow Responder Alert**
   - Given some sales have slow response times
   - When any sales person has avg response time > 60 min (exactly 60 is "acceptable", not "slow")
   - Then the card shows an alert badge with count of slow responders
   - And clicking the badge filters the table to show only slow responders
   - And shows "All on track!" when everyone is ≤ 60 min

7. **AC7: Time Unit Handling**
   - Given response times come from the API in MINUTES
   - When displaying times throughout the UI
   - Then times < 60 minutes show as "XX min"
   - And times 60-1439 minutes show as "X.X hrs"
   - And times >= 1440 minutes show as "X.X days"
   - And null/undefined shows as "N/A"

8. **AC8: Loading & Empty States**
   - Given data is loading or unavailable
   - When the component renders
   - Then loading shows skeleton matching card dimensions
   - And empty shows "No response time data available"

9. **AC9: Responsive Design**
   - Given I view on different screen sizes
   - When screen width changes
   - Then the response time card adapts to available space
   - And gauge remains readable at all sizes
   - And mini ranking stacks vertically on mobile

## Tasks / Subtasks

- [x] **Task 1: Response Time Summary Card** (AC: #1, #3)
  - [x] 1.1 Create `src/components/sales/response-time-card.tsx`
  - [x] 1.2 Display team average response time (formatted)
  - [x] 1.3 Show target comparison: "Target: < 30 min"
  - [x] 1.4 Add visual gauge component showing team status

- [x] **Task 2: Visual Gauge Component** (AC: #3)
  - [x] 2.1 Create `src/components/sales/response-time-gauge.tsx`
  - [x] 2.2 Design gauge with 3 zones: Green/Amber/Red
  - [x] 2.3 Show needle or indicator at current average
  - [x] 2.4 Add aria-label for accessibility
  - [x] 2.5 Alternative: Use simple progress bar if gauge is complex

- [x] **Task 3: Fastest Responder Section** (AC: #2)
  - [x] 3.1 Find person with lowest avgResponseTime
  - [x] 3.2 Display name and formatted time
  - [x] 3.3 Handle ties: first alphabetically
  - [x] 3.4 Add onClick to highlight in table
  - [x] 3.5 Handle no data case

- [x] **Task 4: Top 3 Ranking** (AC: #5)
  - [x] 4.1 Create mini ranking list component
  - [x] 4.2 Sort by avgResponseTime ascending (fastest first)
  - [x] 4.3 Show top 3 with position indicators (🥇🥈🥉 or 1/2/3)
  - [x] 4.4 Each item clickable to highlight in table
  - [x] 4.5 Handle fewer than 3 sales people

- [x] **Task 5: Slow Responder Alert** (AC: #6)
  - [x] 5.0 Install Badge component if not exists: `npx shadcn-ui@latest add badge`
  - [x] 5.1 Count sales with avgResponseTime > 60 minutes (not including exactly 60)
  - [x] 5.2 Display alert badge with count using destructive variant
  - [x] 5.3 Add onClick to filter table
  - [x] 5.4 Show positive message "All on track!" when count is 0

- [x] **Task 6: Time Formatting Utility** (AC: #7)
  - [x] 6.1 Create/update `formatResponseTime(minutes)` in `src/lib/format-utils.ts`
  - [x] 6.2 Handle < 60 → "XX min"
  - [x] 6.3 Handle 60-1439 → "X.X hrs"
  - [x] 6.4 Handle >= 1440 → "X.X days"
  - [x] 6.5 Handle null/undefined → "N/A"
  - [x] 6.6 Export for use across components

- [x] **Task 7: Table Column Enhancement** (AC: #4)
  - [x] 7.1 Update Story 3-1's table to use color indicators
  - [x] 7.2 Add green/amber/red dot or badge next to time
  - [x] 7.3 Use shared `formatResponseTime` utility
  - [x] 7.4 Ensure consistent threshold application

- [x] **Task 8: Loading & Empty States** (AC: #8)
  - [x] 8.1 Create `response-time-card-skeleton.tsx`
  - [x] 8.2 Create empty state with helpful message
  - [x] 8.3 Match card dimensions

- [x] **Task 9: Integration** (AC: #1-9)
  - [x] 9.1 Add response time card to summary cards section
  - [x] 9.2 Wire up highlight callbacks
  - [x] 9.3 Wire up filter callback for slow responders
  - [x] 9.4 Update summary cards grid (now 4 cards: Team Avg, Best Performer, Needs Improvement, Response Time)

- [x] **Task 10: Testing** (AC: #1-9)
  - [x] 10.1 Test team average calculation
  - [x] 10.2 Test time formatting at boundaries (59, 60, 1439, 1440 minutes)
  - [x] 10.3 Test fastest responder selection with ties (alphabetical order)
  - [x] 10.4 Test slow responder count: 60 min = NOT slow, 61 min = slow
  - [x] 10.5 Test gauge color zones at boundaries (29/30 min, 60/61 min)
  - [x] 10.6 Test click interactions (highlight, filter)
  - [x] 10.7 Test loading and empty states
  - [x] 10.8 Test with null/undefined/0 response times
  - [x] 10.9 Test top 3 ranking with fewer than 3 people

## Dev Notes

### Data Requirements

Uses the same API endpoint: `GET /api/admin/sales-performance`

```typescript
interface SalesPersonMetrics {
  userId: string;
  name: string;
  // ... other fields
  avgResponseTime: number;  // IN MINUTES! Critical.
}

interface Summary {
  // ... other fields
  avgResponseTime: number;  // Team average IN MINUTES
}
```

### Time Thresholds

```typescript
const RESPONSE_TIME_THRESHOLDS = {
  FAST: 30,      // < 30 min = Green (excellent)
  ACCEPTABLE: 60, // 30-60 min = Amber (acceptable)
  SLOW: 60,      // > 60 min = Red (needs improvement)
} as const;

const getResponseTimeStatus = (minutes: number | null): 'fast' | 'acceptable' | 'slow' | null => {
  if (minutes == null) return null;
  if (minutes < 30) return 'fast';
  if (minutes <= 60) return 'acceptable';
  return 'slow';
};

const getResponseTimeColor = (status: string | null): string => {
  switch (status) {
    case 'fast': return 'text-green-600';
    case 'acceptable': return 'text-amber-600';
    case 'slow': return 'text-red-600';
    default: return 'text-muted-foreground';
  }
};
```

### Component Structure

```
src/components/sales/
├── response-time-card.tsx           # Main card component
├── response-time-gauge.tsx          # Visual gauge (optional)
├── response-time-ranking.tsx        # Top 3 fastest responders
├── response-time-card-skeleton.tsx  # Loading state
└── index.ts                         # Update exports

src/lib/
└── format-utils.ts                  # Add formatResponseTime function
```

### Response Time Card Component

```typescript
// src/components/sales/response-time-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatResponseTime, getResponseTimeStatus, getResponseTimeColor } from '@/lib/format-utils';

interface ResponseTimeCardProps {
  teamAverage: number | null;
  teamPerformance: SalesPersonMetrics[];
  onHighlight?: (userId: string) => void;
  onFilterSlow?: () => void;
}

export function ResponseTimeCard({
  teamAverage,
  teamPerformance,
  onHighlight,
  onFilterSlow,
}: ResponseTimeCardProps) {
  const status = getResponseTimeStatus(teamAverage);
  const slowCount = teamPerformance.filter(p => p.avgResponseTime > 60).length;

  // Find fastest responder
  const validResponders = teamPerformance.filter(p => p.avgResponseTime != null && p.avgResponseTime > 0);
  const fastestResponder = validResponders.length > 0
    ? validResponders.reduce((a, b) => a.avgResponseTime < b.avgResponseTime ? a : b)
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Response Time
          </span>
          {slowCount > 0 && (
            <Badge
              variant="destructive"
              className="cursor-pointer"
              onClick={onFilterSlow}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {slowCount} slow
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Team Average */}
          <div>
            <div className={cn("text-2xl font-bold", getResponseTimeColor(status))}>
              {formatResponseTime(teamAverage)}
            </div>
            <p className="text-xs text-muted-foreground">
              Team Average • Target: &lt; 30 min
            </p>
          </div>

          {/* Fastest Responder */}
          {fastestResponder && (
            <div
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
              onClick={() => onHighlight?.(fastestResponder.userId)}
            >
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{fastestResponder.name}</span>
              <span className="text-green-600">
                {formatResponseTime(fastestResponder.avgResponseTime)}
              </span>
            </div>
          )}

          {/* Status Indicator */}
          <div className="flex gap-1">
            <div className={cn("h-2 flex-1 rounded", status === 'fast' ? 'bg-green-500' : 'bg-muted')} />
            <div className={cn("h-2 flex-1 rounded", status === 'acceptable' ? 'bg-amber-500' : 'bg-muted')} />
            <div className={cn("h-2 flex-1 rounded", status === 'slow' ? 'bg-red-500' : 'bg-muted')} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Format Utility Function

```typescript
// src/lib/format-utils.ts

/**
 * Format response time from minutes to human-readable string
 * @param minutes - Response time in MINUTES (from API)
 * @returns Formatted string: "XX min", "X.X hrs", "X.X days", or "N/A"
 */
export function formatResponseTime(minutes: number | null | undefined): string {
  if (minutes == null || minutes < 0) return 'N/A';

  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  if (minutes < 1440) { // Less than 24 hours
    return `${(minutes / 60).toFixed(1)} hrs`;
  }

  return `${(minutes / 1440).toFixed(1)} days`;
}

export function getResponseTimeStatus(minutes: number | null): 'fast' | 'acceptable' | 'slow' | null {
  if (minutes == null) return null;
  if (minutes < 30) return 'fast';
  if (minutes <= 60) return 'acceptable';
  return 'slow';
}

export function getResponseTimeColor(status: ReturnType<typeof getResponseTimeStatus>): string {
  switch (status) {
    case 'fast': return 'text-green-600';
    case 'acceptable': return 'text-amber-600';
    case 'slow': return 'text-red-600';
    default: return 'text-muted-foreground';
  }
}
```

### Summary Cards Grid Update

Story 3-2 created 3 summary cards. This story adds a 4th:

```typescript
// Update grid to accommodate 4 cards
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <TeamAverageCard ... />
  <BestPerformerCard ... />
  <NeedsImprovementCard ... />
  <ResponseTimeCard ... />  {/* NEW */}
</div>
```

### Table Column Color Indicator

Update Story 3-1's table to show color indicators:

```typescript
// In performance-table.tsx, update response time cell
<TableCell className="text-right">
  <div className="flex items-center justify-end gap-2">
    <span className={cn(
      "h-2 w-2 rounded-full",
      getResponseTimeStatus(person.avgResponseTime) === 'fast' && 'bg-green-500',
      getResponseTimeStatus(person.avgResponseTime) === 'acceptable' && 'bg-amber-500',
      getResponseTimeStatus(person.avgResponseTime) === 'slow' && 'bg-red-500',
    )} />
    <span>{formatResponseTime(person.avgResponseTime)}</span>
  </div>
</TableCell>
```

### Dependencies on Previous Stories

- **Story 3-1:** Performance table with response time column
- **Story 3-2:** Summary cards container and highlight pattern
- **Story 3-3:** Shared page layout and data flow

### Critical Time Unit Reminder

**ALL time values from backend are in MINUTES.**

```
API returns: avgResponseTime: 45      → Display: "45 min"
API returns: avgResponseTime: 90      → Display: "1.5 hrs"
API returns: avgResponseTime: 2880    → Display: "2.0 days"
API returns: avgResponseTime: null    → Display: "N/A"
```

### References

- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#F-03.4] - Response Time feature
- [Source: _bmad-output/implementation-artifacts/stories/3-1-performance-table.md] - Table with response time column
- [Source: _bmad-output/implementation-artifacts/stories/3-2-conversion-rate.md] - Summary cards pattern
- [Source: _bmad-output/project-context.md] - Time unit convention

### Previous Story Intelligence

From Story 3-1:
- Response time column exists in table
- `formatResponseTime` utility may already be created
- Time values are in MINUTES

From Story 3-2:
- Summary cards grid pattern
- Highlight callback pattern
- Filter callback pattern

### Critical Don't-Miss Rules

1. **Time is in MINUTES** - Don't convert twice or assume other units
2. **Reuse formatResponseTime** - If created in Story 3-1, import it; don't duplicate
3. **Update grid to 4 columns** - Summary cards section needs layout update
4. **Consistent thresholds** - Use same 30/60 min thresholds everywhere
5. **Handle null/0** - Sales with no claimed leads have no response time

### Edge Cases

- Sales person with 0 claimed leads → avgResponseTime may be null or 0
- All sales are slow → show alert but no "fastest" comparison
- Only 1-2 sales people → ranking shows fewer than 3
- Team average is null → show "N/A" for team average

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All type checks passed (tsc --noEmit)
- All lint checks passed (npm run lint)
- All tests passed (npx vitest run - exit code 0)

### Completion Notes List

- **Task 6:** Added `getResponseTimeStatus`, `getResponseTimeColor`, `getResponseTimeBgColor`, and `RESPONSE_TIME_THRESHOLDS` to `format-sales.ts`. Functions handle boundary conditions correctly (60 min = acceptable, 61 min = slow).

- **Task 1-5:** Created `response-time-card.tsx` component with integrated fastest responder section, top 3 ranking, slow responder alert badge, and team average display with target comparison.

- **Task 2:** Created `response-time-gauge.tsx` with visual 3-zone gauge (green/amber/red) and position indicator needle.

- **Task 8:** Created `response-time-card-skeleton.tsx` matching card dimensions.

- **Task 7:** Enhanced `performance-table.tsx` to show color-coded dots (green/amber/red) next to response time values.

- **Task 9:** Updated `conversion-summary-cards.tsx` to include ResponseTimeCard (now 4 cards with `lg:grid-cols-4`). Updated `performance-table-container.tsx` with slow responder filtering functionality.

- **Task 10:** Added comprehensive tests in `format-sales.test.ts`, `response-time-card.test.tsx`, and `response-time-gauge.test.tsx` covering all ACs including boundary conditions.

### File List

**New Files:**
- `eneos-admin-dashboard/src/components/sales/response-time-card.tsx`
- `eneos-admin-dashboard/src/components/sales/response-time-gauge.tsx`
- `eneos-admin-dashboard/src/components/sales/response-time-card-skeleton.tsx`
- `eneos-admin-dashboard/src/__tests__/response-time-card.test.tsx`
- `eneos-admin-dashboard/src/__tests__/response-time-gauge.test.tsx`

**Modified Files:**
- `eneos-admin-dashboard/src/lib/format-sales.ts` - Added response time status/color utilities
- `eneos-admin-dashboard/src/components/sales/performance-table.tsx` - Added color indicators for response time column
- `eneos-admin-dashboard/src/components/sales/conversion-summary-cards.tsx` - Added ResponseTimeCard, updated grid to 4 columns
- `eneos-admin-dashboard/src/components/sales/conversion-summary-skeleton.tsx` - Updated to 4 cards
- `eneos-admin-dashboard/src/components/sales/performance-table-container.tsx` - Added slow responder filter state/callback with useRef cleanup
- `eneos-admin-dashboard/src/components/sales/index.ts` - Added exports for new components
- `eneos-admin-dashboard/src/__tests__/format-sales.test.ts` - Added tests for new utilities
- `eneos-admin-dashboard/src/__tests__/performance-table-container.test.tsx` - Added integration tests for Story 3.4

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Story implementation complete - all ACs satisfied | Claude Opus 4.5 |
| 2026-01-16 | Code review passed - fixed test afterEach cleanup | Claude Opus 4.5 |
