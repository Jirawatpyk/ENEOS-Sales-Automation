# Story 2.5: Recent Activity Feed

Status: done

## Story

As an **ENEOS manager**,
I want **to see a feed of recent sales activities**,
so that **I can monitor team actions in real-time and stay informed**.

## Acceptance Criteria

1. **AC1: Activity Feed Display**
   - Given I am on the dashboard
   - When the page loads
   - Then I see a "Recent Activity" panel
   - And it shows the latest 10 activities

2. **AC2: Activity Types**
   - Given activities are displayed
   - When I view the feed
   - Then I see different activity types: lead claimed, lead contacted, lead closed, new lead
   - And each type has a distinct icon/color

3. **AC3: Activity Details**
   - Given an activity item is shown
   - When I view it
   - Then I see: icon, description (e.g., "สมชาย claimed ABC Corp"), timestamp
   - And timestamp shows relative time (e.g., "2 minutes ago")

4. **AC4: Timestamp Formatting**
   - Given activities have timestamps
   - When displayed
   - Then recent shows "X minutes/hours ago"
   - And older shows date format "Jan 12, 10:30 AM"

5. **AC5: View All Link**
   - Given the activity feed is shown
   - When I click "View All Activity"
   - Then I am navigated to a detailed activity log page

6. **AC6: Color Coding**
   - Given activity icons are displayed
   - When I view them
   - Then 🟢 = closed, 🔵 = claimed, 📞 = contacted, 📥 = new lead

7. **AC7: Loading & Empty States**
   - Given data is loading or empty
   - When the panel renders
   - Then loading shows skeleton items
   - And empty shows "No recent activity"

## Tasks / Subtasks

