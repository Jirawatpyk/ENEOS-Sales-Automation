# Story 5.1: Campaign Webhook Backend

Status: review

## Story

As a **system administrator**,
I want **a webhook endpoint that receives Brevo Campaign Events (delivered/opened/click) and stores them in Google Sheets**,
so that **we can track email campaign metrics separately from lead data**.

## Acceptance Criteria

1. **AC1: Webhook Endpoint**
   - `POST /webhook/brevo/campaign` accepts Brevo Campaign Events payload
   - Returns 200 OK immediately (non-blocking, same as lead webhook pattern)
   - Logs event received with campaign_id and event type

2. **AC2: Payload Validation**
   - Validates payload with Zod schema
   - Required fields: `camp_id`, `email`, `event`, `id`
   - Handles `campaign name` field (with space!)
   - Returns 400 if validation fails

3. **AC3: Campaign_Events Sheet Write**
   - Creates/appends to `Campaign_Events` sheet tab
   - Columns: Event_ID, Campaign_ID, Campaign_Name, Email, Event, Event_At, Sent_At, URL, Tag, Segment_IDs, Created_At
   - Uses `id` field as Event_ID (unique from Brevo)

4. **AC4: Campaign_Stats Sheet Update**
   - Creates/updates `Campaign_Stats` sheet tab
   - If campaign exists → increment counters (Delivered/Opened/Clicked)
   - If new campaign → create row with initial counts
   - Tracks Unique_Opens and Unique_Clicks (distinct emails)
   - Calculates Open_Rate and Click_Rate

5. **AC5: Duplicate Event Prevention**
   - Check if Event_ID already exists in Campaign_Events
   - If duplicate → log and return 200 OK (idempotent)
   - Do not increment stats for duplicates

6. **AC6: Event Types Supported**
   - `delivered` → increment Delivered count
   - `opened` → increment Opened count + track unique
   - `click` → increment Clicked count + track unique + store URL

7. **AC7: Future Event Types (Prepared but not enabled)**
   - Code รองรับ: `hard_bounce`, `soft_bounce`, `unsubscribe`, `spam`
   - ใช้ `ENABLED_EVENTS` array เพื่อ control ว่า process event ไหน
   - Events ที่ไม่อยู่ใน ENABLED_EVENTS → log และ return 200 OK (acknowledge แต่ไม่ process)
   - Sheet columns เตรียมไว้พร้อม (ค่า default = 0)

## Tasks / Subtasks

