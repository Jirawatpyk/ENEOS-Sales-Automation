# ENEOS Admin Dashboard - API Contract

> **Purpose:** Shared API contract document to prevent frontend/backend parameter mismatches.
> **Created:** Epic 4 Retrospective Action Item #1
> **Last Updated:** 2026-01-27 (Bugfix: Content-Disposition header format)

## Quick Reference: Parameter Mapping

| Frontend Param | Backend Param | Notes |
|----------------|---------------|-------|
| `sortBy=createdAt` | `sortBy=createdAt` or `date` | Both accepted (alias) |
| `sortOrder` | `sortOrder` | ✅ Same |
| `owner` | `owner` | LINE User ID |
| `status` | `status` | Single value |
| `leadSource` | `leadSource` | Story 4-14 |
| `search` | `search` | Max 100 chars |
| `page` | `page` | 1-indexed |
| `limit` | `limit` | Max 100 |

---

## Endpoints

### 1. GET /api/admin/leads

List leads with filtering, sorting, and pagination.

#### Query Parameters

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `page` | number | No | 1 | min: 1 | Page number (1-indexed) |
| `limit` | number | No | 20 | min: 1, max: 100 | Items per page |
| `status` | string | No | - | enum: new, claimed, contacted, closed, lost, unreachable | Filter by status. **Note:** `claimed` is a special filter (leads with salesOwnerId), not a database status value |
| `owner` | string | No | - | LINE User ID | Filter by sales owner |
| `campaign` | string | No | - | Campaign ID | Filter by campaign |
| `leadSource` | string | No | - | Any string or `__unknown__` | Filter by lead source |
| `search` | string | No | - | max: 100 chars | Search in company, customerName, email |
| `startDate` | string | No | - | ISO 8601 (YYYY-MM-DD) | Filter from date |
| `endDate` | string | No | - | ISO 8601 (YYYY-MM-DD) | Filter to date |
| `sortBy` | string | No | `date` | enum: date, createdAt, company, status, salesOwnerName | Sort column |
| `sortOrder` | string | No | `desc` | enum: asc, desc | Sort direction |

#### Response Format

```typescript
interface LeadsListResponse {
  success: boolean;
  data: {
    data: LeadItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters: {
      applied: AppliedFilters;
      available: {
        statuses: LeadStatus[];
        owners: { id: string; name: string }[];
        campaigns: { id: string; name: string }[];
        leadSources: string[];
      };
    };
  };
}

interface LeadItem {
  row: number;                    // Primary Key (Row number)
  date: string;                   // ISO 8601
  customerName: string;
  email: string;
  phone: string;
  company: string;
  industry: string;               // Generic English category (e.g., "Food & Beverage", "Manufacturing") - Changed from Thai format on 2026-01-26
  website: string;
  capital: string;
  juristicId: string | null;      // เลขทะเบียนนิติบุคคล 13 หลัก (from Google Search Grounding)
  dbdSector: string | null;       // DBD Sector code (e.g., "F&B-M", "MFG-A")
  province: string | null;        // จังหวัด (e.g., "กรุงเทพมหานคร", "เชียงใหม่")
  fullAddress: string | null;     // ที่อยู่เต็มของบริษัท
  status: LeadStatus;
  owner: {
    id: string;                   // LINE User ID
    name: string;
  } | null;
  campaign: {
    id: string;
    name: string;
  };
  source: string;
  talkingPoint: string;
  clickedAt: string;
  claimedAt: string | null;
  contactedAt: string | null;
  closedAt: string | null;
  leadSource: string | null;      // Story 4-14
  jobTitle: string | null;        // Story 4-11
  city: string | null;            // Story 4-11
}

type LeadStatus = 'new' | 'claimed' | 'contacted' | 'closed' | 'lost' | 'unreachable';
// Note: 'claimed' is only valid as a FILTER parameter, not as a stored status value
// Actual database statuses: 'new' | 'contacted' | 'closed' | 'lost' | 'unreachable'
```

#### Claimed Status Filter Behavior (2026-01-26)

**Important:** `status=claimed` is a special filter parameter, NOT a database status value.

**How it works:**
- `status=claimed` returns leads where `Sales_Owner_ID IS NOT NULL`
- The lead's actual status can be any value (new, contacted, closed, lost, unreachable)
- This filter is a convenience for "show me all claimed leads"

**Example:**
```http
GET /api/admin/leads?status=claimed
# Returns: All leads with assigned sales owner, regardless of their status
```

