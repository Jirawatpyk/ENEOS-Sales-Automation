# Story 7.5: System Health

Status: done

## Story

As an **ENEOS dashboard admin**,
I want **to view the health status of all backend services on the settings page**,
so that **I can monitor system availability and quickly identify any service issues**.

## Acceptance Criteria

1. **AC1: System Health Card**
   - Given I am logged in as admin
   - When I navigate to `/settings`
   - Then I see a "System Health" card alongside Profile and Session cards
   - And the card shows overall system status (Healthy / Degraded / Unhealthy)

2. **AC2: Service Status Display**
   - Given I view the System Health card
   - When the health data loads
   - Then I see status for each service:
     - Google Sheets: Up/Down with latency (ms)
     - Gemini AI: Up/Down with latency (ms)
     - LINE API: Up/Down with latency (ms)
   - And "Up" shows green indicator, "Down" shows red indicator

3. **AC3: Last Check Timestamp**
   - Given I view the System Health card
   - When the data is displayed
   - Then I see when the health check was last performed
   - And it shows relative time (e.g., "2 minutes ago")

4. **AC4: Refresh Health Check**
   - Given I view the System Health card
   - When I click the "Refresh" button
   - Then a fresh health check is triggered (bypass cache)
   - And the loading indicator shows while fetching
   - And the data updates with latest status

5. **AC5: System Metrics Summary**
   - Given I view the System Health card
   - When the health data loads
   - Then I see key system metrics displayed inline:
     - API Version (from `/health` response)
     - Server Uptime (from `/live` endpoint, formatted)
     - Last Check timestamp
   - And the metrics are displayed in the card footer section

6. **AC6: Error State Handling**
   - Given the health check fails
   - When displaying the System Health card
   - Then I see an error message: "Unable to fetch health status"
   - And a "Retry" button is available
   - And individual service statuses show "Unknown"

7. **AC7: Admin Only Access**
   - Given I am logged in with "viewer" role
   - When I view the Settings page
   - Then I do NOT see the System Health card
   - And system health is only visible to admins

8. **AC8: Loading State**
   - Given I navigate to the Settings page
   - When the health data is loading
   - Then I see a skeleton loader for the System Health card
   - And it matches the layout of the loaded state

## Tasks / Subtasks

