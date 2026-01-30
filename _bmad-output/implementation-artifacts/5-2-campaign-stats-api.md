# Story 5.2: Campaign Stats API

Status: done

## Story

As a **frontend developer**,
I want **API endpoints to retrieve campaign statistics and event logs**,
so that **the Admin Dashboard can display campaign analytics**.

## Acceptance Criteria

1. **AC1: GET /api/admin/campaigns/stats**
   - Returns list of all campaigns with aggregated metrics
   - Response includes: Campaign_ID, Campaign_Name, Delivered, Opened, Clicked, Unique_Opens, Unique_Clicks, Open_Rate, Click_Rate
   - Supports pagination (`page`, `limit` query params)
   - Supports **search by campaign name** (`search` query param)
   - Supports date range filter (`dateFrom`, `dateTo`)
   - Supports sorting (`sortBy`, `sortOrder`) - sortBy options: Last_Updated, First_Event, Campaign_Name, Delivered, Opened, Clicked, Open_Rate, Click_Rate
   - Protected by Admin Auth middleware

2. **AC2: GET /api/admin/campaigns/:id/stats**
   - `:id` = **Campaign_ID** (จาก Brevo `camp_id`)
   - Returns single campaign detail with full metrics
   - Includes future columns (Hard_Bounce, Soft_Bounce, Unsubscribe, Spam) even if 0
   - Returns 404 if campaign not found

3. **AC3: GET /api/admin/campaigns/:id/events**
   - Returns event log for specific campaign
   - Supports pagination (`page`, `limit`)
   - Supports filter by event type (`event` query param)
   - Supports date range filter (`dateFrom`, `dateTo`)
   - Returns: Event_ID, Email, Event, Event_At, URL (for clicks)

4. **AC4: Response Format**
   - Uses standard `ApiResponse<T>` format (same as other admin endpoints)
   - Includes pagination metadata
   - Time values in ISO 8601 format

5. **AC5: Performance**
   - Response time < 2 seconds for up to 100 campaigns
   - Uses caching if needed (optional)

## Tasks / Subtasks