**Database statuses (actual values stored):**
- `new` - Lead created, no owner assigned
- `contacted` - Sales contacted the customer
- `closed` - Sale completed successfully
- `lost` - Sale lost/declined
- `unreachable` - Cannot contact customer

**Filter statuses (query parameters accepted):**
- All database statuses above, PLUS:
- `claimed` - Special filter for leads with `salesOwnerId !== null`

#### Field Format Changes (2026-01-26)

**Industry Field Migration**

The `industry` field format has been changed from **Thai-specific descriptions** to **generic English categories**.

**Before (Thai format):**
```json
{
  "industry": "การผลิตผงชูรสและวัตถุปรุงแต่งรสอาหาร",
  "dbdSector": "F&B-M",
  "dbdSectorDescription": "Food & Beverage Manufacturing"  // ❌ REMOVED
}
```

**After (Generic English):**
```json
{
  "industry": "Food & Beverage",  // ✅ Now uses generic English (merged from dbdSectorDescription)
  "dbdSector": "F&B-M"  // ✅ Still exists (sector code)
}
```

**⚠️ Migration Notes:**
- **Field removed:** `dbdSectorDescription` (merged into `industry`)
- **Field changed:** `industry` now uses generic English instead of Thai
- **Fields from Google Search Grounding** (accurate DBD data when grounding enabled):
  - `capital` - ทุนจดทะเบียน (e.g., "796,362,800 บาท")
  - `juristicId` - เลขทะเบียนนิติบุคคล 13 หลัก
  - `dbdSector` - DBD Sector code (e.g., "F&B-M", "MFG-A")
  - `province` - จังหวัด (e.g., "กรุงเทพมหานคร")
  - `fullAddress` - ที่อยู่เต็มของบริษัท
- Existing leads in Google Sheets may have Thai-format industry values
- New leads created after 2026-01-26 will use generic English format
- Frontend should handle both formats gracefully during transition period

**Example Values for `industry`:**
- "Food & Beverage"
- "Manufacturing"
- "Construction & Building"
- "Trading & Distribution"
- "IT & Technology"
- "Unknown" (when AI cannot determine)

#### Example Request

```bash
GET /api/admin/leads?page=1&limit=20&status=new&sortBy=createdAt&sortOrder=desc
```

---

### 2. GET /api/admin/leads/:id

Get single lead details.

#### Path Parameters

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `id` | number | Yes | min: 2 | Lead row number (row 1 is header) |

#### Response Format

```typescript
interface LeadDetailResponse {
  success: boolean;
  data: {
    row: number;
    date: string;
    customerName: string;
    email: string;
    phone: string;
    company: string;
    industry: string;               // Generic English category (changed from Thai format on 2026-01-26)
    website: string;
    capital: string;
    juristicId: string | null;      // เลขทะเบียนนิติบุคคล 13 หลัก (from Google Search Grounding)
    dbdSector: string | null;       // DBD Sector code (e.g., "F&B-M", "MFG-A")
    province: string | null;        // จังหวัด (e.g., "กรุงเทพมหานคร", "เชียงใหม่")
    fullAddress: string | null;     // ที่อยู่เต็มของบริษัท
    status: LeadStatus;
    owner: {
      id: string;
      name: string;
      email: string;
      phone: string;
    } | null;
    campaign: {
      id: string;
      name: string;
      subject: string;
    };
    source: string;
    leadId: string;
    eventId: string;
    talkingPoint: string;
    history: StatusHistoryItem[];
    metrics: {
      responseTime: number;    // minutes
      closingTime: number;     // minutes
      age: number;             // minutes
    };
  };
}
```

---

### 3. GET /api/admin/dashboard

Get dashboard summary with statistics.

#### Query Parameters

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `period` | string | No | `month` | enum: today, yesterday, week, month, quarter, year, custom | Time period |
| `startDate` | string | Conditional | - | ISO 8601 | Required if period=custom |
| `endDate` | string | Conditional | - | ISO 8601 | Required if period=custom |

#### Response Format

```typescript
interface DashboardResponse {
  success: boolean;
  data: {
    summary: {
      totalLeads: number;
      claimed: number;
      contacted: number;
      closed: number;
      lost: number;
      unreachable: number;
      conversionRate: number;     // percentage (0-100)
      changes: {
        totalLeads: number;       // % change vs previous period
        claimed: number;
        closed: number;
      };
    };
    trends: {
      daily: DailyTrend[];
    };
    statusDistribution: StatusDistribution;
    topSales: TopSalesPerson[];
    recentActivity: ActivityItem[];
    alerts: Alert[];
    period: PeriodInfo;
  };
}
```

