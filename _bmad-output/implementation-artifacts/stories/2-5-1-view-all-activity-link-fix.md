# Story 2.5.1: View All Activity Link Fix

Status: done

## Story

As an **ENEOS admin user**,
I want **the "View All Activity" link to navigate to the full Activity Log page**,
so that **I can access detailed activity history with filters directly from the dashboard**.

As a **viewer**,
I want **the "View All Activity" link to be hidden**,
so that **I don't see a link to a page I cannot access**.

## Background

Story 2-5 implemented the Recent Activity panel on the Dashboard with a "View All Activity" link. Currently, this link temporarily navigates to `/leads`.

Story 7-7 implemented the full Activity Log page at `/settings/activity`, but this page is admin-only (Settings page is protected by role-based access from Story 1-5).

This creates a UX issue where viewers see a link they cannot use. This story fixes the link behavior based on user role.

## Acceptance Criteria

1. **AC1: Admin View All Activity Link**
   - Given I am logged in with "admin" role
   - When I view the Recent Activity panel on Dashboard
   - Then I see the "View All Activity" link
   - And clicking it navigates to `/settings/activity`

2. **AC2: Viewer Link Hidden**
   - Given I am logged in with "viewer" role
   - When I view the Recent Activity panel on Dashboard
   - Then I do NOT see the "View All Activity" link
   - And the panel footer is empty or shows only the activity count

3. **AC3: Link Styling**
   - Given the "View All Activity" link is visible (admin)
   - When I hover over it
   - Then it shows hover state (underline or color change)
   - And it has an arrow icon indicating navigation

## Tasks / Subtasks

- [x] **Task 1: Update RecentActivity Component** (AC: #1, #2, #3)
  - [x] 1.1 Import `useSession` from `next-auth/react`
  - [x] 1.2 Get user role AND status from session
  - [x] 1.3 Check `status === 'authenticated'` before showing link (prevent flash during load)
  - [x] 1.4 Conditionally render "View All Activity" link based on role
  - [x] 1.5 Update link href from `/leads` to `/settings/activity`
  - [x] 1.6 Ensure link styling matches existing design

- [x] **Task 2: Testing** (AC: #1, #2)
  - [x] 2.1 Test admin sees link and navigates correctly
  - [x] 2.2 Test viewer does NOT see link
  - [x] 2.3 Test link hidden when session is loading (prevent flash)
  - [x] 2.4 Test link hover state

## Dev Notes

### Implementation

```tsx
// src/components/dashboard/recent-activity.tsx
'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  const { data: session, status } = useSession();
  // Only show link when authenticated AND admin (prevents flash during loading)
  const isAdmin = status === 'authenticated' && session?.user?.role === 'admin';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Activity list */}
      </CardContent>
      {isAdmin && (
        <CardFooter className="pt-0">
          <Link
            href="/settings/activity"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View All Activity
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
```

### Testing

```typescript
// src/__tests__/dashboard/recent-activity.test.tsx

describe('RecentActivity', () => {
  it('shows View All Activity link for admin', () => {
    // Mock session with admin role
    mockUseSession({ data: { user: { role: 'admin' } }, status: 'authenticated' });

    render(<RecentActivity activities={[]} isLoading={false} />);

    expect(screen.getByText('View All Activity')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/settings/activity');
  });

  it('hides View All Activity link for viewer', () => {
    // Mock session with viewer role
    mockUseSession({ data: { user: { role: 'viewer' } }, status: 'authenticated' });

    render(<RecentActivity activities={[]} isLoading={false} />);

    expect(screen.queryByText('View All Activity')).not.toBeInTheDocument();
  });

  it('hides View All Activity link when session is loading', () => {
    // Mock loading state - prevents flash during initial load
    mockUseSession({ data: null, status: 'loading' });

    render(<RecentActivity activities={[]} isLoading={false} />);

    expect(screen.queryByText('View All Activity')).not.toBeInTheDocument();
  });
});
```

### Dependencies

- Story 2-5 (Recent Activity Feed) - Component to modify
- Story 7-7 (Activity Log Page) - Destination page
- Story 1-5 (Role-Based Access) - useSession hook, role checking

### Files to Modify

- `src/components/dashboard/recent-activity.tsx`
- `src/__tests__/unit/components/dashboard/recent-activity.test.tsx`

## Definition of Done

- [x] Admin sees "View All Activity" link → `/settings/activity`
- [x] Viewer does NOT see the link
- [x] All tests pass (2013 tests, 36 in recent-activity.test.tsx)
- [x] Code review passed

## File List

| File | Status |
|------|--------|
| `eneos-admin-dashboard/src/components/dashboard/recent-activity.tsx` | Modified |
| `eneos-admin-dashboard/src/__tests__/unit/components/dashboard/recent-activity.test.tsx` | Modified |

## Dev Agent Record

### Implementation Plan
1. Import `useSession` from next-auth/react
2. Add session status + role check before rendering link
3. Change href from `/leads?sort=updatedAt&order=desc` to `/settings/activity`
4. Conditionally render CardFooter only when `isAdmin` is true

### Completion Notes
✅ **Implementation Complete:**
- Added `useSession` hook to get session data and status
- Created `isAdmin` variable: `status === 'authenticated' && session?.user?.role === 'admin'`
- Wrapped CardFooter with `{isAdmin && (...)}` conditional
- Updated href to `/settings/activity`
- Preserved existing link styling with hover:underline and ArrowRight icon

✅ **Tests Added/Updated:**
- Added mock for `next-auth/react` useSession
- Added 10 new tests for Story 2.5.1:
  - AC#1: Admin sees link (3 tests: visibility, href, aria-label)
  - AC#2: Viewer does NOT see link (2 tests)
  - Loading state: Link hidden when session is loading (2 tests)
  - Edge case: User without role property (1 test)
  - AC#3: Link styling tests (hover underline, arrow icon - 2 tests)
- All 36 tests in recent-activity.test.tsx pass
- All 2013 tests in dashboard project pass

⚠️ **Breaking Change:**
- aria-label changed from `"View all recent leads activity"` to `"View all activity log"`

## References

- [Source: 2-5-recent-activity.md] - Original story with View All link
- [Source: 7-7-activity-log-page.md] - Activity Log destination
- [Source: 1-5-role-based-access.md] - Role checking pattern

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-20 | Story created | Bob (SM Agent) |
| 2026-01-20 | Review fixes: Added status check to prevent flash during load, added test for loading state | Bob (SM Agent) |
| 2026-01-21 | Implementation complete: Added role-based link visibility, updated tests, all 2012 tests pass | Amelia (Dev Agent) |
| 2026-01-21 | Code review fixes: Fixed file path in docs, added edge case test (undefined role), fixed import order, documented aria-label change. All 2013 tests pass. | Amelia (Dev Agent) |