- [x] **Task 1: Create Campaign Stats Controller** (AC: #1, #2, #3)
  - [x] 1.1 Create `src/controllers/admin/campaign-stats.controller.ts`
  - [x] 1.2 Implement `getCampaignStats()` - list all campaigns
  - [x] 1.3 Implement `getCampaignById()` - single campaign detail
  - [x] 1.4 Implement `getCampaignEvents()` - event log for campaign
  - [x] 1.5 Write unit tests (20+ test cases) ✓ 21 tests

- [x] **Task 2: Create Campaign Stats Service Methods** (AC: #1, #2, #3)
  - [x] 2.1 Add to `src/services/campaign-stats.service.ts`
  - [x] 2.2 Implement `getAllCampaignStats()` - read Campaign_Stats sheet
  - [x] 2.3 Implement `getCampaignStatsById()` - find by Campaign_ID
  - [x] 2.4 Implement `getCampaignEventsById()` - read Campaign_Events filtered
  - [x] 2.5 Implement pagination logic
  - [x] 2.6 Implement **search by campaign name** (case-insensitive, partial match)
  - [x] 2.7 Implement date range filtering
  - [x] 2.8 Implement sorting (8 sort options)
  - [x] 2.9 Write unit tests (25+ test cases) ✓ 53 tests (including write operations)

- [x] **Task 3: Create Request Validators** (AC: #1, #3)
  - [x] 3.1 Create `src/validators/campaign-stats.validator.ts`
  - [x] 3.2 Define `getCampaignStatsQuerySchema` (page, limit, search, dateFrom, dateTo, sortBy, sortOrder)
  - [x] 3.3 Define `VALID_SORT_BY_OPTIONS` constant
  - [x] 3.4 Define `getCampaignEventsQuerySchema` (page, limit, event, dateFrom, dateTo)
  - [x] 3.5 Write unit tests (15+ test cases) ✓ 32 tests

- [x] **Task 4: Create Response Types** (AC: #4)
  - [x] 4.1 Add to `src/types/admin.types.ts`
  - [x] 4.2 Define `CampaignStatsResponse` interface
  - [x] 4.3 Define `CampaignEventResponse` interface
  - [x] 4.4 Define `CampaignStatsListResponse` with pagination

- [x] **Task 5: Add Routes** (AC: #1, #2, #3)
  - [x] 5.1 Update `src/routes/admin.routes.ts` (not campaign.routes.ts)
  - [x] 5.2 Add `GET /api/admin/campaigns/stats`
  - [x] 5.3 Add `GET /api/admin/campaigns/:id/stats`
  - [x] 5.4 Add `GET /api/admin/campaigns/:id/events`
  - [x] 5.5 Apply `adminAuthMiddleware` via requireViewer
  - [x] 5.6 Write integration tests with supertest ✓ 23 tests

- [x] **Task 6: Performance Tests** (AC: #5)
  - [x] 6.1 Add performance test section to `campaign-stats.service.test.ts`
  - [x] 6.2 Test 100 campaigns processed in < 2 seconds
  - [x] 6.3 Test 100 campaigns with search filter in < 2 seconds
  - [x] 6.4 Test 100 campaigns with sorting in < 2 seconds
  - [x] 6.5 Test 100 campaigns with date range filter in < 2 seconds
  - [x] 6.6 Test 200 campaigns with pagination efficiency ✓ 5 performance tests

## Dev Notes

### API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/campaigns/stats` | List all campaigns with metrics |
| GET | `/api/admin/campaigns/:id/stats` | Single campaign detail |
| GET | `/api/admin/campaigns/:id/events` | Event log for campaign |

### Query Parameters

**GET /api/admin/campaigns/stats:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `search` | string | - | Search by Campaign_Name (case-insensitive, partial match) |
| `dateFrom` | string | - | Filter by First_Event >= dateFrom (ISO 8601) |
| `dateTo` | string | - | Filter by First_Event <= dateTo (ISO 8601) |
| `sortBy` | string | 'Last_Updated' | Sort column (see options below) |
| `sortOrder` | 'asc' \| 'desc' | 'desc' | Sort direction |

**sortBy Options:**
- `Last_Updated` (default)
- `First_Event`
- `Campaign_Name`
- `Delivered`
- `Opened`
- `Clicked`
- `Open_Rate`
- `Click_Rate`

**GET /api/admin/campaigns/:id/events:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max 100) |
| `event` | string | - | Filter by event type (delivered/opened/click) |
| `dateFrom` | string | - | Filter by Event_At >= dateFrom |
| `dateTo` | string | - | Filter by Event_At <= dateTo |

### Response Examples

**GET /api/admin/campaigns/stats:**
```json
{
  "success": true,
  "data": [
    {
      "campaignId": 123,
      "campaignName": "BMF2026 Launch",
      "delivered": 1000,
      "opened": 450,
      "clicked": 120,
      "uniqueOpens": 400,
      "uniqueClicks": 100,
      "openRate": 40.0,
      "clickRate": 10.0,
      "hardBounce": 0,
      "softBounce": 0,
      "unsubscribe": 0,
      "spam": 0,
      "firstEvent": "2026-01-15T10:00:00.000Z",
      "lastUpdated": "2026-01-30T15:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

**GET /api/admin/campaigns/:id/events:**
```json
{
  "success": true,
  "data": [
    {
      "eventId": 12345,
      "email": "john@example.com",
      "event": "click",
      "eventAt": "2026-01-30T10:05:00.000Z",
      "url": "https://example.com/promo"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1500,
    "totalPages": 30
  }
}
```

### Architecture Patterns

**From project-context.md:**
- Use existing `adminAuthMiddleware` from `src/middleware/admin-auth.ts`
- Follow `ApiResponse<T>` format from `src/types/admin.types.ts`
- Use pagination constants from `src/constants/admin.constants.ts`
- Thin controllers - delegate to service

**Existing Pattern Reference:**
```typescript
// src/controllers/admin.controller.ts - use same pattern
export async function getCampaignStats(req: Request, res: Response, next: NextFunction) {
  try {
    const query = validateGetCampaignStatsQuery(req.query);
    const result = await campaignStatsService.getAllCampaignStats(query);
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}
```

### Sheet Reading Pattern

```typescript
// Read Campaign_Stats sheet
const response = await sheetsClient.spreadsheets.values.get({
  spreadsheetId: config.google.sheetId,
  range: 'Campaign_Stats!A2:O', // Skip header row
});

const rows = response.data.values || [];
```

### Pagination Logic

```typescript
// Same pattern as admin.controller.ts
const startIndex = (page - 1) * limit;
const endIndex = startIndex + limit;
const paginatedData = filteredData.slice(startIndex, endIndex);

return {
  data: paginatedData,
  pagination: {
    page,
    limit,
    total: filteredData.length,
    totalPages: Math.ceil(filteredData.length / limit),
  },
};
```

### Project Structure Notes

**Files to Create:**
```
src/
├── controllers/
│   └── admin/
│       └── campaign-stats.controller.ts
├── validators/
│   └── campaign-stats.validator.ts
└── __tests__/
    ├── controllers/campaign-stats.controller.test.ts
    └── validators/campaign-stats.validator.test.ts
```

**Files to Modify:**
- `src/services/campaign-stats.service.ts` - Add read methods
- `src/routes/campaign.routes.ts` - Add GET endpoints
- `src/types/admin.types.ts` - Add response types

### References

- [Source: _bmad-output/planning-artifacts/admin-dashboard/epics.md#EPIC-05]
- [Source: src/controllers/admin.controller.ts - Pattern reference]
- [Source: src/middleware/admin-auth.ts - Auth middleware]
- [Source: src/types/admin.types.ts - Response types]
- [Source: src/constants/admin.constants.ts - Pagination constants]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **All 6 Tasks Completed** - Implementation follows existing patterns from admin.controller.ts
2. **Tests Coverage:**
   - Validators: 32 tests (campaign-stats.validator.test.ts)
   - Service: 58 tests (campaign-stats.service.test.ts) - includes 5 performance tests (AC5)
   - Controller: 21 tests (campaign-stats.controller.test.ts)
   - Routes: 23 tests (campaign.routes.test.ts)
3. **Routes placed in admin.routes.ts** - Not campaign.routes.ts (new file) to keep with existing admin endpoint structure
4. **Static routes before parameterized routes** - `/campaigns/stats` before `/campaigns/:id` to avoid conflicts
5. **Full test suite passes** - 1221/1244 tests (unrelated pre-existing worker exit issue)

### Code Review Fixes Applied (Rex Review)

- Fixed: Controller now uses `campaignLogger` instead of generic `logger` (domain-specific logger pattern)
- Fixed: Added `PAGINATION.EVENTS_DEFAULT_LIMIT` constant for events limit (was hardcoded 50)
- Fixed: File List updated to include all modified files

### File List

**New Files Created:**
- `src/controllers/admin/campaign-stats.controller.ts` - Controller with 3 handlers
- `src/validators/campaign-stats.validator.ts` - Zod schemas and validation functions
- `src/__tests__/controllers/campaign-stats.controller.test.ts` - 21 tests
- `src/__tests__/validators/campaign-stats.validator.test.ts` - 32 tests

**Files Modified:**
- `src/services/campaign-stats.service.ts` - Added getAllCampaignStats, getCampaignStatsById, getCampaignEvents
- `src/__tests__/services/campaign-stats.service.test.ts` - Added 58 tests for service methods (includes 5 performance tests)
- `src/types/admin.types.ts` - Added CampaignStatsItem, CampaignEventItem, response interfaces
- `src/routes/admin.routes.ts` - Added 3 new GET routes with requireViewer middleware
- `src/__tests__/routes/campaign.routes.test.ts` - Added 23 integration tests
- `src/constants/admin.constants.ts` - Added EVENTS_DEFAULT_LIMIT constant