---

### 4. GET /api/admin/sales-performance

Get sales team performance metrics.

#### Query Parameters

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `period` | string | No | `month` | enum: today, yesterday, week, month, quarter, year, custom | Time period |
| `startDate` | string | Conditional | - | ISO 8601 | Required if period=custom |
| `endDate` | string | Conditional | - | ISO 8601 | Required if period=custom |
| `sortBy` | string | No | `closed` | enum: claimed, closed, conversionRate | Sort column |
| `sortOrder` | string | No | `desc` | enum: asc, desc | Sort direction |

#### Response Format

```typescript
interface SalesPerformanceResponse {
  success: boolean;
  data: {
    period: PeriodInfo;
    team: SalesTeamMember[];
    totals: SalesTeamTotals;
    comparison: SalesComparison;
  };
}

interface SalesTeamMember {
  id: string;                    // LINE User ID
  name: string;
  email: string;
  phone: string;
  stats: {
    claimed: number;
    contacted: number;
    closed: number;
    lost: number;
    unreachable: number;
    conversionRate: number;      // percentage
    avgResponseTime: number;     // MINUTES (not seconds!)
    avgClosingTime: number;      // MINUTES (not seconds!)
  };
  target: {
    claimed: number;
    closed: number;
    progress: number;            // percentage (0-100)
  };
  trend: { week: string; closed: number }[];
}
```

---

### 5. GET /api/admin/sales-performance/trend

Get individual sales performance trend.

#### Query Parameters

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `userId` | string | Yes | - | LINE User ID | Sales person ID |
| `days` | number | No | 30 | enum: 7, 30, 90 | Trend period |

---

### 6. GET /api/admin/campaigns

Get campaign list with statistics.

#### Query Parameters

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `period` | string | No | `quarter` | enum: today, yesterday, week, month, quarter, year, custom | Time period |
| `startDate` | string | Conditional | - | ISO 8601 | Required if period=custom |
| `endDate` | string | Conditional | - | ISO 8601 | Required if period=custom |
| `sortBy` | string | No | `closed` | enum: leads, closed, conversionRate | Sort column |
| `sortOrder` | string | No | `desc` | enum: asc, desc | Sort direction |

---

### 7. GET /api/admin/export

Export lead data to file (Excel, CSV, or PDF).

**Updated:** Story 0-15 (2026-01-26) - Added grounding fields and claimed filter support

#### Query Parameters

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `type` | string | No | `leads` | enum: leads, all | Data type to export |
| `format` | string | No | `xlsx` | enum: xlsx, csv, pdf | Export file format |
| `startDate` | string | No | - | ISO 8601 (YYYY-MM-DD) | Filter from date |
| `endDate` | string | No | - | ISO 8601 (YYYY-MM-DD) | Filter to date |
| `status` | string | No | - | enum: new, claimed, contacted, closed, lost, unreachable | Filter by status |
| `owner` | string | No | - | LINE User ID | Filter by sales owner |
| `campaign` | string | No | - | Campaign ID | Filter by campaign |

#### Response Formats

**Excel (.xlsx):**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Includes 23 columns with formatted headers and auto-width
- Max rows: 10,000 (configurable)

**CSV (.csv):**
- Content-Type: `text/csv; charset=utf-8`
- UTF-8 encoding with BOM for Excel compatibility
- Same 23 columns as Excel
- Max rows: 10,000

**PDF (.pdf):**
- Content-Type: `application/pdf`
- Preview limited to 100 rows
- Includes key fields: Company, DBD Sector, Juristic ID, Contact Name, Status, Sales Owner
- **Thai Font Support:** Uses TH Sarabun New font for proper Thai character rendering
- Fallback to default font if Thai font unavailable

#### Export Columns (23 total)

Columns exported in this order:

1. Row
2. Company
3. DBD Sector _(Story 0-15)_
4. Industry
5. Juristic ID _(Story 0-15)_
6. Capital
7. Location _(Story 0-15 - `province || city`)_
8. Full Address _(Story 0-15)_
9. Contact Name
10. Phone
11. Email
12. Job Title _(Story 0-15)_
13. Website
14. Lead Source _(Story 0-15)_
15. Status
16. Sales Owner
17. Campaign
18. Source
19. Talking Point
20. Created Date
21. Clicked At
22. Contacted At _(Story 0-15)_
23. Closed At

#### Claimed Filter Behavior

