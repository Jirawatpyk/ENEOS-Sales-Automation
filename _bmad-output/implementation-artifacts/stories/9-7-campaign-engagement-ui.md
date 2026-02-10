# Story 9.7: Campaign Engagement Timeline UI

Status: dev-complete

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **sales manager**,
I want **the Lead Detail sheet to show campaign engagement history (delivered, opened, clicked) grouped by campaign within the Campaign Information section**,
So that **I can see which campaigns the lead interacted with and their full email engagement at a glance**.

## Acceptance Criteria

1. **AC1:** Campaign Information section in `lead-detail-sheet.tsx` displays campaign events from `leadDetail.campaignEvents[]`, grouped by `campaignId` (displaying `campaignName` as header).
2. **AC2:** Each campaign group shows a header with campaign name, and its events listed chronologically with event type (delivered/opened/clicked), timestamp, and optional URL for click events.
3. **AC3:** When `campaignEvents` is empty or undefined, section shows only Source and Lead Source (existing static fields). No empty state, no error.
4. **AC4:** Event types have distinct visual indicators (icons and/or colors) to differentiate delivered vs opened vs clicked.
5. **AC5:** Source and Lead Source fields remain at the bottom of the Campaign Information section.
6. **AC6:** Old standalone "Campaign Name", "Campaign ID", "Email Subject" `DetailItem` fields are **removed** — replaced by the grouped campaign events display.
7. **AC7:** All existing lead detail tests pass. New tests cover: events rendered, empty state, click URL display, multiple campaign grouping.

## Tasks / Subtasks