- [x] **Task 1: System Health Card Component** (AC: #1, #2, #3)
  - [x] 1.1 Create `src/components/settings/system-health-card.tsx`
  - [x] 1.2 Display overall status badge (Healthy = green, Degraded = yellow, Unhealthy = red)
  - [x] 1.3 List each service with status indicator and latency
  - [x] 1.4 Show last check timestamp with relative time formatting
  - [x] 1.5 Use shadcn/ui Card, Badge components

- [x] **Task 2: Health API Hook** (AC: #1, #4, #6)
  - [x] 2.1 Create `src/hooks/use-system-health.ts`
  - [x] 2.2 Fetch from `/health` endpoint (admin API)
  - [x] 2.3 Implement refresh function for `/health/refresh` endpoint
  - [x] 2.4 Handle loading, error, and success states
  - [x] 2.5 Use React Query with appropriate stale time

- [x] **Task 3: Service Status Indicators** (AC: #2)
  - [x] 3.1 Create ServiceStatusRow component for each service
  - [x] 3.2 Green dot/badge for "up" status
  - [x] 3.3 Red dot/badge for "down" status
  - [x] 3.4 Display latency in milliseconds
  - [x] 3.5 Gray indicator for "unknown" status

- [x] **Task 4: Refresh Button** (AC: #4)
  - [x] 4.1 Add refresh button with RefreshCw icon
  - [x] 4.2 Call `/health/refresh` endpoint on click
  - [x] 4.3 Show loading spinner while refreshing
  - [x] 4.4 Disable button during refresh
  - [x] 4.5 Update display with fresh data

- [x] **Task 5: Metrics Summary Section** (AC: #5)
  - [x] 5.1 Display API version from `/health` response
  - [x] 5.2 Fetch server uptime from `/live` endpoint
  - [x] 5.3 Format uptime (e.g., "2d 5h 30m" or "5 hours")
  - [x] 5.4 Display last check timestamp with relative time
  - [x] 5.5 Show all metrics in card footer section (inline, not collapsible)

- [x] **Task 6: Loading & Error States** (AC: #6, #8)
  - [x] 6.1 Create `src/components/settings/system-health-skeleton.tsx`
  - [x] 6.2 Implement error state with retry button
  - [x] 6.3 Handle network failures gracefully
  - [x] 6.4 Show appropriate fallback UI

- [x] **Task 7: Settings Page Integration** (AC: #1, #7)
  - [x] 7.1 Add SystemHealthCard to Settings page
  - [x] 7.2 Conditionally render for admin role only
  - [x] 7.3 Position in the grid layout (3rd card)
  - [x] 7.4 Update grid from 2-col to responsive 3-col for desktop

- [x] **Task 8: API Proxy Routes** (AC: #1, #4, #5)
  - [x] 8.1 Create `src/app/api/health/route.ts` (proxy to backend /health)
  - [x] 8.2 Create `src/app/api/health/refresh/route.ts` (proxy to backend /health/refresh)
  - [x] 8.3 Create `src/app/api/live/route.ts` (proxy to backend /live for uptime)
  - [x] 8.4 Handle backend unreachable error gracefully (503 response)
  - [x] 8.5 BACKEND_URL uses existing NEXT_PUBLIC_API_URL (no new env var needed)

- [x] **Task 9: Testing** (AC: All)
  - [x] 9.1 Test health card renders with mock data
  - [x] 9.2 Test service status indicators (up/down)
  - [x] 9.3 Test refresh button triggers API call
  - [x] 9.4 Test loading skeleton displays
  - [x] 9.5 Test error state with retry
  - [x] 9.6 Test admin-only visibility (viewer should NOT see card)

## Dev Notes

### Architecture Compliance

This story uses the existing backend health endpoints:
- `GET /health` - Cached health check (30s TTL)
- `GET /health/refresh` - Force fresh health check (bypass cache)
- `GET /metrics/summary` - Human-readable metrics JSON

### API Response Structures

```typescript
// GET /health response
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;  // ISO 8601
  version: string;
  services: {
    googleSheets: {
      status: 'up' | 'down';
      latency: number;  // milliseconds
    };
    geminiAI: {
      status: 'up' | 'down';
      latency: number;
    };
    lineAPI: {
      status: 'up' | 'down';
      latency: number;
    };
  };
}

// GET /health/refresh response (same as above + refreshed: true)
interface HealthRefreshResponse extends HealthCheckResponse {
  refreshed: boolean;
}

// GET /live response
interface LiveResponse {
  alive: boolean;
  uptime: number;  // seconds
}
```

### Component Structure

```
src/
├── app/(dashboard)/settings/
│   └── page.tsx                      # Update: Add SystemHealthCard
├── components/settings/
│   ├── system-health-card.tsx        # Main health display
│   ├── system-health-skeleton.tsx    # Loading state
│   ├── service-status-row.tsx        # Individual service row
│   └── index.ts                      # Update barrel export
└── hooks/
    └── use-system-health.ts          # Health API hook
```

### System Health Card Component

```typescript
// src/components/settings/system-health-card.tsx
'use client';

import { RefreshCw, Activity, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSystemHealth, formatUptime } from '@/hooks/use-system-health';
import { SystemHealthSkeleton } from './system-health-skeleton';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

interface ServiceStatusRowProps {
  name: string;
  status: 'up' | 'down' | 'unknown';
  latency?: number;
}

function ServiceStatusRow({ name, status, latency }: ServiceStatusRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {status === 'up' && <CheckCircle className="h-4 w-4 text-green-500" />}
        {status === 'down' && <XCircle className="h-4 w-4 text-red-500" />}
        {status === 'unknown' && <AlertCircle className="h-4 w-4 text-gray-400" />}
        <span className="text-sm">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        {latency !== undefined && (
          <span className="text-xs text-muted-foreground">{latency}ms</span>
        )}
        <Badge
          variant={status === 'up' ? 'default' : status === 'down' ? 'destructive' : 'secondary'}
          className="text-xs"
        >
          {status === 'up' ? 'Up' : status === 'down' ? 'Down' : 'Unknown'}
        </Badge>
      </div>
    </div>
  );
}

export function SystemHealthCard() {
  const { data, isLoading, isError, refetch, isRefetching } = useSystemHealth();

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500">Degraded</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return <SystemHealthSkeleton />;
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Unable to fetch health status
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Overall Status</span>
          {getStatusBadge(data?.status)}
        </div>

        {/* Services */}
        <div className="border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Services</p>
          <ServiceStatusRow
            name="Google Sheets"
            status={data?.services?.googleSheets?.status || 'unknown'}
            latency={data?.services?.googleSheets?.latency}
          />
          <ServiceStatusRow
            name="Gemini AI"
            status={data?.services?.geminiAI?.status || 'unknown'}
            latency={data?.services?.geminiAI?.latency}
          />
          <ServiceStatusRow
            name="LINE API"
            status={data?.services?.lineAPI?.status || 'unknown'}
            latency={data?.services?.lineAPI?.latency}
          />
        </div>

        {/* Metadata - Inline metrics display (AC5) */}
        <div className="border-t pt-4 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Version</span>
            <span>{data?.version || '-'}</span>
          </div>
          {data?.uptime !== undefined && (
            <div className="flex justify-between mt-1">
              <span>Uptime</span>
              <span>{formatUptime(data.uptime)}</span>
            </div>
          )}
          {data?.timestamp && (
            <div className="flex justify-between mt-1">
              <span>Last Check</span>
              <span>
                {formatDistanceToNow(new Date(data.timestamp), {
                  addSuffix: true,
                  locale: th,
                })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Health API Hook

```typescript
// src/hooks/use-system-health.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ServiceHealth {
  status: 'up' | 'down';
  latency: number;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    googleSheets: ServiceHealth;
    geminiAI: ServiceHealth;
    lineAPI: ServiceHealth;
  };
  refreshed?: boolean;
}

interface LiveResponse {
  alive: boolean;
  uptime: number; // seconds
}

interface SystemHealthData extends HealthCheckResponse {
  uptime?: number; // seconds from /live endpoint
}

// Format uptime seconds to human-readable string
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(' ');
}

export function useSystemHealth() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['system-health'],
    queryFn: async (): Promise<SystemHealthData> => {
      // Fetch both /health and /live in parallel
      const [healthRes, liveRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/live').catch(() => null), // /live is optional
      ]);

      if (!healthRes.ok) {
        throw new Error('Health check failed');
      }

      const healthData: HealthCheckResponse = await healthRes.json();
      let uptime: number | undefined;

      if (liveRes?.ok) {
        const liveData: LiveResponse = await liveRes.json();
        uptime = liveData.uptime;
      }

      return { ...healthData, uptime };
    },
    staleTime: 30 * 1000, // 30 seconds (matches backend cache TTL)
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
    retry: 1, // Only retry once on failure
  });

  const refresh = async () => {
    // Force refresh bypassing cache
    const [healthRes, liveRes] = await Promise.all([
      fetch('/api/health/refresh'),
      fetch('/api/live').catch(() => null),
    ]);

    if (!healthRes.ok) {
      throw new Error('Health refresh failed');
    }

    const healthData = await healthRes.json();
    let uptime: number | undefined;

    if (liveRes?.ok) {
      const liveData = await liveRes.json();
      uptime = liveData.uptime;
    }

    const data = { ...healthData, uptime };
    queryClient.setQueryData(['system-health'], data);
    return data;
  };

  return {
    ...query,
    refresh,
  };
}
```

### Settings Page Update

```typescript
// src/app/(dashboard)/settings/page.tsx - Update
'use client';

import { useSession } from 'next-auth/react';
import { ProfileCard } from '@/components/settings/profile-card';
import { ProfileCardSkeleton } from '@/components/settings/profile-card-skeleton';
import { SessionCard } from '@/components/settings/session-card';
import { SessionCardSkeleton } from '@/components/settings/session-card-skeleton';
import { SystemHealthCard } from '@/components/settings/system-health-card';
import { SystemHealthSkeleton } from '@/components/settings/system-health-skeleton';
import { ROLES } from '@/config/roles';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const isAdmin = session?.user?.role === ROLES.ADMIN;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Responsive grid: 2 cols for viewer, 3 cols for admin on lg+ */}
      <div className={`grid gap-6 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-3' : ''}`}>
        {isLoading ? (
          <>
            <ProfileCardSkeleton />
            <SessionCardSkeleton />
            {isAdmin && <SystemHealthSkeleton />}
          </>
        ) : (
          <>
            <ProfileCard />
            <SessionCard />
            {isAdmin && <SystemHealthCard />}
          </>
        )}
      </div>
    </div>
  );
}
```

### Backend API Proxy Route (if needed)

The frontend needs to call the backend health endpoint. Since the backend runs on a different port/origin, you may need to proxy through Next.js API route:

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      next: { revalidate: 30 }, // Cache for 30 seconds
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Backend unreachable' },
      { status: 503 }
    );
  }
}
```