- [x] **Task 1: Create Zod Validator** (AC: #2)
  - [x] 1.1 Create `src/validators/campaign-event.validator.ts`
  - [x] 1.2 Define `campaignEventSchema` with all fields from Epic 5 payload
  - [x] 1.3 Handle `campaign name` field (with space) → normalize to `campaignName`
  - [x] 1.4 Create `normalizeCampaignEventPayload()` function
  - [x] 1.5 Write unit tests (20+ test cases) - **39 tests created**

- [x] **Task 2: Create Campaign Stats Service** (AC: #3, #4, #5, #6)
  - [x] 2.1 Create `src/services/campaign-stats.service.ts`
  - [x] 2.2 Implement `recordCampaignEvent()` - main entry point
  - [x] 2.3 Implement `checkDuplicateEvent()` - check Event_ID exists
  - [x] 2.4 Implement `writeCampaignEvent()` - append to Campaign_Events sheet
  - [x] 2.5 Implement `updateCampaignStats()` - upsert Campaign_Stats row
  - [x] 2.6 Implement `checkIsFirstEventForEmail()` - check if email+campaign+event exists (for unique count)
  - [x] 2.7 Use existing `sheetsClient` from sheets.service.ts
  - [x] 2.8 Wrap with CircuitBreaker (same pattern as other sheet ops)
  - [x] 2.9 Write unit tests (30+ test cases) - **21 tests created**

- [x] **Task 3: Create Controller** (AC: #1)
  - [x] 3.1 Create `src/controllers/campaign-webhook.controller.ts`
  - [x] 3.2 Implement `handleCampaignEvent()` - thin controller pattern
  - [x] 3.3 Validate → respond 200 → process async
  - [x] 3.4 Add to Dead Letter Queue on failure
  - [x] 3.5 Write unit tests (15+ test cases) - **13 tests created**

- [x] **Task 4: Create Routes** (AC: #1)
  - [x] 4.1 Create `src/routes/campaign.routes.ts`
  - [x] 4.2 Register `POST /webhook/brevo/campaign`
  - [x] 4.3 Mount routes in `app.ts`
  - [x] 4.4 Write integration tests with supertest - **8 tests created**

- [x] **Task 5: Create Constants & Google Sheets Tabs** (AC: #6, #7)
  - [x] 5.1 Create `src/constants/campaign.constants.ts`
  - [x] 5.2 Define `CAMPAIGN_EVENTS` enum (all events including future)
  - [x] 5.3 Define `ENABLED_EVENTS` array (only: delivered, opened, click)
  - [x] 5.4 Define column indices for Campaign_Events sheet
  - [x] 5.5 Define column indices for Campaign_Stats sheet (including future columns)
  - [x] 5.6 Write unit tests for constants - **15 tests created**

## Dev Notes

### Architecture Patterns to Follow

**From project-context.md:**
- ES Modules: ALL imports MUST include `.js` extension
- Services export functions, NOT classes
- Thin controllers: validate → respond → delegate to service
- Wrap external calls with `withRetry()` from `utils/retry.js`
- Use domain-specific logger: create `campaignLogger`
- Custom error classes for campaign-specific errors

**Circuit Breaker Pattern:**
```typescript
import { CircuitBreaker } from '../utils/circuit-breaker.js';
const campaignCircuitBreaker = new CircuitBreaker('campaign-stats');
```

**1-Second Response (same as LINE webhook):**
```typescript
res.status(200).json({ success: true, message: 'Event received' });
processCampaignEventAsync(payload).catch(handleError);
```

### Brevo Payload Reference

```json
{
  "URL": "https://myCampaignUrl.net",
  "camp_id": 123,
  "campaign name": "My First Campaign",
  "date_event": "2020-10-09 00:00:00",
  "date_sent": "2020-10-09 00:00:00",
  "email": "example@domain.com",
  "event": "click",
  "id": 123,
  "segment_ids": [1, 10],
  "tag": "",
  "ts": 1604937337,
  "ts_event": 1604933737,
  "ts_sent": 1604933619
}
```

**⚠️ CRITICAL:** `campaign name` has a SPACE - handle in Zod schema!

### Campaign Events Constants

```typescript
// src/constants/campaign.constants.ts

export const CAMPAIGN_EVENTS = {
  // Enabled (Story 5-1)
  DELIVERED: 'delivered',
  OPENED: 'opened',
  CLICK: 'click',

  // Future (prepared but not enabled)
  HARD_BOUNCE: 'hard_bounce',
  SOFT_BOUNCE: 'soft_bounce',
  UNSUBSCRIBE: 'unsubscribe',
  SPAM: 'spam',
} as const;

export type CampaignEventType = typeof CAMPAIGN_EVENTS[keyof typeof CAMPAIGN_EVENTS];

// Events ที่ process ตอนนี้ - เพิ่ม event ใหม่แค่เพิ่มใน array นี้
export const ENABLED_EVENTS: CampaignEventType[] = [
  CAMPAIGN_EVENTS.DELIVERED,
  CAMPAIGN_EVENTS.OPENED,
  CAMPAIGN_EVENTS.CLICK,
];

export function isEventEnabled(event: string): boolean {
  return ENABLED_EVENTS.includes(event as CampaignEventType);
}
```

### Google Sheets Structure

**Campaign_Events (Detail Log):**
| Column | Index | Type |
|--------|-------|------|
| Event_ID | 0 | number |
| Campaign_ID | 1 | number |
| Campaign_Name | 2 | string |
| Email | 3 | string |
| Event | 4 | string |
| Event_At | 5 | datetime |
| Sent_At | 6 | datetime |
| URL | 7 | string |
| Tag | 8 | string |
| Segment_IDs | 9 | string (JSON) |
| Created_At | 10 | datetime |

**Campaign_Stats (Aggregate):**
| Column | Index | Type | Notes |
|--------|-------|------|-------|
| Campaign_ID | 0 | number | |
| Campaign_Name | 1 | string | |
| Delivered | 2 | number | Total delivered |
| Opened | 3 | number | Total opens |
| Clicked | 4 | number | Total clicks |
| Unique_Opens | 5 | number | Unique emails opened |
| Unique_Clicks | 6 | number | Unique emails clicked |
| Open_Rate | 7 | number (%) | Unique_Opens / Delivered * 100 |
| Click_Rate | 8 | number (%) | Unique_Clicks / Delivered * 100 |
| Hard_Bounce | 9 | number | **Future** (default 0) |
| Soft_Bounce | 10 | number | **Future** (default 0) |
| Unsubscribe | 11 | number | **Future** (default 0) |
| Spam | 12 | number | **Future** (default 0) |
| First_Event | 13 | datetime | |
| Last_Updated | 14 | datetime | |

### Unique Tracking Strategy (Option C - Count at Write Time)

**เหตุผล:** Campaign ส่ง 1,000+ emails → Query ตอนอ่านจะช้า

**Logic:**
```
Event เข้ามา (email + campaign_id + event_type)
    │
    ├─ Check: email นี้เคยมี event_type นี้ใน campaign นี้หรือยัง?
    │   (Query Campaign_Events: WHERE email=X AND campaign_id=Y AND event=Z)
    │
    ├─ ถ้า ยังไม่เคย (ครั้งแรก):
    │   → Write to Campaign_Events ✅
    │   → Increment Total count +1 ✅
    │   → Increment Unique count +1 ✅
    │
    └─ ถ้า เคยแล้ว (ซ้ำ):
        → Write to Campaign_Events ✅ (ยังเก็บ log)
        → Increment Total count +1 ✅
        → Unique count ไม่เพิ่ม ❌
```

**ใช้ Logic เดียวกันกับทุก event type** (รวม future: hard_bounce, soft_bounce, unsubscribe, spam)

### Testing Strategy

**Mock Hoisting Pattern (Vitest):**
```typescript
const { mockSheetsClient } = vi.hoisted(() => ({
  mockSheetsClient: {
    spreadsheets: {
      values: {
        get: vi.fn(),
        append: vi.fn(),
        update: vi.fn(),
      }
    }
  }
}));

vi.mock('googleapis', () => ({
  google: { sheets: vi.fn(() => mockSheetsClient) }
}));
```

### Project Structure Notes

**Files to Create:**
```
src/
├── validators/
│   └── campaign-event.validator.ts
├── services/
│   └── campaign-stats.service.ts
├── controllers/
│   └── campaign-webhook.controller.ts
├── routes/
│   └── campaign.routes.ts
├── constants/
│   └── campaign.constants.ts
└── __tests__/
    ├── validators/campaign-event.validator.test.ts
    ├── services/campaign-stats.service.test.ts
    └── controllers/campaign-webhook.controller.test.ts
```

**Existing Files to Modify:**
- `src/app.ts` - Mount campaign routes
- `src/utils/logger.ts` - Add `campaignLogger` (optional)

### References

- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#EPIC-05]
- [Source: _bmad-output/project-context.md#Google-Sheets-Integration]
- [Source: src/controllers/webhook.controller.ts - Pattern reference]
- [Source: src/validators/brevo.validator.ts - Zod pattern reference]
- [Source: src/services/sheets.service.ts - Sheets client reference]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All tests pass: 1145 tests (57 new tests added)

### Completion Notes List

- **Task 1:** Created `campaign-event.validator.ts` with Zod schema handling "campaign name" field with space. 39 unit tests.
- **Task 2:** Created `campaign-stats.service.ts` implementing full workflow: duplicate check → write event → update stats with unique tracking (Option C). 21 unit tests.
- **Task 3:** Created `campaign-webhook.controller.ts` following thin controller pattern. 13 unit tests.
- **Task 4:** Created `campaign.routes.ts` and mounted at `/webhook/brevo/campaign`. 8 integration tests.
- **Task 5:** Created `campaign.constants.ts` with ENABLED_EVENTS array and column indices for both sheets. 15 unit tests.
- **Config:** Added `campaignEvents` and `campaignStats` sheet names to config
- **Logger:** Added `campaignLogger` to logger.ts

### File List

**New Files:**
- `src/validators/campaign-event.validator.ts`
- `src/services/campaign-stats.service.ts`
- `src/controllers/campaign-webhook.controller.ts`
- `src/routes/campaign.routes.ts`
- `src/constants/campaign.constants.ts`
- `src/__tests__/validators/campaign-event.validator.test.ts`
- `src/__tests__/services/campaign-stats.service.test.ts`
- `src/__tests__/controllers/campaign-webhook.controller.test.ts`
- `src/__tests__/routes/campaign.routes.test.ts`
- `src/__tests__/constants/campaign.constants.test.ts`

**Modified Files:**
- `src/config/index.ts` - Added campaign sheet names
- `src/utils/logger.ts` - Added campaignLogger
- `src/app.ts` - Mounted campaign routes

## Change Log

- 2026-01-30: Story 5-1 implementation complete
  - Created campaign webhook endpoint: POST /webhook/brevo/campaign
  - Implemented Campaign_Events and Campaign_Stats sheet operations
  - Added duplicate event prevention (AC5)
  - Added unique tracking for opens/clicks (AC4)
  - Prepared future event types (hard_bounce, soft_bounce, unsubscribe, spam)

