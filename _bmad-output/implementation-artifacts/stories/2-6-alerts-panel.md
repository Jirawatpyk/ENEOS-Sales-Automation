# Story 2.6: Alerts Panel

Status: done

## Story

As an **ENEOS manager**,
I want **to see alerts for leads that need attention**,
so that **I can take action on unclaimed or stale leads promptly**.

## Acceptance Criteria

1. **AC1: Alerts Panel Display**
   - Given I am on the dashboard
   - When the page loads
   - Then I see an "Alerts" panel in the dashboard grid
   - And it shows actionable warnings

2. **AC2: Alert Types**
   - Given alerts are displayed
   - When I view them
   - Then I see: unclaimed leads >24h, contacted but not followed up >7 days
   - And each alert type has a distinct icon (⚠️ warning)

3. **AC3: Alert Content**
   - Given an alert is shown
   - When I view it
   - Then I see: warning icon, description (e.g., "5 leads ไม่มีคนรับ >24h")
   - And a "View Leads" action button

4. **AC4: View Leads Action**
   - Given I click "View Leads" on an alert
   - When the click is registered
   - Then I am navigated to the leads page with appropriate filter
   - Example: `/leads?status=new&age=24h`

5. **AC5: Alert Count Badge**
   - Given there are alerts
   - When the panel header is displayed
   - Then I see a badge showing total alert count
   - And the badge is red/orange for urgency

6. **AC6: No Alerts State**
   - Given there are no alerts
   - When the panel renders
   - Then I see a green checkmark with "All clear! No alerts"

7. **AC7: Info Alerts**
   - Given there are informational items
   - When displayed
   - Then I see ℹ️ icon for info (e.g., "Campaign Q1 ends in 3 days")
   - And these are styled differently from warnings

## Tasks / Subtasks

