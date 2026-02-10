# Story 9.6: Frontend Type Updates (Admin Dashboard)

Status: done

## Story

As a **developer**,
I want **Dashboard TypeScript types updated for UUID-based lead IDs and new campaign timeline fields**,
So that **Dashboard compiles and works correctly with the Supabase-backed Backend API responses**.

## Acceptance Criteria

1. **AC1:** Dashboard TypeScript compiles without errors (`npm run build` succeeds).
2. **AC2:** Lead detail page works with UUID-based lead IDs — clicking any lead in the table opens its detail sheet with correct data.
3. **AC3:** All existing Dashboard tests pass (`npm test` succeeds).
4. **AC4:** No functional changes — display and behavior identical to pre-migration.

## Tasks / Subtasks

### Part A: Backend API Updates (expose UUID in responses)

- [x] Task 1: Add `leadUuid` to backend API response types (AC: #1, #2)
  - [x] 1.1: Add `leadUuid: string` field to `LeadItem` type in `src/types/admin.types.ts` (after `fullAddress`)
  - [x] 1.2: Add `leadUuid: string` field to `LeadDetailResponse` type in `src/types/admin.types.ts` (after `row`)
  - [x] 1.3: Update `leadRowToLeadItem()` in `src/controllers/admin/helpers/transform.helpers.ts` to include `leadUuid: lead.leadUUID || ''`
  - [x] 1.4: Update `getLeadById()` controller in `src/controllers/admin/leads.controller.ts` to include `leadUuid: supabaseLead.id` in the response object
  - [x] 1.5: Update `leadRowToActivityItem()` in transform.helpers.ts — add `leadUuid: lead.leadUUID || ''` and fix `id: `act_${lead.leadUUID || lead.rowNumber}``
  - [x] 1.6: Update `ActivityItem` type in `src/types/admin.types.ts` to include `leadUuid: string`
  - [x] 1.7: Update **inline** `ActivityItem` creation in `src/controllers/admin/dashboard.controller.ts:156-173` — this code does NOT call `leadRowToActivityItem()`, it builds ActivityItem inline. Must add `leadUuid: lead.leadUUID || ''` and fix `id: `act_${lead.leadUUID || lead.rowNumber}`` here too

- [x] Task 2: Update backend tests for new UUID field (AC: #3)
  - [x] 2.1: No dedicated transform.helpers unit tests exist (`helpers.test.ts` tests other helpers). Transform is tested indirectly via controller tests.
  - [x] 2.2: Update `admin.controller.test.ts:999` — currently asserts `expect(response.data.row).toBe(5)`. Add `expect(response.data).toHaveProperty('leadUuid')` assertion.
  - [x] 2.3: Update `activity-log.controller.test.ts:521-545` — currently asserts `entry.lead.row` and `toMatchObject({ row: 5 })`. Add `leadUuid` to assertions and `toMatchObject`.
  - [x] 2.4: Update `dashboard.controller.test.ts` — if `recentActivity` items are asserted, add `leadUuid` check.
  - [x] 2.5: Run `npm test` — all backend tests pass
  - [x] 2.6: Run `npm run typecheck` — zero errors

### Part B: Dashboard Type Definitions

- [x] Task 3: Update `Lead` type in `eneos-admin-dashboard/src/types/lead.ts` (AC: #1, #2)
  - [x] 3.1: Change `leadUuid: string | null` → `leadUuid: string` (non-nullable — all Supabase leads have UUID)
  - [x] 3.2: Update JSDoc for `row` field: `/** @deprecated Legacy row number — always 0 in Supabase era. Use leadUuid instead. */`
  - [x] 3.3: Update JSDoc for `leadUuid`: `/** Supabase UUID — primary identifier for API calls */`

- [x] Task 4: Update `LeadDetail` type in `eneos-admin-dashboard/src/types/lead-detail.ts` (AC: #1, #2)
  - [x] 4.1: Add `leadUuid: string` field (required, non-optional)
  - [x] 4.2: Update JSDoc for `row` field: `/** @deprecated Legacy row number — always 0 in Supabase era */`
  - [x] 4.3: Add `campaignEvents: LeadCampaignEvent[]` field (from Story 9-5 backend)
  - [x] 4.4: Add `timeline: TimelineEntry[]` field (from Story 9-5 backend)
  - [x] 4.5: Add `LeadCampaignEvent` interface to the file (or create new `campaign-timeline.ts`)
  - [x] 4.6: Add `TimelineEntry` interface to the file

- [x] Task 5: Update `ActivityEntry` type in `eneos-admin-dashboard/src/types/activity.ts` (AC: #1)
  - [x] 5.1: Update JSDoc for `rowNumber`: `/** @deprecated Legacy row number — always 0 in Supabase era. Use leadUUID instead. */`
  - [x] 5.2: No type change needed — `leadUUID: string` already exists in `ActivityEntry`

### Part C: Dashboard API Client & Hooks

- [x] Task 6: Update `fetchLeadById()` in `eneos-admin-dashboard/src/lib/api/leads.ts` (AC: #2)
  - [x] 6.1: Change parameter type: `fetchLeadById(id: number)` → `fetchLeadById(id: string)`
  - [x] 6.2: Update JSDoc: `@param id - Lead UUID (Supabase primary key)`
  - [x] 6.3: URL construction remains the same: `` `/api/admin/leads/${id}` `` (string interpolation works for both)

- [x] Task 7: Update `useLead` hook in `eneos-admin-dashboard/src/hooks/use-lead.ts` (AC: #2)
  - [x] 7.1: Change parameter type: `useLead(id: number | undefined)` → `useLead(id: string | undefined)`
  - [x] 7.2: Update `queryKey`: `['lead', id]` (no change needed — works with strings)
  - [x] 7.3: Update `enabled` check: `enabled && id !== undefined` → `enabled && !!id` (also excludes empty string)
  - [x] 7.4: Update JSDoc: `@param id - Lead UUID (undefined to skip query)`

- [x] Task 8: Update `useLeadSelection` hook in `eneos-admin-dashboard/src/hooks/use-lead-selection.ts` (AC: #2, #4)
  - [x] 8.1: Change `Set<number>` → `Set<string>` throughout the entire hook
  - [x] 8.2: Change all `rowId: number` parameters → `rowId: string`
  - [x] 8.3: Change `number[]` arrays → `string[]` for `selectAll`, `isAllSelected`, `isSomeSelected`
  - [x] 8.4: Update `UseLeadSelectionReturn` interface with string types
  - [x] 8.5: Update JSDoc examples: `isSelected('uuid-123')` instead of `isSelected(5)`

### Part D: Dashboard Component Updates

- [x] Task 9: Update `LeadDetailSheet` in `eneos-admin-dashboard/src/components/leads/lead-detail-sheet.tsx` (AC: #2, #4)
  - [x] 9.1: Change `useLead(lead?.row, ...)` → `useLead(lead?.leadUuid, ...)`
  - [x] 9.2: Update enabled check: `{ enabled: open && !!lead?.leadUuid }` (instead of `!!lead?.row`)
  - [x] 9.3: Update Technical Information section: Change `<p>Row ID: {lead.row}</p>` → `<p>UUID: {lead.leadUuid}</p>`
  - [x] 9.4: Remove the separate UUID display line (it's now the primary display)

- [x] Task 10: Update `LeadTableContainer` in `eneos-admin-dashboard/src/components/leads/lead-table-container.tsx` (AC: #2, #4)
  - [x] 10.1: Change `visibleRowIds`: `data?.map((lead) => lead.row)` → `data?.map((lead) => lead.leadUuid)`
  - [x] 10.2: Change `selectedLeads` filter: `selectedIds.has(lead.row)` → `selectedIds.has(lead.leadUuid)`
  - [x] 10.3: Type for `visibleRowIds` changes from `number[]` to `string[]` (inferred from Lead type)

- [x] Task 11: Update `LeadTable` component in `eneos-admin-dashboard/src/components/leads/lead-table.tsx` (AC: #2, #4)
  - [x] 11.1: Change `selectedIds.has(row.original.row)` → `selectedIds.has(row.original.leadUuid)` (line ~588 — used for `data-selected` attribute)
  - [x] 11.2: Change `data-testid={`lead-row-${row.original.row}`}` → `data-testid={`lead-row-${row.original.leadUuid}`}` (line ~587)
  - [x] 11.3: Change `onToggleSelection?.(row.original.row)` → `onToggleSelection?.(row.original.leadUuid)` (onClick handler for selection checkbox)
  - [x] 11.4: TanStack Table does NOT use `getRowId` — default index-based ID is fine for React keys. No change needed there.
  - [x] 11.5: Update `selectedIds` prop type in component interface: `Set<number>` → `Set<string>`
  - [x] 11.6: Update `onToggleSelection` prop type: `(rowId: number) => void` → `(id: string) => void`

### Part E: Next.js API Proxy Routes

- [x] Task 12: Update lead detail proxy route in `eneos-admin-dashboard/src/app/api/admin/leads/[id]/route.ts` (AC: #2)
  - [x] 12.1: Update file comment: `ID is the Supabase UUID` (replace "row number in Google Sheets")
  - [x] 12.2: No code change needed — `id` is already `string` from Next.js params

- [x] Task 13: Update leads list proxy transform in `eneos-admin-dashboard/src/app/api/admin/leads/route.ts` (AC: #1, #2)
  - [x] 13.1: Add `leadUuid: lead.leadUuid ?? lead.id ?? null` to the transformed lead object (backend now includes this field)
  - [x] 13.2: Remove `leadUuid: null` hardcoded value on line 149
  - [x] 13.3: Update comment: Remove "Row number" references, add "UUID" context

### Part F: Test Updates (Dashboard)

- [x] Task 14: Update Dashboard test mocks and assertions (AC: #3)
  - [x] 14.1: Update `mockLead` objects in test files: set `leadUuid: 'test-uuid-42'` (non-null string, was `null`)
  - [x] 14.2: Update `mockLeadDetail` objects: add `leadUuid: 'test-uuid-42'`, `campaignEvents: []`, `timeline: []`
  - [x] 14.3: Update `leads-api.test.ts` — change `fetchLeadById(123)` (line 314), `fetchLeadById(456)` (line 329), `fetchLeadById(999)` (line 367) to string UUIDs like `fetchLeadById('test-uuid-123')`
  - [x] 14.4: Update `lead-detail-sheet.test.tsx:653` — change `expect(mockUseLead).toHaveBeenCalledWith(42, ...)` → `expect(mockUseLead).toHaveBeenCalledWith('test-uuid-42', ...)`. Same for line 668.
  - [x] 14.5: Update `use-lead-selection.test.tsx` (360 lines) — change all numeric IDs to UUID strings: `toggleSelection(5)` → `toggleSelection('uuid-5')`, `selectAll([1,2,3,4,5])` → `selectAll(['uuid-1','uuid-2','uuid-3','uuid-4','uuid-5'])`, `Set<number>` assertions → `Set<string>`
  - [x] 14.6: Update `lead-table-container.test.tsx:92` — change `new Set<number>()` → `new Set<string>()`, and line 465 `expect(mockToggleSelection).toHaveBeenCalledWith(1)` → UUID string, line 474 `selectedIds: new Set([1])` → UUID string
  - [x] 14.7: Run `npm test` in Dashboard — all tests pass (Vitest 4.0.17)
  - [x] 14.8: Run `npm run build` in Dashboard — TypeScript compiles without errors

## Dev Notes

### Root Cause: Why This Story Exists

After the Supabase migration (Stories 9-0 through 9-5), the backend `leadRowToLeadItem()` returns `row: 0` for ALL leads because `supabaseLeadToLeadRow()` sets `rowNumber: 0`:

```typescript
// src/services/leads.service.ts:646-653
export function supabaseLeadToLeadRow(s: SupabaseLead): LeadRow {
  const lead = fromSupabaseLead(s);
  return {
    ...lead,
    rowNumber: 0,  // No row number in Supabase - always 0
    version: s.version,
  };
}
```

The Dashboard uses `lead.row` (= `rowNumber`) as the primary identifier for:
- Fetching lead detail: `fetchLeadById(lead.row)` → fetches `/api/admin/leads/0`
- Selection tracking: `Set<number>` with `lead.row` → all leads share key `0`
- React keys: potential duplicate key warnings

**After this story:** Dashboard uses `lead.leadUuid` (Supabase UUID string) everywhere instead of `lead.row`.

### Backend Changes: Expose UUID in API Responses

**Current state:** Backend `LeadItem` and `LeadDetailResponse` types do NOT include a UUID field, even though the internal `Lead` type has `leadUUID: string` (mapped from `SupabaseLead.id`).

**Required changes:**

1. **`LeadItem` type** — add `leadUuid: string`:
```typescript
// src/types/admin.types.ts
export interface LeadItem {
  row: number;        // Legacy — kept for backward compat
  leadUuid: string;   // NEW — Supabase UUID primary identifier
  // ... rest unchanged
}
```

2. **`leadRowToLeadItem()` transform** — include UUID:
```typescript
// src/controllers/admin/helpers/transform.helpers.ts
export function leadRowToLeadItem(lead: LeadRow): LeadItem {
  return {
    row: lead.rowNumber,
    leadUuid: lead.leadUUID || '',  // NEW
    // ... rest unchanged
  };
}
```

3. **`LeadDetailResponse` type** — add `leadUuid: string`:
```typescript
// src/types/admin.types.ts
export interface LeadDetailResponse {
  row: number;        // Legacy
  leadUuid: string;   // NEW
  // ... rest unchanged
}
```

4. **`getLeadById()` controller** — include UUID in response:
```typescript
// Already has access to supabaseLead.id (the UUID)
// Add to response object: leadUuid: supabaseLead.id
```

5. **`ActivityItem` type** — add `leadUuid: string` and fix collision:
```typescript
export interface ActivityItem {
  id: string;              // MUST use UUID: `act_${leadUUID}` (NOT `act_${rowNumber}` which is always "act_0")
  leadUuid: string;        // NEW
  // ... existing fields
}
```

6. **`dashboard.controller.ts:156-173` inline ActivityItem creation** — this is NOT using `leadRowToActivityItem()`, it creates ActivityItem objects inline. Must update BOTH places:
```typescript
// src/controllers/admin/dashboard.controller.ts:156-173
.map((lead) => ({
  id: `act_${lead.leadUUID || lead.rowNumber}`,  // FIX: was `act_${lead.rowNumber}` (always "act_0")
  type: lead.status as ActivityItem['type'],
  salesId: lead.salesOwnerId || '',
  salesName: lead.salesOwnerName || 'Unknown',
  leadId: lead.rowNumber,      // Keep for backward compat
  leadUuid: lead.leadUUID || '',  // NEW
  company: lead.company,
  customerName: lead.customerName,
  timestamp: getActivityTimestamp(lead),
}));
```

### Dashboard Changes: Switch from row to leadUuid

**Key insight:** The `Lead` interface already has `leadUuid: string | null` (added during Story 4.15). But it's set to `null` in the proxy transform. After backend exposes it, proxy passes it through, and we make it non-nullable.

**Critical path through the codebase:**
```
Backend API → [leadUuid field] → Next.js Proxy Route → [transform includes leadUuid]
  → fetchLeads() / fetchLeadById() → [Lead/LeadDetail with leadUuid]
    → useLeads() / useLead(leadUuid) → [hooks use string IDs]
      → LeadTableContainer → [selection uses leadUuid]
        → LeadDetailSheet → [fetches by leadUuid]
```

### New Types to Add (Campaign Timeline from Story 9-5)

Add to `lead-detail.ts` (or new file):

```typescript
/** Campaign event for lead detail timeline (Story 9-5) */
export interface LeadCampaignEvent {
  campaignId: string;
  campaignName: string;
  event: string;         // 'delivered' | 'opened' | 'click'
  eventAt: string;       // ISO 8601
  url: string | null;    // URL for click events
}

/** Unified timeline entry (Story 9-5) */
export interface TimelineEntry {
  type: 'campaign_event' | 'status_change';
  timestamp: string;     // ISO 8601
  event?: string;
  campaignName?: string;
  url?: string | null;
  status?: LeadStatus;
  changedBy?: string;
}
```

These match the backend `LeadDetailResponse` (admin.types.ts:236-256). The Dashboard component does NOT need to display them yet (AC4: no functional changes), but the types must exist so TypeScript compiles.

### Proxy Transform Update (leads route.ts)

Current hardcoded values that need updating in `src/app/api/admin/leads/route.ts` (line ~103-153):

```typescript
// BEFORE (line 149):
leadUuid: null,

// AFTER:
leadUuid: (lead.leadUuid as string) ?? null,
```

The detail proxy route (`[id]/route.ts`) passes through raw JSON — no transform needed for new fields. The backend already returns `campaignEvents` and `timeline` in the detail response (Story 9-5).

### useLeadSelection: number → string Migration

**Every method signature changes:**

| Before | After |
|--------|-------|
| `Set<number>` | `Set<string>` |
| `isSelected(rowId: number)` | `isSelected(id: string)` |
| `toggleSelection(rowId: number)` | `toggleSelection(id: string)` |
| `selectAll(rowIds: number[])` | `selectAll(ids: string[])` |
| `isAllSelected(visibleRowIds: number[])` | `isAllSelected(visibleIds: string[])` |
| `isSomeSelected(visibleRowIds: number[])` | `isSomeSelected(visibleIds: string[])` |

### LeadTable: Selection and Identity (lead-table.tsx)

TanStack Table does NOT use `getRowId` — it uses default index-based row.id (`"0"`, `"1"`, ...) for React keys, which is fine.

However, **business logic uses `row.original.row`** for selection and test IDs. These MUST change to `row.original.leadUuid`:

```typescript
// BEFORE (line ~587-588):
data-testid={`lead-row-${row.original.row}`}
data-selected={selectedIds.has(row.original.row)}

// AFTER:
data-testid={`lead-row-${row.original.leadUuid}`}
data-selected={selectedIds.has(row.original.leadUuid)}
```

Also update:
- `onToggleSelection?.(row.original.row)` → `onToggleSelection?.(row.original.leadUuid)` in the checkbox click handler
- `selectedIds` prop type: `Set<number>` → `Set<string>`
- `onToggleSelection` prop type: `(rowId: number) => void` → `(id: string) => void`

### Files to Modify

**Backend (eneos-sales-automation):**
```
src/types/admin.types.ts                                    # Add leadUuid to LeadItem, LeadDetailResponse, ActivityItem
src/controllers/admin/helpers/transform.helpers.ts           # Include leadUuid in leadRowToLeadItem + leadRowToActivityItem
src/controllers/admin/leads.controller.ts                    # Include leadUuid in detail response object (line ~338)
src/controllers/admin/dashboard.controller.ts                # Fix inline ActivityItem creation (lines 156-173) — add leadUuid, fix id collision
src/__tests__/controllers/admin.controller.test.ts           # Add leadUuid assertions (line ~999)
src/__tests__/controllers/admin/activity-log.controller.test.ts  # Add leadUuid to assertions (lines 521-545)
```

**Dashboard (eneos-admin-dashboard):**
```
src/types/lead.ts                           # leadUuid non-nullable, deprecate row
src/types/lead-detail.ts                    # Add leadUuid, campaignEvents, timeline types
src/types/activity.ts                       # Deprecate rowNumber JSDoc
src/lib/api/leads.ts                        # fetchLeadById(id: string)
src/hooks/use-lead.ts                       # useLead(id: string | undefined)
src/hooks/use-lead-selection.ts             # Set<string>, all params string
src/components/leads/lead-detail-sheet.tsx   # Use lead.leadUuid
src/components/leads/lead-table-container.tsx # Use leadUuid for selection/visibleIds
src/components/leads/lead-table.tsx          # selectedIds.has + data-testid + onToggleSelection → use leadUuid
src/app/api/admin/leads/route.ts            # Proxy: include leadUuid in transform
src/app/api/admin/leads/[id]/route.ts       # Update comment only
src/__tests__/leads-api.test.ts             # fetchLeadById(number) → fetchLeadById(string) at lines 314, 329, 367
src/__tests__/lead-detail-sheet.test.tsx     # mockLead.leadUuid + useLead assertions at lines 653, 668
src/__tests__/lead-table-container.test.tsx  # Set<string> selection at lines 92, 465, 474
src/__tests__/use-lead-selection.test.tsx    # Full number→string migration (360 lines)
```

No new files created. No files deleted.

### Anti-Patterns to Avoid

1. **DO NOT remove the `row` field** from any type — keep it for backward compatibility. Just deprecate it with JSDoc `@deprecated`.
2. **DO NOT add campaign timeline UI components** — this story is types-only. Display of `campaignEvents` and `timeline` is a separate future story.
3. **DO NOT change the Next.js dynamic route path** `[id]` — it already accepts strings (UUIDs).
4. **DO NOT add UUID validation** (e.g., regex) in the Dashboard — the backend validates via Zod `leadIdSchema` (accepts any non-empty string).
5. **DO NOT change the `Lead` interface field name** from `leadUuid` to `id` — keep consistent with the existing field name.
6. **DO NOT modify any backend service logic** — only types and transform helpers.
7. **DO NOT break existing activity log** — `ActivityEntry.rowNumber` stays but is deprecated. `ActivityEntry.leadUUID` already exists.
8. **DO NOT introduce runtime checks for UUID format** — UUIDs are always present in Supabase leads.

### Scope Boundaries (DO NOT cross)

- **DO NOT** add campaign engagement timeline UI to LeadDetailSheet (separate story)
- **DO NOT** modify backend service layer (leads.service.ts, etc.)
- **DO NOT** change Supabase schema or queries
- **DO NOT** modify other pages (Dashboard overview, Sales Performance, Campaigns)
- **DO NOT** change authentication or authorization logic
- **DO NOT** add new API endpoints

### Previous Story Intelligence (Story 9-5)

- Story 9-5 added `campaignEvents` and `timeline` to backend `LeadDetailResponse`
- Types `LeadCampaignEvent` and `TimelineEntry` are defined in `src/types/admin.types.ts:236-256`
- The detail controller already builds these fields — Dashboard just needs matching types
- Backend tests: 55 files, 1423 tests pass
- `campaignStatsService` compatibility wrapper pattern is well-established

### Git Intelligence (Recent Commits)

```
a20f97d feat: add campaign engagement timeline to lead detail endpoint (Story 9-5)
52ff22d feat: cleanup Google Sheets dependencies + update all docs to Supabase (Story 9-4)
35f1ef8 feat: migrate Sales_Team + Status_History to Supabase (Story 9-3)
721367b feat: migrate Campaign Services to Supabase (Story 9-2)
fcadfdd feat: migrate controllers + LINE postback to UUID-only (Story 9-1b)
```

All migrations complete. Backend is fully on Supabase. The `row`/`rowNumber` field is `0` for all leads.

### Testing Strategy

**Backend tests:** Minimal — just verify `leadUuid` appears in transform output and controller response.

**Dashboard tests:** Focus on:
1. Mock data uses string UUIDs instead of numeric row IDs
2. `fetchLeadById` called with string (not number)
3. Selection hook works with `Set<string>`
4. Detail sheet passes UUID to `useLead`
5. Build succeeds without type errors

### Project Structure Notes

- Backend: `C:\Users\Jiraw\OneDrive\Documents\Eneos\eneos-sales-automation\`
- Dashboard: `C:\Users\Jiraw\OneDrive\Documents\Eneos\eneos-admin-dashboard\`
- These are SEPARATE projects in separate directories
- Backend uses Vitest 2.1.2; Dashboard uses Vitest 4.0.17 (confirmed from package.json)

### References

- [Source: epic-09-supabase-migration.md#Story 9-6] — AC definitions
- [Source: src/types/admin.types.ts:196-234] — Backend LeadItem type (no UUID currently)
- [Source: src/types/admin.types.ts:262-302] — Backend LeadDetailResponse type
- [Source: src/controllers/admin/helpers/transform.helpers.ts:33-71] — leadRowToLeadItem transform
- [Source: src/types/index.ts:99-137] — fromSupabaseLead mapping (leadUUID = s.id)
- [Source: src/services/leads.service.ts:646-653] — supabaseLeadToLeadRow (rowNumber: 0)
- [Source: eneos-admin-dashboard/src/types/lead.ts:27-97] — Dashboard Lead type
- [Source: eneos-admin-dashboard/src/types/lead-detail.ts:69-123] — Dashboard LeadDetail type
- [Source: eneos-admin-dashboard/src/lib/api/leads.ts:137-184] — fetchLeadById(id: number)
- [Source: eneos-admin-dashboard/src/hooks/use-lead.ts:46-72] — useLead(id: number)
- [Source: eneos-admin-dashboard/src/hooks/use-lead-selection.ts:71-151] — Set<number> selection
- [Source: eneos-admin-dashboard/src/components/leads/lead-detail-sheet.tsx:92] — useLead(lead?.row)
- [Source: eneos-admin-dashboard/src/components/leads/lead-table-container.tsx:203] — visibleRowIds
- [Source: eneos-admin-dashboard/src/app/api/admin/leads/route.ts:103-153] — Proxy transform
- [Source: src/controllers/admin/dashboard.controller.ts:156-173] — Inline ActivityItem creation (NOT using helper)
- [Source: src/__tests__/controllers/admin/activity-log.controller.test.ts:521-545] — ActivityItem assertions with row field
- [Source: src/__tests__/controllers/admin.controller.test.ts:999] — `expect(response.data.row).toBe(5)` assertion
- [Source: eneos-admin-dashboard/src/components/leads/lead-table.tsx:587-588] — `data-testid` and `selectedIds.has(row.original.row)`
- [Source: eneos-admin-dashboard/src/__tests__/leads-api.test.ts:314,329,367] — `fetchLeadById(123)` numeric calls
- [Source: eneos-admin-dashboard/src/__tests__/lead-detail-sheet.test.tsx:653,668] — `useLead(42, ...)` assertions
- [Source: eneos-admin-dashboard/src/__tests__/use-lead-selection.test.tsx] — Full Set<number> test suite (360 lines)
- [Source: eneos-admin-dashboard/src/__tests__/lead-table-container.test.tsx:92,465,474] — Set<number> selection mocks
- [Source: project-context.md] — ES Modules, Vitest patterns, config access rules

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Rex review found H1 (use-auto-refresh out-of-scope) was false positive — tests were pre-broken, dev fixes were necessary
- Fixed H2: `use-leads.test.tsx:61` `leadUuid: null` → `'lead_1'`
- Fixed M2: Stale JSDoc in `lead.ts:24-25` — updated "Google Sheets" → "Supabase"
- Fixed L1: Added logger.warn in dashboard.controller.ts for missing UUID

### File List

**Backend (eneos-sales-automation):**
- `src/types/admin.types.ts` — Added `leadUuid: string` to `LeadItem`, `LeadDetailResponse`, `ActivityItem`
- `src/controllers/admin/helpers/transform.helpers.ts` — Include `leadUuid` in `leadRowToLeadItem()` + `leadRowToActivityItem()`, fix `id` collision
- `src/controllers/admin/leads.controller.ts` — Include `leadUuid: supabaseLead.id` in detail response
- `src/controllers/admin/dashboard.controller.ts` — Fix inline ActivityItem creation: add `leadUuid`, fix `id` collision, add UUID warning
- `src/__tests__/controllers/admin.controller.test.ts` — Add `leadUuid` assertion
- `src/__tests__/controllers/admin/activity-log.controller.test.ts` — Add `leadUuid` to `toMatchObject` assertions

**Dashboard (eneos-admin-dashboard):**
- `src/types/lead.ts` — `leadUuid: string` (non-nullable), deprecate `row` JSDoc, update interface comment
- `src/types/lead-detail.ts` — Add `leadUuid`, `campaignEvents`, `timeline` fields + `LeadCampaignEvent`, `TimelineEntry` types
- `src/types/activity.ts` — Deprecate `rowNumber` JSDoc
- `src/lib/api/leads.ts` — `fetchLeadById(id: string)`
- `src/hooks/use-lead.ts` — `useLead(id: string | undefined)`, `enabled: !!id`
- `src/hooks/use-lead-selection.ts` — Full `Set<number>` → `Set<string>` migration
- `src/hooks/use-auto-refresh.ts` — Fix: remove stale `isMountedRef`, use `refetchQueries` (test compatibility)
- `src/components/leads/lead-detail-sheet.tsx` — Use `lead.leadUuid` for detail fetch + display
- `src/components/leads/lead-table-container.tsx` — Use `leadUuid` for `visibleRowIds` + selection filter
- `src/components/leads/lead-table.tsx` — `selectedIds.has(leadUuid)`, `data-testid`, `onToggleSelection` prop types
- `src/app/api/admin/leads/route.ts` — Proxy: include `leadUuid` from backend, remove hardcoded `null`
- `src/app/api/admin/leads/[id]/route.ts` — Update comment: "Supabase UUID"
- `src/__tests__/leads-api.test.ts` — `fetchLeadById(string)` calls
- `src/__tests__/lead-detail-sheet.test.tsx` — `mockLeadDetail.leadUuid`, `useLead('uuid')` assertions
- `src/__tests__/lead-table-container.test.tsx` — `Set<string>` selection mocks
- `src/__tests__/lead-table.test.tsx` — `data-testid` with UUID, `Set<string>` props
- `src/__tests__/use-lead-selection.test.tsx` — Full `number` → `string` migration (360 lines)
- `src/__tests__/use-leads.test.tsx` — Fix `leadUuid: null` → `'lead_1'`
- `src/__tests__/unit/hooks/use-auto-refresh.test.tsx` — Fix fake timer compatibility with `MIN_SPINNER_MS`
- `src/__tests__/integration/grounding-fields.test.tsx` — Add `leadUuid`, `campaignEvents`, `timeline` to mocks
- `src/__tests__/integration/lead-detail-modal.test.tsx` — Add `leadUuid` to mocks, UUID assertions
- `src/__tests__/lib/export-leads-fields.test.ts` — `leadUuid: ''` (non-null)