- [x] **Task 1: Activity Feed Component** (AC: #1, #2)
  - [x] 1.1 Create `src/components/dashboard/recent-activity.tsx`
  - [x] 1.2 Create scrollable list with max 10 items
  - [x] 1.3 Style as card with header

- [x] **Task 2: Activity Item Component** (AC: #2, #3, #6)
  - [x] 2.1 Create `src/components/dashboard/activity-item.tsx`
  - [x] 2.2 Display icon based on activity type
  - [x] 2.3 Show description and timestamp
  - [x] 2.4 Apply color coding

- [x] **Task 3: Timestamp Formatting** (AC: #4)
  - [x] 3.1 Use date-fns `formatDistanceToNow` for relative time
  - [x] 3.2 Use `format` for older timestamps
  - [x] 3.3 Determine threshold (24h for relative)

- [x] **Task 4: View All Link** (AC: #5)
  - [x] 4.1 Add footer link "View All Activity"
  - [x] 4.2 Navigate to `/activity` or `/leads?view=activity`

- [x] **Task 5: States** (AC: #7)
  - [x] 5.1 Create skeleton loader
  - [x] 5.2 Create empty state
  - [x] 5.3 Handle loading prop

- [x] **Task 6: Testing** (AC: #1-7)
  - [x] 6.1 Test feed renders with data
  - [x] 6.2 Test timestamp formatting
  - [x] 6.3 Test navigation works
  - [x] 6.4 Test loading/empty states

## Dev Notes

### Implementation

```typescript
// src/components/dashboard/recent-activity.tsx
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, ArrowRight } from 'lucide-react';
import { ActivityItem } from './activity-item';
import { RecentActivitySkeleton } from './recent-activity-skeleton';

interface Activity {
  id: string;
  type: 'claimed' | 'contacted' | 'closed' | 'new_lead';
  description: string;
  timestamp: string;
  userId?: string;
  leadId?: string;
}

interface RecentActivityProps {
  activities: Activity[];
  isLoading?: boolean;
}

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  if (isLoading) return <RecentActivitySkeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {activities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No recent activity
            </p>
          ) : (
            <div className="space-y-4">
              {activities.slice(0, 10).map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <Link
          href="/activity"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View All Activity
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}
```

### Activity Item Component

```typescript
// src/components/dashboard/activity-item.tsx
'use client';

import { formatDistanceToNow, format, isWithinInterval, subHours } from 'date-fns';
import { cn } from '@/lib/utils';

const ACTIVITY_CONFIG = {
  claimed: { icon: '🔵', color: 'text-blue-600', label: 'claimed' },
  contacted: { icon: '📞', color: 'text-yellow-600', label: 'contacted' },
  closed: { icon: '🟢', color: 'text-green-600', label: 'closed' },
  new_lead: { icon: '📥', color: 'text-gray-600', label: 'new lead' },
};

interface ActivityItemProps {
  activity: {
    type: keyof typeof ACTIVITY_CONFIG;
    description: string;
    timestamp: string;
  };
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const config = ACTIVITY_CONFIG[activity.type];
  const date = new Date(activity.timestamp);
  const isRecent = isWithinInterval(date, {
    start: subHours(new Date(), 24),
    end: new Date(),
  });

  const timeDisplay = isRecent
    ? formatDistanceToNow(date, { addSuffix: true })
    : format(date, 'MMM d, h:mm a');

  return (
    <div className="flex items-start gap-3">
      <span className="text-lg">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", config.color)}>
          {activity.description}
        </p>
        <p className="text-xs text-muted-foreground">{timeDisplay}</p>
      </div>
    </div>
  );
}
```

### Skeleton Component

```typescript
// src/components/dashboard/recent-activity-skeleton.tsx
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function RecentActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-4 w-32" />
      </CardFooter>
    </Card>
  );
}
```

### shadcn/ui Components Required

```bash
npx shadcn-ui@latest add scroll-area
```

### Dependencies

- `date-fns` - Date formatting (formatDistanceToNow, format, isWithinInterval, subHours)
- `lucide-react` - Icons (Clock, ArrowRight)
- `shadcn/ui scroll-area` - Scrollable container
- Story 2-1 should be complete for shared Card/Skeleton patterns

### File Structure

```
src/components/dashboard/
├── recent-activity.tsx
├── recent-activity-skeleton.tsx
└── activity-item.tsx
```

### References

- [Source: docs/admin-dashboard/ux-ui.md#4.2] - Dashboard wireframe
- [Source: docs/admin-dashboard/epics.md#F-02.5] - Recent Activity feature

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- No debug issues encountered during implementation

### Completion Notes List
- ✅ Implemented RecentActivity component with ScrollArea for up to 10 activities (AC#1)
- ✅ Created ActivityItem component with Lucide icons (CheckCircle2, UserCheck, Phone, Inbox) (AC#2, AC#6)
- ✅ Activity items display icon, description, and formatted timestamp (AC#3)
- ✅ Created formatActivityTime utility using date-fns for relative/absolute timestamps (AC#4)
- ✅ Added "View All Activity" link navigating to /activity with aria-label (AC#5)
- ✅ Color coding: green=closed, blue=claimed, amber=contacted, gray=new_lead (AC#6)
- ✅ Created RecentActivitySkeleton for loading state (AC#7)
- ✅ Empty state shows message when no activities (AC#7)
- ✅ All 27 unit tests pass covering all acceptance criteria
- ✅ Full test suite (356 tests) passes with no regressions
- ✅ TypeScript type-check passes with no errors
- ✅ Installed scroll-area shadcn/ui component
- ✅ Updated barrel export in index.ts

### Code Review Fixes Applied
- **[H-01]** Added invalid timestamp validation in formatActivityTime() - returns "Unknown time" for invalid dates
- **[H-02]** Added fallback for unknown activity types with HelpCircle icon and muted color
- **[M-02]** Added edge case tests (invalid timestamps, unknown types, long descriptions)
- **[M-03]** Fixed test flakiness by using fixed timestamps with vi.useFakeTimers()
- **[L-01]** Added tooltip on activity descriptions for truncated text
- **[L-03]** Added aria-label="View all sales activity history" to link for accessibility

### File List
- `src/components/dashboard/recent-activity.tsx` (created)
- `src/components/dashboard/activity-item.tsx` (created + tooltip support)
- `src/components/dashboard/recent-activity-skeleton.tsx` (created)
- `src/components/dashboard/index.ts` (modified - added exports)
- `src/components/ui/scroll-area.tsx` (created by shadcn)
- `src/lib/format-activity-time.ts` (created + validation)
- `src/__tests__/unit/components/dashboard/recent-activity.test.tsx` (created + edge cases)
- `package.json` (modified - radix-ui/react-scroll-area added)
- `package-lock.json` (modified)

## Change Log
- 2026-01-13: Story implementation complete - All 6 tasks done, 19 tests passing
- 2026-01-13: Code review complete - 8 issues fixed, 27 tests passing (8 new edge case tests)