`status=claimed` is a special filter that returns leads with `salesOwnerId !== null` regardless of their actual status value.

**Example:**
```http
GET /api/admin/export?status=claimed&format=xlsx
# Returns: All leads with assigned sales owner (claimed leads)
```

#### Example Requests

**Export all leads to Excel:**
```http
GET /api/admin/export?type=leads&format=xlsx
```

**Export claimed leads from January 2026:**
```http
GET /api/admin/export?status=claimed&startDate=2026-01-01&endDate=2026-01-31&format=xlsx
```

**Export contacted leads to CSV:**
```http
GET /api/admin/export?status=contacted&format=csv
```

**Export closed leads to PDF:**
```http
GET /api/admin/export?status=closed&format=pdf
```

#### Response Headers

```
Content-Type: [format-specific MIME type]
Content-Disposition: attachment; filename=leads_export_2026-01-26.[xlsx|csv|pdf]
```

**Note:** Filename does not use quotes (RFC 2616 format). This prevents browser download issues where extra characters appear after the file extension.

#### Error Responses

- **400**: Validation error (invalid parameters)
- **500**: Server error (export failed)

---

## Constants Reference

### Pagination

```typescript
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};
```

### Lead Status Values

```typescript
const LEAD_STATUSES = [
  'new',
  'claimed',
  'contacted',
  'closed',
  'lost',
  'unreachable',
] as const;
```

### Sort Options

```typescript
const SORT_OPTIONS = {
  LEADS: ['date', 'createdAt', 'company', 'status', 'salesOwnerName'],
  SALES: ['claimed', 'closed', 'conversionRate'],
  CAMPAIGNS: ['leads', 'closed', 'conversionRate'],
};

const SORT_ORDERS = ['asc', 'desc'];
```

### Period Values

```typescript
const VALID_PERIODS = [
  'today',
  'yesterday',
  'week',
  'month',
  'quarter',
  'year',
  'custom',
];
```

---

## Critical Rules

### 1. Time Values Are in MINUTES

All time-related metrics (responseTime, closingTime, age) are returned in **minutes**, not seconds or milliseconds.

```typescript
// CORRECT interpretation
avgResponseTime: 45  // means 45 minutes

// WRONG interpretation
avgResponseTime: 45  // NOT 45 seconds
```

### 2. Row Number = Primary Key

Lead ID is the row number in Google Sheets. Row 1 is the header, so valid IDs start from 2.

```typescript
// Valid lead IDs
lead.row >= 2

// Invalid
lead.row === 1  // This is the header row
```

### 3. SortBy Aliases

For leads, `createdAt` and `date` are equivalent:

```typescript
// These produce the same result
sortBy=createdAt
sortBy=date
```

### 4. Unknown Lead Source

To filter leads with null/empty leadSource, use the special value:

```typescript
// Filter leads with no source
leadSource=__unknown__
```

---

## Error Responses

All endpoints return errors in this format:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: AdminApiErrorCode;
    message: string;
    details?: unknown;
  };
}

type AdminApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Invalid query parameters |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Not @eneos.co.th domain |
| 404 | NOT_FOUND | Resource not found |
| 429 | RATE_LIMIT | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

---

## Frontend API Proxy Pattern

Frontend must call backend through Next.js API routes, never directly.

```
Frontend Component
    ↓
Next.js API Route (/app/api/admin/leads/route.ts)
    ↓
Backend API (Express /api/admin/leads)
```

### Parameter Transformation (if needed)

```typescript
// In Next.js API route
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Map frontend params to backend params (if different)
  const backendParams = new URLSearchParams();

  // Direct pass-through (same name)
  ['page', 'limit', 'status', 'owner', 'search', 'sortBy', 'sortOrder'].forEach(param => {
    const value = searchParams.get(param);
    if (value) backendParams.set(param, value);
  });

  // Call backend
  const response = await fetch(`${BACKEND_URL}/api/admin/leads?${backendParams}`);
  // ...
}
```

---

## Source Files

| File | Purpose |
|------|---------|
| `src/types/admin.types.ts` | TypeScript type definitions |
| `src/validators/admin.validators.ts` | Zod validation schemas |
| `src/constants/admin.constants.ts` | Constants and enums |
| `src/controllers/admin.controller.ts` | API implementation |

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-26 | Changed `industry` field from Thai to generic English format. Removed `dbdSectorDescription` (merged into `industry`). | Tech Writer + Amelia |
| 2026-01-19 | Initial version from Epic 4 Retrospective | Amelia (Dev Agent) |
