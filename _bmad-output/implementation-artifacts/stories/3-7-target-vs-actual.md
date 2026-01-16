# Story 3.7: Target vs Actual Comparison

Status: done

## Story

As an **ENEOS manager**,
I want **to compare actual sales performance against targets**,
so that **I can quickly identify who is on track, who is exceeding expectations, and who needs support to meet their goals**.

## Acceptance Criteria

1. **AC1: Target Configuration**
   - Given I am an admin user
   - When I access target settings
   - Then I can set **per-person monthly targets** for each metric:
     - Claimed leads target (e.g., 50/month per person)
     - Closed deals target (e.g., 15/month per person)
     - Conversion rate target (e.g., 30%)
   - And targets are stored and persisted
   - **Note:** For MVP, targets can be hardcoded constants; admin UI is optional enhancement
   - **Target Strategy:** Per-person targets (same target for everyone; team total = target × team size)

2. **AC2: Target vs Actual Summary Card**
   - Given I am on the Sales Performance page (`/sales`)
   - When the page loads
   - Then I see a "Target Progress" summary card in the summary section
   - And it shows overall team progress toward monthly target
   - And it displays: "X of Y target achieved" (e.g., "12 of 15 closed deals")
   - And a progress bar shows percentage complete

3. **AC3: Individual Target Progress**
   - Given the performance table is displayed (Story 3-1)
   - When I view the table
   - Then I see a "vs Target" indicator in the Closed column (or separate column)
   - And each row shows that person's progress toward their per-person target
   - And color coding: Green (≥100%), Amber (70-99%), Red (<70%)
   - **Note:** Uses per-person target from AC1 (same target for all; e.g., 15 closed/month each)

4. **AC4: Progress Bar in Table**
   - Given target comparison is enabled
   - When I view the Closed column in the table
   - Then I see a mini progress bar showing actual vs target
   - And the bar fills based on percentage of target achieved
   - And tooltip shows: "12 of 15 (80%)"
   - And bar color matches threshold (Green/Amber/Red)

5. **AC5: Target Achievement Badge**
   - Given a sales person has achieved 100%+ of their target
   - When displayed in the table
   - Then I see a badge or icon indicating target achieved (e.g., ✓, 🎯, star)
   - And hovering shows "Target achieved!" tooltip
   - **MVP:** Badge shown for Closed target only (primary metric)
   - **Optional Enhancement:** Show count for all 3 metrics (e.g., "2/3 targets met" for claimed, closed, conversionRate)

6. **AC6: Period-Adjusted Targets**
   - Given the period filter is set (Story 3-6)
   - When viewing targets
   - Then targets are prorated based on selected period:
     - This Week: monthly target × (7 / days in current month) — assumes full 7-day week
     - This Month: full monthly target
     - This Quarter: monthly target × 3
     - Custom Range: monthly target × (days in range / 30)
   - And display shows period-adjusted target (e.g., "Target: 4 this week")
   - **Note:** Proration uses fixed 7 days for week (not actual days elapsed)

7. **AC7: Above/Below Target Indicator**
   - Given actual vs target is displayed
   - When actual exceeds target
   - Then show positive indicator: "+3 above target" in green
   - When actual is below target
   - Then show negative indicator: "-2 below target" in red
   - When actual equals target
   - Then show "On target" in gray

8. **AC8: Target Summary Tooltip**
   - Given I hover over a target-related element
   - When tooltip appears
   - Then I see breakdown:
     - Current: X
     - Target: Y
     - Progress: Z%
     - Status: Above/On/Below target

9. **AC9: Loading & Empty States**
   - Given targets are loading or not configured
   - When the component renders
   - Then loading shows skeleton placeholder
   - And if no targets configured, show "No targets set" message
   - And provide link to configure targets (if admin UI exists)

10. **AC10: Responsive Design**
    - Given I view on different screen sizes
    - When screen width changes
    - Then target indicators remain visible and readable
    - And progress bars scale appropriately
    - And tooltips work on touch devices

## Tasks / Subtasks

