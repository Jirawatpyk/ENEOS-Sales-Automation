# Story 2.8: Auto Refresh

Status: ready-for-dev

## Story

As an **ENEOS manager**,
I want **the dashboard to automatically refresh data periodically**,
so that **I always see the latest information without manually refreshing**.

## Acceptance Criteria

1. **AC1: Auto Refresh Toggle**
   - Given I am on the dashboard
   - When the page loads
   - Then I see an auto-refresh toggle in the header
   - And auto-refresh is OFF by default

2. **AC2: Refresh Interval**
   - Given auto-refresh is enabled
   - When the interval elapses
   - Then dashboard data refreshes every 30 seconds
   - And the refresh happens silently in the background

3. **AC3: Visual Indicator**
   - Given auto-refresh is enabled
   - When active
   - Then I see a spinning indicator or "Auto-refresh: ON" badge
   - And a countdown to next refresh is optionally shown

4. **AC4: Manual Refresh Button**
   - Given I want to refresh immediately
   - When I click the refresh button
   - Then data reloads immediately
   - And I see a brief loading indicator

5. **AC5: Last Updated Timestamp**
   - Given the dashboard has loaded data
   - When displayed
   - Then I see "Last updated: X seconds/minutes ago"
   - And this updates in real-time

6. **AC6: Pause on Tab Inactive**
   - Given auto-refresh is enabled
   - When I switch to another browser tab
   - Then auto-refresh pauses to save resources
   - And resumes when I return to the tab

7. **AC7: Error Recovery**
   - Given auto-refresh encounters an error
   - When the refresh fails
   - Then the error is logged (not shown to user unless persistent)
   - And refresh retries on next interval

## Tasks / Subtasks

- [ ] **Task 1: Auto Refresh Toggle** (AC: #1)
  - [ ] 1.1 Create `src/components/dashboard/auto-refresh-toggle.tsx`
  - [ ] 1.2 Use shadcn/ui Switch component
  - [ ] 1.3 Store preference in localStorage
  - [ ] 1.4 Default to OFF

- [ ] **Task 2: Refresh Logic** (AC: #2, #6)
  - [ ] 2.1 Create `useAutoRefresh` hook
  - [ ] 2.2 Set up 30-second interval when enabled
  - [ ] 2.3 Use TanStack Query `refetch` function
  - [ ] 2.4 Implement visibility change listener for tab focus

- [ ] **Task 3: Visual Indicators** (AC: #3, #5)
  - [ ] 3.1 Add spinning indicator when enabled
  - [ ] 3.2 Show countdown timer (optional)
  - [ ] 3.3 Display "Last updated" timestamp
  - [ ] 3.4 Update timestamp in real-time

- [ ] **Task 4: Manual Refresh** (AC: #4)
  - [ ] 4.1 Add refresh button icon
  - [ ] 4.2 Trigger immediate data refetch
  - [ ] 4.3 Show brief loading spinner on button

- [ ] **Task 5: Error Handling** (AC: #7)
  - [ ] 5.1 Catch refresh errors silently
  - [ ] 5.2 Log to console/monitoring
  - [ ] 5.3 Show error only if multiple failures
  - [ ] 5.4 Continue retrying on interval

- [ ] **Task 6: Testing** (AC: #1-7)
  - [ ] 6.1 Test toggle works
  - [ ] 6.2 Test data refreshes at interval
  - [ ] 6.3 Test manual refresh
  - [ ] 6.4 Test tab visibility pause
  - [ ] 6.5 Test error recovery

## Dev Notes

### Implementation

```typescript
// src/components/dashboard/auto-refresh-toggle.tsx
'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoRefreshToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  isRefreshing?: boolean;
}

export function AutoRefreshToggle({ enabled, onToggle, isRefreshing }: AutoRefreshToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <RefreshCw className={cn(
        "h-4 w-4",
        enabled && isRefreshing && "animate-spin"
      )} />
      <Switch
        id="auto-refresh"
        checked={enabled}
        onCheckedChange={onToggle}
      />
      <Label htmlFor="auto-refresh" className="text-sm">
        Auto-refresh
      </Label>
    </div>
  );
}
```

### Auto Refresh Hook

```typescript
// src/hooks/use-auto-refresh.ts
import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const REFRESH_INTERVAL = 30 * 1000; // 30 seconds

export function useAutoRefresh(queryKey: string[]) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dashboard-auto-refresh');
    if (stored === 'true') setEnabled(true);
  }, []);

  // Save preference to localStorage
  const toggleEnabled = useCallback((value: boolean) => {
    setEnabled(value);
    localStorage.setItem('dashboard-auto-refresh', value.toString());
  }, []);

  // Manual refresh
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, queryKey]);

  // Auto refresh interval
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      // Check if tab is visible
      if (document.visibilityState === 'visible') {
        refresh();
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, refresh]);

  // Pause/resume on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        // Refresh immediately when returning to tab
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, refresh]);

  return {
    enabled,
    toggleEnabled,
    refresh,
    isRefreshing,
    lastUpdated,
  };
}
```

### Last Updated Display

```typescript
// src/components/dashboard/last-updated.tsx
'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface LastUpdatedProps {
  timestamp: Date;
}

export function LastUpdated({ timestamp }: LastUpdatedProps) {
  const [, setTick] = useState(0);

  // Force re-render every 10 seconds to update relative time
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs text-muted-foreground">
      Last updated: {formatDistanceToNow(timestamp, { addSuffix: true })}
    </span>
  );
}
```

### Manual Refresh Button

```typescript
// src/components/dashboard/refresh-button.tsx
'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onClick: () => void;
  isRefreshing: boolean;
}

export function RefreshButton({ onClick, isRefreshing }: RefreshButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={isRefreshing}
    >
      <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
    </Button>
  );
}
```

### Dashboard Header Integration

```typescript
// In dashboard header component
<div className="flex items-center gap-4">
  <LastUpdated timestamp={lastUpdated} />
  <RefreshButton onClick={refresh} isRefreshing={isRefreshing} />
  <AutoRefreshToggle
    enabled={autoRefreshEnabled}
    onToggle={toggleAutoRefresh}
    isRefreshing={isRefreshing}
  />
  <DateFilter />
</div>
```

### shadcn/ui Components Required

```bash
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add label
npx shadcn-ui@latest add button
```

### Dependencies

- `date-fns` - formatDistanceToNow for "Last updated" display
- `lucide-react` - Icons (RefreshCw)
- `@tanstack/react-query` - useQueryClient for cache invalidation
- Story 2-1 should be complete for shared Card/Button patterns

### File Structure

```
src/
├── components/dashboard/
│   ├── auto-refresh-toggle.tsx  # Toggle switch component
│   ├── refresh-button.tsx       # Manual refresh button
│   └── last-updated.tsx         # Timestamp display
├── hooks/
│   └── use-auto-refresh.ts      # Auto refresh logic hook
└── config/
    └── dashboard.ts             # Dashboard configuration
```

### Configuration

```typescript
// src/config/dashboard.ts
export const DASHBOARD_CONFIG = {
  autoRefreshInterval: 30 * 1000, // 30 seconds
  autoRefreshDefault: false,
};
```

### References

- [Source: docs/admin-dashboard/epics.md#F-02.8] - Auto Refresh feature
- [Source: docs/admin-dashboard/technical-design.md#8] - Data fetching patterns

## Dev Agent Record

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