- [x] Task 1: Create `CampaignEngagement` component (AC: #1, #2, #4)
  - [x] 1.1: Create `eneos-admin-dashboard/src/components/leads/campaign-engagement.tsx`
  - [x] 1.2: Accept `events: LeadCampaignEvent[]` prop
  - [x] 1.3: Group events by `campaignId` using `Map` or `Object.groupBy` (polyfill if needed — Next.js 14 supports it)
  - [x] 1.4: Render campaign name header per group (use `Mail` icon — consistent with email campaign theme)
  - [x] 1.5: Render each event with: icon (by event type), event label, formatted timestamp
  - [x] 1.6: For click events with `url`, render clickable link with `ExternalLink` icon
  - [x] 1.7: Use vertical timeline pattern from `status-history.tsx` (connecting line + dots)

- [x] Task 2: Update Campaign Information section in `lead-detail-sheet.tsx` (AC: #1, #5, #6)
  - [x] 2.1: Remove `DetailItem` for Campaign Name, Campaign ID, Email Subject
  - [x] 2.2: Add `<CampaignEngagement events={leadDetail?.campaignEvents ?? []} />` after section heading
  - [x] 2.3: Keep `Source` and `Lead Source` `DetailItem` fields at the bottom (inside same Card)
  - [x] 2.4: Import `CampaignEngagement` component and `LeadCampaignEvent` type

- [x] Task 3: Handle empty state (AC: #3)
  - [x] 3.1: If `events.length === 0`, render nothing (return `null`) in `CampaignEngagement`
  - [x] 3.2: Source and Lead Source still display even without campaign events

- [x] Task 4: Tests (AC: #7)
  - [x] 4.1: Create `eneos-admin-dashboard/src/__tests__/campaign-engagement.test.tsx`
  - [x] 4.2: Test: renders events grouped by campaign when data present
  - [x] 4.3: Test: returns null when events array is empty
  - [x] 4.4: Test: click event URL renders as link
  - [x] 4.5: Test: multiple campaigns display correctly
  - [x] 4.6: Update `lead-detail-sheet.test.tsx` mocks — `campaignEvents` should include sample data
  - [x] 4.7: Verify all existing lead detail tests pass (`npm test`)
  - [x] 4.8: Run `npm run build` — TypeScript compiles

## Dev Notes

### Target Layout (from Jiraw)

```
📧 Campaign Information

  📧 Campaign A
    ├─ delivered  2026-02-01 10:00
    ├─ opened     2026-02-01 14:30
    └─ clicked    2026-02-01 14:32

  📧 Campaign B
    ├─ delivered  2026-02-05 09:00
    └─ opened     2026-02-05 11:15

  Source: Brevo
  Lead Source: BMF2027
```

### Data Source

```typescript
// Already returned by GET /api/admin/leads/:id (Story 9-5)
// Accessed via useLead() hook → leadDetail.campaignEvents
leadDetail.campaignEvents: LeadCampaignEvent[]

// Type (from src/types/lead-detail.ts):
interface LeadCampaignEvent {
  campaignId: string;
  campaignName: string;
  event: string;         // 'delivered' | 'opened' | 'click'
  eventAt: string;       // ISO 8601
  url: string | null;    // URL for click events
}
```

### Event Type Icons (lucide-react — already in project)

| Event | Icon | Color | Notes |
|-------|------|-------|-------|
| `delivered` | `Mail` | `text-gray-500` | Email sent/delivered |
| `opened` | `Mail` (or `Eye` — add import) | `text-amber-500` | Email opened |
| `click` | `ExternalLink` | `text-green-500` | Link clicked — show URL |

### Follow Existing Pattern: `status-history.tsx`

The `StatusHistory` component uses a vertical timeline:
```tsx
// Timeline line
<div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

// Each item
<div className="relative pl-10">
  {/* Dot */}
  <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-background border-2 border-primary" />
  {/* Content */}
  <div className="flex flex-col gap-1">...</div>
</div>
```

**Reuse this pattern** for campaign events within each campaign group.

### Grouping Logic

```typescript
// Group campaignEvents by campaignId
const grouped = new Map<string, LeadCampaignEvent[]>();
for (const event of events) {
  const key = event.campaignId;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key)!.push(event);
}
```

### Current Campaign Information Section to REPLACE (lines ~333-378)

```tsx
// REMOVE these DetailItems:
<DetailItem label="Campaign Name" ... />   // ← remove
<DetailItem label="Campaign ID" ... />     // ← remove
<DetailItem label="Email Subject" ... />   // ← remove

// KEEP these DetailItems:
<DetailItem label="Source" ... />           // ← keep at bottom
<DetailItem label="Lead Source" ... />      // ← keep at bottom
```

### Available Utilities (DO NOT reinvent)

- `formatLeadDateTime(dateString)` — from `@/lib/format-lead` (returns "DD MMM YYYY HH:mm" Bangkok timezone)
- `cn()` — from `@/lib/utils` (conditional classNames)
- `Card`, `CardContent` — from `@/components/ui/card`

### shadcn/ui Components Available

Card, CardContent, Badge, Sheet, Separator, ScrollArea — all installed.

### Files to Create

| File | Purpose |
|------|---------|
| `eneos-admin-dashboard/src/components/leads/campaign-engagement.tsx` | New component |
| `eneos-admin-dashboard/src/__tests__/campaign-engagement.test.tsx` | Tests |

### Files to Modify

| File | Change |
|------|--------|
| `eneos-admin-dashboard/src/components/leads/lead-detail-sheet.tsx` | Replace Campaign Name/ID/Subject with `CampaignEngagement`, keep Source/Lead Source |
| `eneos-admin-dashboard/src/__tests__/lead-detail-sheet.test.tsx` | Update mocks with `campaignEvents` data |

### Anti-Patterns to Avoid

1. **DO NOT create a separate API call** — `campaignEvents[]` is already in `leadDetail` from `useLead()` hook.
2. **DO NOT modify backend code** — this is frontend-only.
3. **DO NOT use `leadDetail.timeline[]`** for this section — use `campaignEvents[]` (grouped by campaign). The `timeline` merges both campaign events + status history and is for a different potential view.
4. **DO NOT remove Source and Lead Source** from the section.
5. **DO NOT import new icon libraries** — use `lucide-react` icons already available.
6. **DO NOT use `Object.groupBy`** without checking browser support — use `Map` approach instead for safety.

### Dependencies

- Story 9-5 (Backend: `campaignEvents[]` in API response) — **DONE**
- Story 9-6 (Frontend types: `LeadCampaignEvent`) — **DONE**

### Previous Story Intelligence (Story 9-6)

Key learnings from Story 9-6:
- Dashboard project is at `C:\Users\Jiraw\OneDrive\Documents\Eneos\eneos-admin-dashboard\`
- Uses Vitest 4.0.17 (NOT 2.1.2 like backend)
- Test files at `src/__tests__/` (NOT `src/__tests__/components/`)
- Mock lead objects need `campaignEvents: []` and `timeline: []` fields
- `leadDetail.campaignEvents` is already typed and returned by API — just needs UI

### Git Intelligence

Recent commits show:
- `708ab63` refactor: improve ensureSalesTeamMember
- `e7331fe` feat: auto-create sales_team entry
- Story 9-6 completed — all Dashboard types migrated to UUID

### Testing Strategy

- Use `@testing-library/react` + `vitest`
- Follow `status-history.test.tsx` pattern: render component, assert items by `data-testid`
- Add `data-testid="campaign-group"` and `data-testid="campaign-event"` for easy selection
- Test mocks: `LeadCampaignEvent[]` arrays with varied campaign groups

### Project Structure Notes

- Project: `eneos-admin-dashboard` (Next.js 14, App Router)
- Component location: `src/components/leads/` (matches existing pattern)
- Test location: `src/__tests__/` (flat structure, NOT nested)
- Naming: `campaign-engagement.tsx` (kebab-case, matches `status-history.tsx`)

### References

- [Source: eneos-admin-dashboard/src/components/leads/lead-detail-sheet.tsx:333-378] — Campaign Information section to modify
- [Source: eneos-admin-dashboard/src/components/leads/status-history.tsx] — Timeline UI pattern to follow
- [Source: eneos-admin-dashboard/src/types/lead-detail.ts:11-28] — LeadCampaignEvent + TimelineEntry types
- [Source: eneos-admin-dashboard/src/lib/format-lead.ts] — formatLeadDateTime utility
- [Source: ADR-002-supabase-migration.md#Story 9-5] — Backend campaign events API
- [Source: project-context.md] — Testing patterns, ESM rules

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (Amelia)

### Debug Log References
- No issues encountered. All tests passed on first run.

### Completion Notes List
- Created `CampaignEngagement` component with Map-based grouping, timeline UI, event-type icons (Mail/Eye/ExternalLink), and chronological sorting
- Removed Campaign Name, Campaign ID, Email Subject `DetailItem` fields from lead-detail-sheet.tsx
- Added `CampaignEngagement` with `leadDetail?.campaignEvents ?? []` — Source and Lead Source remain at bottom
- Empty state returns `null` — no visual noise when no events
- Unknown event types handled gracefully (falls back to raw event name)
- 13 new tests in campaign-engagement.test.tsx, 3 updated tests in lead-detail-sheet.test.tsx
- Full suite: 245 files, 3466 tests passed, 0 failed
- Build: TypeScript compiles, Next.js build succeeds

### File List
| File | Action |
|------|--------|
| `eneos-admin-dashboard/src/components/leads/campaign-engagement.tsx` | Created |
| `eneos-admin-dashboard/src/__tests__/campaign-engagement.test.tsx` | Created |
| `eneos-admin-dashboard/src/components/leads/lead-detail-sheet.tsx` | Modified (Campaign section replaced) |
| `eneos-admin-dashboard/src/__tests__/lead-detail-sheet.test.tsx` | Modified (mocks + AC#7 tests updated) |