- [x] **Task 1: Alerts Panel Component** (AC: #1, #5)
  - [x] 1.1 Create `src/components/dashboard/alerts-panel.tsx`
  - [x] 1.2 Create card with header and alert count badge
  - [x] 1.3 Position in dashboard grid

- [x] **Task 2: Alert Item Component** (AC: #2, #3, #7)
  - [x] 2.1 Create `src/components/dashboard/alert-item.tsx`
  - [x] 2.2 Display icon based on alert type (warning/info)
  - [x] 2.3 Show description text
  - [x] 2.4 Style differently for warning vs info

- [x] **Task 3: Action Buttons** (AC: #4)
  - [x] 3.1 Add "View Leads" button to alert items
  - [x] 3.2 Construct filter URL based on alert type
  - [x] 3.3 Navigate to leads page with filters

- [x] **Task 4: No Alerts State** (AC: #6)
  - [x] 4.1 Create empty/success state component
  - [x] 4.2 Show green checkmark icon
  - [x] 4.3 Display "All clear!" message

- [x] **Task 5: Data Integration** (AC: #2)
  - [x] 5.1 Extract alerts from dashboard API
  - [x] 5.2 Calculate unclaimed >24h count
  - [x] 5.3 Calculate stale contacted >7d count

- [x] **Task 6: Testing** (AC: #1-7)
  - [x] 6.1 Test alerts render correctly
  - [x] 6.2 Test action buttons navigate
  - [x] 6.3 Test no alerts state
  - [x] 6.4 Test badge count

## Dev Notes

### Implementation

```typescript
// src/components/dashboard/alerts-panel.tsx
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { AlertsPanelSkeleton } from './alerts-panel-skeleton';

interface Alert {
  id: string;
  type: 'warning' | 'info';
  message: string;
  count?: number;
  actionUrl?: string;
  actionLabel?: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
  isLoading?: boolean;
}

export function AlertsPanel({ alerts, isLoading }: AlertsPanelProps) {
  const warningCount = alerts.filter(a => a.type === 'warning').length;

  if (isLoading) return <AlertsPanelSkeleton />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Alerts
        </CardTitle>
        {warningCount > 0 && (
          <Badge variant="destructive">{warningCount}</Badge>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 py-4">
            <CheckCircle className="h-5 w-5" />
            <span>All clear! No alerts</span>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const isWarning = alert.type === 'warning';

  return (
    <div className="flex items-start gap-3">
      {isWarning ? (
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
      ) : (
        <Info className="h-4 w-4 text-blue-500 mt-0.5" />
      )}
      <div className="flex-1">
        <p className="text-sm">{alert.message}</p>
        {alert.actionUrl && (
          <Link href={alert.actionUrl}>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
              {alert.actionLabel || 'View'}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
```

### Alert Data Calculation

```typescript
// Calculate alerts from dashboard data
function calculateAlerts(dashboardData: DashboardData): Alert[] {
  const alerts: Alert[] = [];

  // Unclaimed leads > 24h
  if (dashboardData.alerts?.unclaimedOver24h > 0) {
    alerts.push({
      id: 'unclaimed-24h',
      type: 'warning',
      message: `${dashboardData.alerts.unclaimedOver24h} leads ไม่มีคนรับ >24h`,
      actionUrl: '/leads?status=new&ageMin=1440',
      actionLabel: 'View Leads',
    });
  }

  // Contacted but stale > 7 days
  if (dashboardData.alerts?.staleContactedOver7d > 0) {
    alerts.push({
      id: 'stale-contacted',
      type: 'warning',
      message: `${dashboardData.alerts.staleContactedOver7d} leads contacted >7 days`,
      actionUrl: '/leads?status=contacted&ageMin=10080',
      actionLabel: 'View Leads',
    });
  }

  // Campaign ending soon (info)
  if (dashboardData.alerts?.campaignEndingSoon) {
    alerts.push({
      id: 'campaign-ending',
      type: 'info',
      message: `Campaign Q1 ends in 3 days`,
    });
  }

  return alerts;
}
```

### Skeleton Component

```typescript
// src/components/dashboard/alerts-panel-skeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AlertsPanelSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 mt-0.5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### shadcn/ui Components Required

```bash
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add button
```

### Dependencies

- `lucide-react` - Icons (AlertTriangle, CheckCircle, Info)
- `shadcn/ui badge` - Alert count badge
- `shadcn/ui button` - Action buttons
- Story 2-1 should be complete for shared Card/Skeleton patterns

### File Structure

```
src/components/dashboard/
├── alerts-panel.tsx          # Main component + inline AlertItem
└── alerts-panel-skeleton.tsx # Loading skeleton
```

### References

- [Source: docs/admin-dashboard/ux-ui.md#4.2] - Dashboard wireframe
- [Source: docs/admin-dashboard/epics.md#F-02.6] - Alerts Panel feature

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- N/A

### Completion Notes List
- All 7 ACs implemented and tested
- AlertsPanel, AlertItem, AlertsPanelSkeleton components created
- AlertsPanelContainer for API integration
- 34 tests passing (24 unit + 10 container)
- Full test suite: 398 tests passing
- Integrated into dashboard page at Row 4 (alongside RecentActivityContainer)
- Badge shows warning count only (excludes info alerts)
- Warning = amber, Info = blue color scheme
- "All clear!" state with green checkmark

### Code Review Fixes Applied
- Added role="alert" and aria-live="polite" for warning messages (accessibility)
- Fixed invalid nested interactive elements (Button asChild with Link)
- Added aria-labelledby to Card for screen reader navigation
- Added userEvent click/focus tests for AC#4
- Added ARIA attribute tests (3 new tests)
- Changed fragile CSS class assertions to semantic behavior tests

### File List
- `src/components/dashboard/alerts-panel.tsx` - Main panel with badge
- `src/components/dashboard/alert-item.tsx` - Individual alert item
- `src/components/dashboard/alerts-panel-skeleton.tsx` - Loading state
- `src/components/dashboard/alerts-panel-container.tsx` - API integration
- `src/components/dashboard/index.ts` - Updated exports
- `src/__tests__/unit/components/dashboard/alerts-panel.test.tsx` - Unit tests (20)
- `src/__tests__/alerts-panel-container.test.tsx` - Container tests (10)
- `src/app/(dashboard)/dashboard/page.tsx` - Dashboard integration