```typescript
// src/app/api/health/refresh/route.ts
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/health/refresh`, {
      cache: 'no-store', // Always fresh
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Backend unreachable' },
      { status: 503 }
    );
  }
}
```

### Skeleton Component

```typescript
// src/components/settings/system-health-skeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SystemHealthSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>

        {/* Services */}
        <div className="border-t pt-4 space-y-3">
          <Skeleton className="h-3 w-16" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* Metadata - 3 rows: Version, Uptime, Last Check */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Testing Strategy

```typescript
// src/__tests__/settings/system-health-card.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SystemHealthCard } from '@/components/settings/system-health-card';

const mockHealthData = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  uptime: 90061, // 1d 1h 1m (for testing formatUptime)
  services: {
    googleSheets: { status: 'up', latency: 45 },
    geminiAI: { status: 'up', latency: 120 },
    lineAPI: { status: 'up', latency: 30 },
  },
};

// Mock fetch using vi.fn() (Vitest pattern per project-context.md)
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('SystemHealthCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHealthData),
    });
  });

  it('renders health status when data loads', async () => {
    render(<SystemHealthCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('System Health')).toBeInTheDocument();
    });

    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Google Sheets')).toBeInTheDocument();
    expect(screen.getByText('45ms')).toBeInTheDocument();
  });

  it('displays uptime using formatUptime helper', async () => {
    render(<SystemHealthCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      // 90061 seconds = 1d 1h 1m
      expect(screen.getByText('1d 1h 1m')).toBeInTheDocument();
    });
  });

  it('shows service status indicators', async () => {
    render(<SystemHealthCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText('Up')).toHaveLength(3);
    });
  });

  it('handles refresh button click', async () => {
    render(<SystemHealthCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('System Health')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button');
    fireEvent.click(refreshButton);

    expect(mockFetch).toHaveBeenCalledWith('/api/health/refresh');
  });

  it('shows error state when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<SystemHealthCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Unable to fetch health status')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows degraded status badge', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ...mockHealthData,
        status: 'degraded',
        services: {
          ...mockHealthData.services,
          geminiAI: { status: 'down', latency: 0 },
        },
      }),
    });

    render(<SystemHealthCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Degraded')).toBeInTheDocument();
      expect(screen.getByText('Down')).toBeInTheDocument();
    });
  });
});

// src/__tests__/settings/settings-page-admin.test.tsx
// Test admin-only visibility (Task 9.6)
import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import SettingsPage from '@/app/(dashboard)/settings/page';

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

vi.mock('@/hooks/use-system-health', () => ({
  useSystemHealth: vi.fn(() => ({
    data: { status: 'healthy' },
    isLoading: false,
    isError: false,
  })),
}));

describe('SettingsPage admin-only features', () => {
  it('shows System Health card for admin users', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { role: 'admin', name: 'Admin', email: 'admin@eneos.co.th' } },
      status: 'authenticated',
    } as any);

    render(<SettingsPage />);
    expect(screen.getByText('System Health')).toBeInTheDocument();
  });

  it('hides System Health card for viewer users', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { role: 'viewer', name: 'Viewer', email: 'viewer@eneos.co.th' } },
      status: 'authenticated',
    } as any);

    render(<SettingsPage />);
    expect(screen.queryByText('System Health')).not.toBeInTheDocument();
  });
});
```