- [x] **Task 1: Target Configuration** (AC: #1)
  - [x] 1.1 Create `src/config/sales-targets.ts` with default targets
  - [x] 1.2 Define target interface: `{ claimed: number, closed: number, conversionRate: number }`
  - [x] 1.3 For MVP: Use hardcoded defaults (claimed: 50, closed: 15, conversionRate: 30)
  - [ ] 1.4 **Optional:** Create admin settings page for target configuration
  - [ ] 1.5 **Optional:** Store targets in backend/database for persistence

- [x] **Task 2: Target Progress Summary Card** (AC: #2)
  - [x] 2.0 Install Progress component: Created custom Progress component (no Radix dependency)
  - [x] 2.1 Create `src/components/sales/target-progress-card.tsx`
  - [x] 2.2 Calculate team progress: sum of closed / (target × team size)
  - [x] 2.3 Display "X of Y" format with progress bar
  - [x] 2.4 Add to summary cards section (now 5 cards total)
  - [x] 2.5 Style to match existing summary cards

- [x] **Task 3: Period Proration Logic** (AC: #6)
  - [x] 3.1 Create `src/lib/target-utils.ts`
  - [x] 3.2 Implement `prorateTarget(monthlyTarget, period)` function
  - [x] 3.3 Week: target × (7 / daysInMonth)
  - [x] 3.4 Quarter: target × 3
  - [x] 3.5 Custom range: target × (daysInRange / 30)

- [x] **Task 4: Table Target Column** (AC: #3, #4)
  - [x] 4.1 Enhanced Closed column in performance table with target comparison
  - [x] 4.2 Create `target-progress-cell.tsx` component
  - [x] 4.3 Show mini progress bar with percentage
  - [x] 4.4 Apply color coding based on threshold
  - [x] 4.5 Add tooltip with detailed breakdown

- [x] **Task 5: Achievement Badge** (AC: #5)
  - [x] 5.1 Created `TargetAchievementBadge` in target-progress-cell.tsx
  - [x] 5.2 Show checkmark/star icon when target achieved
  - [x] 5.3 Add tooltip "Target achieved!"
  - [x] 5.4 Handle multiple targets (e.g., "2/3 targets met")

- [x] **Task 6: Above/Below Indicator** (AC: #7)
  - [x] 6.1 Create helper function `getTargetStatus(actual, target)` in target-utils.ts
  - [x] 6.2 Return: { status: 'above' | 'on' | 'below', difference: number }
  - [x] 6.3 Format display: "+3 above target" / "-2 below target" / "On target"
  - [x] 6.4 Apply appropriate colors (green/amber/red)

- [x] **Task 7: Target Tooltip** (AC: #8)
  - [x] 7.1 Integrated tooltip in target-progress-card.tsx and target-progress-cell.tsx
  - [x] 7.2 Show Current, Target, Progress %, Status
  - [x] 7.3 Integrate with Tooltip from shadcn/ui

- [x] **Task 8: Loading & Empty States** (AC: #9)
  - [x] 8.1 Create skeleton for target card (TargetProgressCardSkeleton)
  - [x] 8.2 Create empty state when no team members (teamSize = 0)
  - [x] 8.3 Updated ConversionSummarySkeleton with new 2-row layout

- [x] **Task 9: Integration** (AC: #2, #3, #6)
  - [x] 9.1 Add Target Progress Card to summary cards section
  - [x] 9.2 Update grid layout to 2 rows (3 + 2 cards):
    - Row 1: Team Avg, Best Performer, Needs Improvement (lg:grid-cols-3)
    - Row 2: Response Time, Target Progress (sm:grid-cols-2)
  - [x] 9.3 Integrate period filter with target proration
  - [x] 9.4 Pass prorated targets to all components

- [x] **Task 10: Testing** (AC: #1-10)
  - [x] 10.1 Test target proration calculation for each period (week, month, quarter, custom)
  - [x] 10.2 Test progress percentage calculation
  - [x] 10.3 Test color coding thresholds at boundaries (69%, 70%, 99%, 100%, 101%)
  - [x] 10.4 Test achievement badge display when target met
  - [x] 10.5 Test above/below indicator formatting (+X/-X/On target)
  - [x] 10.6 Test tooltip content shows all breakdown fields
  - [x] 10.7 Test empty state when no targets
  - [x] 10.8 Test with 0 actual (edge case - shows 0%)
  - [x] 10.9 Test with target = 0 (edge case - avoid division by zero, show 100%)
  - [x] 10.10 Test with actual > target (e.g., 200%) - progress bar capped at 100%, actual number shown
  - [x] 10.11 Test responsive behavior
  - [x] 10.12 Test team size = 0 (edge case - guard division by zero)

## Dev Notes

### Target Configuration

```typescript
// src/config/sales-targets.ts
export interface SalesTargets {
  claimed: number;      // Monthly target for claimed leads
  closed: number;       // Monthly target for closed deals
  conversionRate: number; // Target conversion rate percentage
}

// MVP: Hardcoded defaults
export const DEFAULT_TARGETS: SalesTargets = {
  claimed: 50,         // 50 claimed leads per person per month
  closed: 15,          // 15 closed deals per person per month
  conversionRate: 30,  // 30% conversion rate target
};

// Future: Load from backend/localStorage
export function getTargets(): SalesTargets {
  // TODO: Load from backend API or localStorage
  return DEFAULT_TARGETS;
}
```

### Component Structure

```
src/components/sales/
├── target-progress-card.tsx       # Summary card for team target progress
├── target-progress-cell.tsx       # Table cell with progress bar
├── target-achievement-badge.tsx   # Badge for achieved targets
├── target-tooltip.tsx             # Detailed breakdown tooltip
└── index.ts                       # Update exports

src/lib/
└── target-utils.ts                # Target calculation utilities

src/config/
└── sales-targets.ts               # Target configuration
```

### Target Progress Card

```typescript
// src/components/sales/target-progress-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTargets } from '@/config/sales-targets';
import { prorateTarget } from '@/lib/target-utils';

interface TargetProgressCardProps {
  totalClosed: number;
  teamSize: number;
  period: string;
}

export function TargetProgressCard({ totalClosed, teamSize, period }: TargetProgressCardProps) {
  const targets = getTargets();
  const proratedTarget = prorateTarget(targets.closed, period) * teamSize;
  const progressPercent = proratedTarget > 0 ? (totalClosed / proratedTarget) * 100 : 0;
  const status = getProgressStatus(progressPercent);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Target className="h-4 w-4" />
          Target Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={cn("text-2xl font-bold", getStatusColor(status))}>
              {Math.round(progressPercent)}%
            </span>
            <span className="text-sm text-muted-foreground">
              {totalClosed} of {Math.round(proratedTarget)}
            </span>
          </div>
          <Progress
            value={Math.min(progressPercent, 100)}
            className={cn(
              "h-2",
              status === 'above' && "[&>div]:bg-green-500",
              status === 'on' && "[&>div]:bg-amber-500",
              status === 'below' && "[&>div]:bg-red-500"
            )}
          />
          <p className="text-xs text-muted-foreground">
            Closed deals this {getPeriodLabel(period)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function getProgressStatus(percent: number): 'above' | 'on' | 'below' {
  if (percent >= 100) return 'above';
  if (percent >= 70) return 'on';
  return 'below';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'above': return 'text-green-600';
    case 'on': return 'text-amber-600';
    case 'below': return 'text-red-600';
    default: return 'text-muted-foreground';
  }
}

function getPeriodLabel(period: string): string {
  switch (period) {
    case 'week': return 'week';
    case 'month': return 'month';
    case 'quarter': return 'quarter';
    default: return 'period';
  }
}
```

### Target Proration Utility

```typescript
// src/lib/target-utils.ts
import { getDaysInMonth } from 'date-fns';

/**
 * Prorate monthly target based on selected period
 * @param monthlyTarget - The full monthly target
 * @param period - The selected period (week, month, quarter, custom)
 * @param customDays - Number of days for custom range
 * @returns Prorated target for the period
 */
export function prorateTarget(
  monthlyTarget: number,
  period: string,
  customDays?: number
): number {
  const now = new Date();
  const daysInMonth = getDaysInMonth(now);

  switch (period) {
    case 'week':
      // Prorate to 7 days
      return (monthlyTarget * 7) / daysInMonth;
    case 'month':
      return monthlyTarget;
    case 'quarter':
      return monthlyTarget * 3;
    case 'lastQuarter':
      return monthlyTarget * 3;
    case 'custom':
      // Prorate based on custom days
      return customDays ? (monthlyTarget * customDays) / 30 : monthlyTarget;
    default:
      return monthlyTarget;
  }
}

/**
 * Calculate target status
 */
export function getTargetStatus(actual: number, target: number): {
  status: 'above' | 'on' | 'below';
  difference: number;
  percent: number;
} {
  if (target === 0) {
    return { status: 'above', difference: actual, percent: 100 };
  }

  const percent = (actual / target) * 100;
  const difference = actual - target;

  return {
    status: percent >= 100 ? 'above' : percent >= 70 ? 'on' : 'below',
    difference,
    percent,
  };
}

/**
 * Format target difference display
 */
export function formatTargetDifference(difference: number): string {
  if (difference > 0) return `+${difference} above target`;
  if (difference < 0) return `${difference} below target`;
  return 'On target';
}
```

### Target Progress Cell (Table)

```typescript
// src/components/sales/target-progress-cell.tsx
'use client';

import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTargetStatus, formatTargetDifference } from '@/lib/target-utils';

interface TargetProgressCellProps {
  actual: number;
  target: number;
  showAchievementBadge?: boolean;
}

export function TargetProgressCell({ actual, target, showAchievementBadge = true }: TargetProgressCellProps) {
  const { status, difference, percent } = getTargetStatus(actual, target);
  const achieved = percent >= 100;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium">{actual}</span>
                {showAchievementBadge && achieved && (
                  <Check className="h-3 w-3 text-green-600" />
                )}
              </div>
              <Progress
                value={Math.min(percent, 100)}
                className={cn(
                  "h-1.5",
                  status === 'above' && "[&>div]:bg-green-500",
                  status === 'on' && "[&>div]:bg-amber-500",
                  status === 'below' && "[&>div]:bg-red-500"
                )}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div>Current: {actual}</div>
            <div>Target: {Math.round(target)}</div>
            <div>Progress: {Math.round(percent)}%</div>
            <div className={cn(
              status === 'above' && 'text-green-600',
              status === 'on' && 'text-amber-600',
              status === 'below' && 'text-red-600'
            )}>
              {formatTargetDifference(difference)}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### Summary Cards Grid Update

```typescript
// Update grid to accommodate 5 cards
// Option 1: 5 cards in 2 rows (3 + 2)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
  <TeamAverageCard ... />
  <BestPerformerCard ... />
  <NeedsImprovementCard ... />
</div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
  <ResponseTimeCard ... />
  <TargetProgressCard ... />  {/* NEW */}
</div>

// Option 2: Single row with 5 cards (responsive)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
  {/* All 5 cards */}
</div>
```

### shadcn/ui Components Required

```bash
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add tooltip
```

### Thresholds

```typescript
const TARGET_THRESHOLDS = {
  EXCELLENT: 100,  // >= 100% = Green (achieved)
  ON_TRACK: 70,    // 70-99% = Amber (on track)
  NEEDS_WORK: 0,   // < 70% = Red (needs attention)
} as const;
```

### Dependencies on Previous Stories

- **Story 3-1:** Performance Table - add target column
- **Story 3-2:** Summary Cards section - add Target Progress card
- **Story 3-4:** Response Time Card - grid layout reference
- **Story 3-6:** Period Filter - proration based on selected period

### Backend Requirements

**MVP:** No backend changes needed - use hardcoded targets

**Future Enhancement:**
- `GET /api/admin/targets` - Get current targets
- `PUT /api/admin/targets` - Update targets (admin only)
- Store targets in database or config

### References

- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#F-03.7] - Target vs Actual feature
- [Source: _bmad-output/implementation-artifacts/stories/3-2-conversion-rate.md] - Summary cards pattern
- [Source: _bmad-output/implementation-artifacts/stories/3-6-period-filter.md] - Period selection

### Previous Story Intelligence

From Story 3-2:
- Summary cards grid pattern
- Progress bar component usage

From Story 3-6:
- Period filter integration
- Date range for proration calculation

### Critical Don't-Miss Rules

1. **MVP uses hardcoded targets** - Don't over-engineer; admin UI is optional
2. **Per-person targets** - Same target for everyone; team total = target × team size
3. **Prorate targets by period** - Week uses fixed 7 days, not actual elapsed days
4. **Guard division by zero** - Handle target = 0 AND teamSize = 0 cases
5. **Color coding thresholds** - 100%+ green, 70-99% amber, <70% red
6. **Cap progress bar at 100%** - But show actual number (e.g., "30 of 15" with 100% bar)
7. **Progress component install** - Task 2.0 requires `npx shadcn-ui@latest add progress`
8. **Grid layout 2 rows** - 3 cards top, 2 cards bottom (not 5-col single row)

### Target Assignment Strategy

**Option A: Team Total**
- Target is for entire team
- Individual shows: "Contributing X to team target of Y"

**Option B: Per Person (Recommended for MVP)**
- Each person has same target
- Individual target = monthly target / 1 (same for everyone)
- Team target = monthly target × team size

**Selected: Option B** - Simpler, easier to understand

### Edge Cases

- target = 0 → show 100% progress, no division error
- actual = 0 → show 0% progress with red color
- actual > target (e.g., 200%) → cap progress bar at 100%, show actual number, green color
- No targets configured → show "No targets set" empty state
- Team size = 0 → guard against division by zero, show empty state
- Custom period with 0 days → default to month proration
- Threshold boundaries → 69% = red, 70% = amber, 100% = green

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript compilation: PASSED (no errors)
- ESLint: PASSED (no warnings/errors)
- Build: PASSED (Next.js build successful)

### Completion Notes List

1. **Task 1 (Target Configuration):** Created `src/config/sales-targets.ts` with SalesTargets interface, DEFAULT_TARGETS constant (claimed: 50, closed: 15, conversionRate: 30), getTargets() function, and TARGET_THRESHOLDS.

2. **Task 2 (Target Progress Card):** Created custom Progress component without Radix dependency. Built TargetProgressCard and TargetProgressCardSkeleton with team progress calculation, "X of Y" format, and color-coded progress bar.

3. **Task 3 (Period Proration):** Created `src/lib/target-utils.ts` with prorateTarget() function supporting week (7/daysInMonth), month (1x), quarter (3x), and custom (days/30) periods. Added getTargetStatus(), formatTargetDifference(), getProgressColor(), getProgressBarColor(), getPeriodLabel(), and getDaysInRange() utilities.

4. **Task 4 (Table Target Column):** Created TargetProgressCell component with mini progress bar, color coding, and tooltips. Enhanced Closed column in PerformanceTable to conditionally show target comparison.

5. **Task 5-7 (Badge, Indicator, Tooltip):** Integrated TargetAchievementBadge with checkmark icon and "Target achieved!" tooltip. Above/below indicator shows "+X above target", "-X below target", or "On target" with appropriate colors. Detailed tooltips show Current, Target, Progress %, and Status.

6. **Task 8 (Loading & Empty States):** Created TargetProgressCardSkeleton and empty state for teamSize = 0. Updated ConversionSummarySkeleton to new 2-row layout.

7. **Task 9 (Integration):** Updated ConversionSummaryCards with new 2-row grid layout (3+2 cards). Updated PerformanceTableContainer to calculate prorated targets and pass to children. All components receive period and dateRange props.

8. **Task 10 (Testing):** Created comprehensive tests for:
   - sales-targets.test.ts - Target configuration tests
   - target-utils.test.ts - Proration and status calculation tests
   - target-progress-card.test.tsx - Card component tests
   - target-progress-cell.test.tsx - Cell component tests

### Change Log

- 2026-01-16: Story 3-7 implementation complete - All 10 tasks done

### File List

**New Files Created:**
- src/config/sales-targets.ts
- src/lib/target-utils.ts
- src/components/ui/progress.tsx
- src/components/sales/target-progress-card.tsx
- src/components/sales/target-progress-cell.tsx
- src/__tests__/config/sales-targets.test.ts
- src/__tests__/lib/target-utils.test.ts
- src/__tests__/components/sales/target-progress-card.test.tsx
- src/__tests__/components/sales/target-progress-cell.test.tsx

**Modified Files:**
- src/components/sales/index.ts (added new exports)
- src/components/sales/performance-table.tsx (added target comparison props and TargetProgressCell)
- src/components/sales/performance-table-container.tsx (added target calculation and props)
- src/components/sales/conversion-summary-cards.tsx (added TargetProgressCard, new 2-row grid)
- src/components/sales/conversion-summary-skeleton.tsx (updated to 2-row layout)
- src/__tests__/conversion-summary-cards.test.tsx (updated for new 2-row grid layout)

### Code Review

**Review Date:** 2026-01-16

**Reviewer:** Claude Opus 4.5 (Adversarial Code Review Workflow)

**Review Result:** ✅ PASSED

**Issues Found:**
- 0 Critical
- 4 Medium (all fixed)
- 3 Low (all fixed)

**Medium Issues (Fixed):**
1. Missing file in File List (`src/__tests__/conversion-summary-cards.test.tsx`) - Added to list
2. Missing tests for `getDaysInRange()` - Added 6 test cases
3. Missing tests for `getProgressBarColor()` - Added 4 test cases
4. Missing tests for `getPeriodLabel()` - Added 6 test cases

**Low Issues (Fixed):**
1. Hardcoded threshold 70 without comment - Added `TARGET_THRESHOLD_ABOVE` and `TARGET_THRESHOLD_ON_TRACK` constants
2. JSDoc for `customDays` parameter incomplete - Enhanced documentation with examples
3. Story file missing Code Review section - Added this section

**Test Coverage After Review:**
- `target-utils.test.ts`: 44 tests (added 16 new tests)
- All tests passing

