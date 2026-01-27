# Story 0-16: Lead Processing Status Monitoring (Admin)

**Status:** Ready for Development
**Priority:** Medium
**Complexity:** Medium (3-5 hours)
**Epic:** Admin Dashboard Enhancement
**Dependencies:** Backend Status API (v1.1.0 Background Processing feature)

---

## Background

Backend มี Status API อยู่แล้วจาก Priority 3 (Background Processing feature v1.1.0) ที่ให้ tracking real-time lead processing status แต่ Admin Dashboard ยังไม่มี UI ให้ Admin ดูสถานะการ process leads แบบ real-time

**ปัญหาปัจจุบัน:**
- Admin ไม่รู้ว่ามี leads กี่ตัวที่กำลัง process อยู่
- ไม่สามารถตรวจจับ bottleneck หรือ processing failures ได้ทันที
- ต้องเข้าไปดู backend logs ซึ่งไม่สะดวกและไม่ real-time
- ไม่มี visibility ว่า background processor ทำงานปกติหรือไม่

**Solution:**
สร้าง Lead Processing Status Card ใน Settings page (admin-only) เพื่อแสดงสถานะการ process leads แบบ real-time พร้อม auto-refresh

---

## User Stories

**As an Admin**, I want to see all active lead processing status in Settings page, so that I can:
- Monitor system load and capacity
- Troubleshoot processing issues quickly
- Verify background processor is working correctly
- Identify bottlenecks or stuck processes

---

## Acceptance Criteria

### AC#1: API Proxy Routes (Critical)
✅ **Given** Admin Dashboard needs to fetch lead status from backend
✅ **When** Admin or user requests lead processing status
✅ **Then** API proxy routes should work correctly:

- [ ] Create `GET /api/leads/status` route (admin-only, requires authentication)
- [ ] Create `GET /api/leads/status/:correlationId` route (public, no auth required)
- [ ] Both routes proxy to backend `http://localhost:3000` with proper error handling
- [ ] Admin route returns 403 Forbidden if user is not admin role
- [ ] Handle backend unreachable (503 Service Unavailable)
- [ ] Handle network timeouts gracefully
- [ ] No caching (`cache: 'no-store'`) - status changes frequently

**API Contract:**

**GET /api/leads/status (Admin Only)**
```typescript
// Response Type
interface AllLeadStatusResponse {
  success: boolean;
  data?: LeadStatusData[];
  total?: number;
  error?: string;
}

interface LeadStatusData {
  correlationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep?: string;
  result?: {
    leadId?: string;
    rowNumber?: number;
    error?: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Example Response
{
  "success": true,
  "data": [
    {
      "correlationId": "uuid-123",
      "status": "processing",
      "progress": 60,
      "currentStep": "Saving to Google Sheets",
      "createdAt": "2026-01-27T10:00:00Z",
      "updatedAt": "2026-01-27T10:00:05Z"
    }
  ],
  "total": 5
}
```

**GET /api/leads/status/:correlationId (Public)**
```typescript
// Response Type
interface LeadStatusResponse {
  success: boolean;
  data?: LeadStatusData;
  error?: string;
}

// Example Response
{
  "success": true,
  "data": {
    "correlationId": "uuid-123",
    "status": "completed",
    "progress": 100,
    "result": {
      "leadId": "lead_550e8400",
      "rowNumber": 42
    },
    "completedAt": "2026-01-27T10:00:10Z"
  }
}
```

---

### AC#2: Lead Status Hooks (Core)
✅ **Given** Components need to fetch lead status data
✅ **When** Hook is called with proper parameters
✅ **Then** Hooks should provide clean data fetching interface:

- [ ] Create `useAllLeadStatus()` hook for admin monitoring
- [ ] Create `useLeadStatus(correlationId)` hook for individual tracking (future use)
- [ ] Auto-refresh every 5 seconds for admin list (`refetchInterval: 5000`)
- [ ] Auto-polling every 2 seconds for individual status while pending/processing
- [ ] Stop polling when status is completed or failed
- [ ] Proper loading state (`isLoading`)
- [ ] Proper error state (`isError`, `error`)
- [ ] Refetch function for manual refresh
- [ ] Convenience flags: `isPending`, `isProcessing`, `isCompleted`, `isFailed`

**Hook Usage Examples:**
```typescript
// Admin monitoring
const { data, total, isLoading, isError, refetch } = useAllLeadStatus();
// data: LeadStatusData[]
// total: number
// Auto-refreshes every 5 seconds

// Individual tracking (future use)
const {
  data,
  isLoading,
  isPending,
  isProcessing,
  isCompleted,
  isFailed,
  refetch
} = useLeadStatus(correlationId, {
  enablePolling: true,
  pollingInterval: 2000
});
// Polls every 2s while pending/processing
// Stops polling when completed/failed
```

---

### AC#3: Lead Processing Status Card (UI)
✅ **Given** Admin visits Settings page
✅ **When** Admin has proper role
✅ **Then** Lead Processing Status Card should display:

- [ ] Card displays in Settings page grid (alongside System Health Card)
- [ ] Admin-only visibility (non-admin users don't see it)
- [ ] Show total active processing count badge (e.g., "5 active")
- [ ] List all active leads with:
  - Correlation ID (truncated with tooltip)
  - Status badge with colors:
    - **Pending**: Gray secondary badge
    - **Processing**: Blue primary badge
    - **Completed**: Green success badge
    - **Failed**: Red destructive badge
  - Progress bar (0-100%)
  - Current step text (e.g., "Saving to Google Sheets")
  - Relative time (e.g., "2 minutes ago")
- [ ] Refresh button with loading spinner when refetching
- [ ] Empty state when no active processing:
  - Icon (e.g., CheckCircle)
  - Message: "No active lead processing"
  - Subtext: "All leads processed successfully"
- [ ] Loading state shows skeleton while fetching
- [ ] Error state with retry button

**Component Structure:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>
      Lead Processing Status
      <Badge>{total} active</Badge>
    </CardTitle>
    <Button onClick={refetch}>
      <RefreshCw className={isRefetching ? 'animate-spin' : ''} />
    </Button>
  </CardHeader>
  <CardContent>
    {/* List of active processing leads */}
  </CardContent>
</Card>
```

---

### AC#4: Error Handling (Non-functional)
✅ **Given** Various error scenarios
✅ **When** Errors occur
✅ **Then** System should handle gracefully:

- [ ] Backend unreachable → Show error message "Unable to fetch processing status" with retry button
- [ ] 403 Forbidden → Should not happen (middleware blocks non-admin at page level)
- [ ] Network timeout → Show error state with retry option
- [ ] Graceful degradation → Card remains functional even if one request fails
- [ ] Error logging → Log errors to console for debugging
- [ ] No crash → Errors don't break entire Settings page

**Error State Pattern (Consistent with System Health Card):**
```typescript
if (isError) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Processing Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Unable to fetch processing status
          </p>
          <Button onClick={refetch} disabled={isRefetching}>
            {isRefetching ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### AC#5: Tests (Quality Gate)
✅ **Given** New code is written
✅ **When** Tests are run
✅ **Then** All tests should pass with proper coverage:

- [ ] API route tests:
  - Admin authentication check (403 for non-admin)
  - Proxy behavior (forwards to backend correctly)
  - Error handling (backend down, timeout)
  - Response format validation
- [ ] Hook tests:
  - `useAllLeadStatus` auto-refresh behavior
  - `useLeadStatus` polling logic (starts/stops correctly)
  - Loading states
  - Error states
  - Refetch function
- [ ] Component tests:
  - Card renders with data
  - Empty state displays correctly
  - Error state with retry button
  - Loading skeleton
  - Status badges have correct colors
  - Refresh button triggers refetch
  - Admin-only visibility (role-based rendering)
- [ ] **Minimum 80% coverage** for new code
- [ ] All existing tests still pass (no regression)

**Test File Structure:**
```
src/
├── app/api/leads/status/
│   ├── route.test.ts (admin list endpoint)
│   └── [correlationId]/route.test.ts (individual endpoint)
├── hooks/
│   └── use-lead-status.test.tsx
└── components/settings/
    └── lead-processing-status-card.test.tsx
```

---

## Technical Approach

### Architecture Pattern
Follow **System Health Card pattern** (Story 7-5) for consistency:
- Same card layout and styling
- Same error handling pattern
- Same loading skeleton approach
- Same admin-only visibility logic

### Data Flow
```
Admin Dashboard (Settings Page)
    ↓
useAllLeadStatus() hook
    ↓
GET /api/leads/status (Next.js API route)
    ↓
Backend Status API (localhost:3000/api/leads/status)
    ↓
In-memory Status Store (no database)
```

### Polling Strategy
- **Admin monitoring**: Auto-refresh every 5 seconds
  - Reason: Admin needs overview, 5s is sufficient
  - Query key: `['all-lead-status']`

- **Individual tracking**: Poll every 2 seconds while active
  - Reason: User waiting for specific lead, needs faster updates
  - Stop polling when `completed` or `failed`
  - Query key: `['lead-status', correlationId]`

### No Database Changes
- Backend Status API uses **in-memory store** (from Priority 3)
- No Leads table modifications needed
- No correlation_id column needed (Phase 1 scope)
- Future Phase 2 can add correlation_id to Leads table for per-lead tracking

### Authentication
- Admin-only via **NextAuth JWT** + `isAdmin(role)` check
- Route handler uses `getToken()` from `next-auth/jwt` to extract Google ID token
- Component uses `useSession()` hook
- Middleware already blocks non-sales/admin at Settings page level

---

## Tasks

### ✅ Task 1: Create API Proxy Routes with Admin Auth
**Owner:** Amelia
**Estimated:** 1 hour

**Subtasks:**
- [ ] Create `src/app/api/leads/status/route.ts` (admin list endpoint)
  - Import `getToken` from `next-auth/jwt`, `isAdmin`
  - Extract JWT token and check admin role → 403 if not admin
  - Get Google ID token from JWT for backend authentication
  - Fetch `${BACKEND_URL}/api/leads/status` with Authorization header
  - Handle errors (backend down, timeout) with AbortController (5s timeout)
  - Return JSON response
- [ ] Create `src/app/api/leads/status/[correlationId]/route.ts` (individual endpoint)
  - No auth required (public)
  - Extract `correlationId` from params
  - Validate correlationId exists
  - Fetch `${BACKEND_URL}/api/leads/status/${correlationId}`
  - Handle errors
  - Return JSON response
- [ ] Test both routes manually with curl/Postman

**Files to Create:**
- `src/app/api/leads/status/route.ts`
- `src/app/api/leads/status/[correlationId]/route.ts`

**Acceptance:**
- Routes respond correctly
- Admin auth works (403 for non-admin)
- Error handling works (backend down returns 503)

---

### ✅ Task 2: Create Hooks (useAllLeadStatus, useLeadStatus)
**Owner:** Amelia
**Estimated:** 1.5 hours

**Subtasks:**
- [ ] Create `src/hooks/use-lead-status.ts`
- [ ] Define TypeScript types:
  - `LeadProcessingStatus` type
  - `LeadStatusData` interface
  - `LeadStatusResponse` interface
  - `AllLeadStatusResponse` interface
  - `UseLeadStatusOptions` interface
- [ ] Implement `fetchAllLeadStatus()` API function
- [ ] Implement `fetchLeadStatus(correlationId)` API function
- [ ] Implement `useAllLeadStatus()` hook:
  - React Query with `queryKey: ['all-lead-status']`
  - `refetchInterval: 5000` (5 seconds)
  - Return data, total, isLoading, isError, refetch
- [ ] Implement `useLeadStatus(correlationId, options)` hook:
  - React Query with `queryKey: ['lead-status', correlationId]`
  - Conditional polling: only if `enablePolling && (pending || processing)`
  - Stop polling when completed/failed
  - Return data, isLoading, isError, isPending, isProcessing, isCompleted, isFailed, refetch
- [ ] Export all hooks and types

**Files to Create:**
- `src/hooks/use-lead-status.ts`

**Acceptance:**
- Hooks compile without TypeScript errors
- Auto-refresh/polling logic works correctly
- All return values properly typed

---

### ✅ Task 3: Create LeadProcessingStatusCard Component
**Owner:** Amelia
**Estimated:** 2 hours

**Subtasks:**
- [ ] Create `src/components/settings/lead-processing-status-card.tsx`
- [ ] Import necessary UI components (Card, Badge, Button, Progress, etc.)
- [ ] Import `useAllLeadStatus()` hook
- [ ] Implement loading state (skeleton similar to System Health)
- [ ] Implement error state with retry button
- [ ] Implement empty state (no active processing)
- [ ] Implement success state:
  - Card header with title and total count badge
  - Refresh button with loading spinner
  - List of active leads:
    - Correlation ID (truncated, with tooltip)
    - Status badge (colored by status)
    - Progress bar
    - Current step text
    - Relative time
- [ ] Add proper data-testid attributes for testing
- [ ] Export component

**Files to Create:**
- `src/components/settings/lead-processing-status-card.tsx`

**UI Requirements:**
- Match System Health Card styling for consistency
- Responsive design (works on mobile)
- Accessible (proper ARIA labels)
- Loading spinner doesn't block UI

**Acceptance:**
- Component renders without errors
- All states display correctly (loading, error, empty, success)
- Refresh button works
- Status badges have correct colors

---

### ✅ Task 4: Add Card to Settings Page (Admin-Only)
**Owner:** Amelia
**Estimated:** 30 minutes

**Subtasks:**
- [ ] Open `src/app/(dashboard)/settings/page.tsx`
- [ ] Import `LeadProcessingStatusCard`
- [ ] Add card to grid (after System Health Card)
- [ ] Wrap with admin-only visibility check:
  ```typescript
  {(isLoading || userIsAdmin) && <LeadProcessingStatusCard />}
  ```
- [ ] Update grid layout if needed (should be 2 columns already)
- [ ] Test in browser (admin sees card, non-admin doesn't)

**Files to Modify:**
- `src/app/(dashboard)/settings/page.tsx`

**Acceptance:**
- Card displays in Settings page
- Only admin users can see it
- Layout looks good (no overflow, proper spacing)

---

### ✅ Task 5: Write Tests (API, Hooks, Component)
**Owner:** Amelia
**Estimated:** 2 hours

**Subtasks:**
- [ ] Create `src/app/api/leads/status/route.test.ts`:
  - Test admin auth (403 for non-admin)
  - Test successful fetch
  - Test backend error handling
  - Test timeout handling
- [ ] Create `src/app/api/leads/status/[correlationId]/route.test.ts`:
  - Test successful fetch
  - Test invalid correlationId
  - Test backend error handling
- [ ] Create `src/hooks/use-lead-status.test.tsx`:
  - Test `useAllLeadStatus` auto-refresh
  - Test `useLeadStatus` polling (starts/stops)
  - Test loading states
  - Test error states
  - Test refetch function
- [ ] Create `src/components/settings/lead-processing-status-card.test.tsx`:
  - Test loading skeleton
  - Test error state with retry
  - Test empty state
  - Test success state with data
  - Test refresh button
  - Test status badge colors
  - Test admin-only rendering
- [ ] Run coverage report: `npm run test:coverage`
- [ ] Verify 80%+ coverage for new code

**Files to Create:**
- `src/app/api/leads/status/route.test.ts`
- `src/app/api/leads/status/[correlationId]/route.test.ts`
- `src/hooks/use-lead-status.test.tsx`
- `src/components/settings/lead-processing-status-card.test.tsx`

**Test Pattern:**
Follow existing test patterns from System Health tests.

**Acceptance:**
- All tests pass (npm test)
- Coverage ≥ 80% for new code
- No test warnings or errors

---

### ✅ Task 6: Rex Code Review [RV]
**Owner:** Rex (Code Reviewer)
**Estimated:** 1 hour

**Review Checklist:**
- [ ] All AC met (1-5)
- [ ] Code quality (no bugs, security issues)
- [ ] Tests comprehensive (edge cases covered)
- [ ] TypeScript types correct
- [ ] Error handling robust
- [ ] UI/UX matches design
- [ ] Performance acceptable (no unnecessary re-renders)
- [ ] Accessibility (ARIA, keyboard navigation)
- [ ] Documentation/comments clear

**Review Command:**
```bash
/bmad:bmm:agents:code-reviewer
# Select [RV] Full Review
```

**Verdict Options:**
- ✅ **APPROVED** → Merge to main
- ⚠️ **CHANGES_REQUESTED** → Amelia fix → Rex review again
- ❌ **BLOCKED** → Critical issues, must fix

**Acceptance:**
- Rex gives **APPROVED** verdict
- No CHANGES_REQUESTED or BLOCKED issues remaining

---

## Architecture Considerations

### Performance
- **Auto-refresh interval**: 5s for admin list is optimal
  - Too fast (< 3s): Unnecessary backend load
  - Too slow (> 10s): Admin sees stale data
- **Polling for individual**: 2s while active, stop when done
  - Provides real-time feel for users waiting for specific lead

### Cache Strategy
- **No frontend caching** (`cache: 'no-store'`)
  - Status changes frequently (every second during processing)
  - Backend already has in-memory store (no DB queries)
  - React Query handles memory caching automatically
- **Backend TTL**: 5 minutes for completed/failed (from Priority 3)

### Error Boundary
- Component has internal error handling (try-catch)
- Errors don't crash entire Settings page
- User can retry failed requests manually
- Consistent with System Health Card error pattern

### Future Evolution (Phase 2 - Not in Scope)
When we want per-lead status tracking in Leads table:
1. Add `correlation_id` column to Leads table (Supabase migration)
2. Store `correlation_id` when webhook creates lead
3. Add status badge to Leads table row
4. Click badge → Modal with `useLeadStatus(correlationId)`
5. Show progress bar in modal

**Don't implement Phase 2 now**, but hooks are designed to support it.

---

## Definition of Done

- [ ] All 5 Acceptance Criteria met
- [ ] All 6 Tasks completed
- [ ] Tests pass with ≥80% coverage
- [ ] Rex code review **APPROVED**
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Feature works in browser (manual testing)
- [ ] Documentation updated (if needed)

---

## References

- **Backend Status API**: `src/routes/lead-status.routes.ts` (Priority 3)
- **System Health Card**: `src/components/settings/system-health-card.tsx` (Story 7-5)
- **Settings Page**: `src/app/(dashboard)/settings/page.tsx`
- **Background Processing**: ARCHITECTURE.md (v1.1.0 feature)

---

## Notes

- This is **Phase 1**: Admin monitoring only
- **Phase 2** (future): Per-lead tracking in Leads table
- Pattern follows System Health Card (Story 7-5) for consistency
- No database changes needed (uses in-memory store)
- Auto-refresh keeps data fresh without user interaction

---

**Story Status:** ✅ Ready for Development
**Next Step:** `/bmad:bmm:agents:dev` → Implement tasks 1-5 → `/bmad:bmm:agents:code-reviewer` [RV]