### Dependencies

- Story 7-1 (User Profile) - Settings page foundation
- Backend health endpoints (`/health`, `/health/refresh`)
- shadcn/ui Card, Badge, Button components
- date-fns for relative time formatting
- React Query for data fetching

### Package Installation

```bash
# date-fns for time formatting (if not already installed)
npm install date-fns
```

### Project Structure Notes

**Alignment with unified project structure:**
- Component in `src/components/settings/` (feature-based)
- Hook in `src/hooks/` (standard pattern)
- API proxy in `src/app/api/health/` (Next.js API routes)

**No conflicts detected** with existing patterns.

### Out of Scope

- Detailed error logs display (use /dlq endpoint separately)
- Historical health data / uptime graphs
- Alert notifications for service outages
- Database connection pool monitoring
- Request/response metrics visualization

### Known Considerations

1. **CORS**: Backend health endpoints may need CORS headers for direct frontend access, or use Next.js API proxy
2. **Cache Coordination**: Frontend staleTime should match backend HEALTH_CACHE_TTL_MS (30s)
3. **Admin Only**: System health should only be visible to admins (security)
4. **Mobile Layout**: Grid should stack to single column on mobile

### References

- [Source: src/app.ts#178-232] - Backend health endpoints
- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#F-07.5] - Feature definition
- [Source: _bmad-output/implementation-artifacts/stories/7-1-user-profile.md] - Settings page pattern
- [Source: _bmad-output/project-context.md] - Coding standards

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **API Proxy Routes**: Used existing `NEXT_PUBLIC_API_URL` environment variable instead of creating new `BACKEND_URL` - already configured in `.env.example`
2. **formatUptime Function**: Omits zero values when there are larger units (e.g., "1h" instead of "1h 0m") for cleaner display
3. **Admin-Only Visibility**: System Health card only renders after session loads and user is confirmed as admin - no skeleton shown during initial page load to avoid showing UI to non-admins
4. **Grid Layout**: Admin users see 3-column grid on desktop (`lg:grid-cols-3`), viewers see 2-column grid
5. **Error Handling**: Both health and live endpoints handle failures gracefully with appropriate fallback states
6. **Test Coverage**: 61 new tests added covering all acceptance criteria, all 1918 frontend tests pass

### Code Review Fixes (Post-Implementation)

**Issues Fixed from Adversarial Code Review:**

1. **Issue #1 - Unhandled refetch error** (`system-health-card.tsx:141-150`): Added catch block in `handleRefresh` to silently handle errors - user sees error state on next render
2. **Issue #2 - DRY violation** (`use-system-health.ts:79-114`): Extracted shared `fetchHealthData()` function to avoid duplicate code between `fetchSystemHealth` and `refreshSystemHealth`
3. **Issue #5 - Missing aria-label** (`system-health-card.tsx:215`): Added `aria-label="Refresh health status"` for accessibility
4. **Issue #6 - Redundant catch-rethrow** (`use-system-health.ts:131-134`): Removed unnecessary try-catch wrapper in refetch function

**Auth Token Error Fix (Production Bug):**

Error: `Google OAuth token verification failed: Wrong number of segments in token: undefined`

Root cause: When Google ID token expired and refresh failed, `idToken` became `undefined` and was sent as `"Bearer undefined"` to backend.

Files fixed:
- `src/lib/auth.ts:55-60` - Added guard check for undefined/invalid idToken in `fetchRoleFromBackend()`
- `src/lib/auth.ts:230-237` - Exposed `session.error` when token refresh fails
- `src/app/api/admin/me/route.ts:39-48` - Added guard check + warning log for invalid token
- `src/types/next-auth.d.ts:16` - Added `error?: string` to Session type
- `src/components/shared/session-warning.tsx:22-40` - Auto-redirect to login when session error detected (shows toast + signOut)

**Auth Bug Fix - Second Code Review (2026-01-20):**

Issues fixed from adversarial code review of Auth Error fix:
1. **Issue #1 (HIGH)**: Added 4 tests for session.error handling in session-warning.test.tsx
2. **Issue #2 (MEDIUM)**: Added signOut mock to test file
3. **Issue #3 (MEDIUM)**: Extracted magic number 2000ms to `SIGNOUT_DELAY_MS` constant
4. **Issue #4 (LOW)**: Made error messages consistent across API routes
5. **Issue #5 (LOW)**: Used consistent `[Auth]` console prefix

Test count: 1918 → 1922 (+4 new session.error tests)

### File List

**New Files (Frontend: eneos-admin-dashboard)**
- `src/app/api/health/route.ts` - Proxy to backend /health endpoint
- `src/app/api/health/refresh/route.ts` - Proxy to backend /health/refresh endpoint
- `src/app/api/live/route.ts` - Proxy to backend /live endpoint
- `src/components/settings/system-health-card.tsx` - Main System Health card component
- `src/components/settings/system-health-skeleton.tsx` - Loading skeleton component
- `src/hooks/use-system-health.ts` - React Query hook for health data
- `src/__tests__/settings/system-health-card.test.tsx` - Component tests (27 tests)
- `src/__tests__/settings/system-health-skeleton.test.tsx` - Skeleton tests (7 tests)
- `src/__tests__/hooks/use-system-health.test.tsx` - Hook tests (13 tests)

**Modified Files (Frontend: eneos-admin-dashboard)**
- `src/app/(dashboard)/settings/page.tsx` - Added SystemHealthCard for admin users
- `src/components/settings/index.ts` - Added barrel exports for new components
- `src/hooks/index.ts` - Added barrel exports for new hook
- `src/__tests__/settings/settings-page.test.tsx` - Added admin-only visibility tests
- `src/__tests__/pages/settings.test.tsx` - Added mock for SystemHealthCard

**Additional Modified Files (Code Review + Auth Bug Fix)**
- `src/components/settings/system-health-card.tsx` - Fixed error handling, added aria-label
- `src/hooks/use-system-health.ts` - DRY refactor, removed redundant catch
- `src/lib/auth.ts` - Added idToken guard, exposed session.error
- `src/app/api/admin/me/route.ts` - Added idToken validation guard, consistent error message/prefix
- `src/types/next-auth.d.ts` - Added error field to Session type
- `src/components/shared/session-warning.tsx` - Added session error handling with auto-redirect, extracted SIGNOUT_DELAY_MS constant
- `src/__tests__/session-warning.test.tsx` - Added 4 tests for session.error handling, added signOut mock

