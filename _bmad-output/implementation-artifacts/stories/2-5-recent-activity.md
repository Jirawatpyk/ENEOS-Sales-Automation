# Story 2.5: Recent Activity Feed

Status: ready-for-dev

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

- [ ] **Task 1: Activity Feed Component** (AC: #1, #2)
  - [ ] 1.1 Create `src/components/dashboard/recent-activity.tsx`
  - [ ] 1.2 Create scrollable list with max 10 items
  - [ ] 1.3 Style as card with header

- [ ] **Task 2: Activity Item Component** (AC: #2, #3, #6)
  - [ ] 2.1 Create `src/components/dashboard/activity-item.tsx`
  - [ ] 2.2 Display icon based on activity type
  - [ ] 2.3 Show description and timestamp
  - [ ] 2.4 Apply color coding

- [ ] **Task 3: Timestamp Formatting** (AC: #4)
  - [ ] 3.1 Use date-fns `formatDistanceToNow` for relative time
  - [ ] 3.2 Use `format` for older timestamps
  - [ ] 3.3 Determine threshold (24h for relative)

- [ ] **Task 4: View All Link** (AC: #5)
  - [ ] 4.1 Add footer link "View All Activity"
  - [ ] 4.2 Navigate to `/activity` or `/leads?view=activity`

- [ ] **Task 5: States** (AC: #7)
  - [ ] 5.1 Create skeleton loader
  - [ ] 5.2 Create empty state
  - [ ] 5.3 Handle loading prop

- [ ] **Task 6: Testing** (AC: #1-7)
  - [ ] 6.1 Test feed renders with data
  - [ ] 6.2 Test timestamp formatting
  - [ ] 6.3 Test navigation works
  - [ ] 6.4 Test loading/empty states

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
{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

