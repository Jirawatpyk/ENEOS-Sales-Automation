# ENEOS Admin Dashboard - API Contract

> **Purpose:** Shared API contract document to prevent frontend/backend parameter mismatches.
> **Created:** Epic 4 Retrospective Action Item #1
> **Last Updated:** 2026-01-19

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
| `status` | string | No | - | enum: new, claimed, contacted, closed, lost, unreachable | Filter by status |
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
  industry: string;               // AI-analyzed
  website: string;
  capital: string;
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
  // Google Search Grounding fields (Story 4-15, 2026-01-26)
  juristicId: string | null;      // เลขทะเบียนนิติบุคคล 13 หลัก
  dbdSector: string | null;       // DBD Sector code (e.g., "F&B-M", "MFG-A")
  province: string | null;        // จังหวัด (e.g., "กรุงเทพมหานคร")
  fullAddress: string | null;     // ที่อยู่เต็มของบริษัท
}

type LeadStatus = 'new' | 'claimed' | 'contacted' | 'closed' | 'lost' | 'unreachable';
```

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
    industry: string;
    website: string;
    capital: string;
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
    leadSource: string | null;
    jobTitle: string | null;
    city: string | null;
    // Google Search Grounding fields (Story 4-15, 2026-01-26)
    juristicId: string | null;      // เลขทะเบียนนิติบุคคล 13 หลัก
    dbdSector: string | null;       // DBD Sector code (e.g., "F&B-M", "MFG-A")
    province: string | null;        // จังหวัด (e.g., "กรุงเทพมหานคร")
    fullAddress: string | null;     // ที่อยู่เต็มของบริษัท
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

## Google Search Grounding Fields (Story 4-15, 2026-01-26)

Grounding fields are enriched data from Gemini AI with Google Search integration, providing official company information from DBD (Department of Business Development) registration.

| Field | Type | Source | Backend Column | Description | Example |
|-------|------|--------|----------------|-------------|---------|
| `juristicId` | string \| null | Google Sheets Col AE | Juristic_ID | เลขทะเบียนนิติบุคคล 13 หลัก (13-digit company registration number) | `"0105563079446"` |
| `dbdSector` | string \| null | Google Sheets Col AF | DBD_Sector | DBD Sector classification code | `"F&B-M"`, `"MFG-A"`, `"TRAD-R"` |
| `province` | string \| null | Google Sheets Col AG | Province | จังหวัด (Province from official DBD registration) | `"กรุงเทพมหานคร"`, `"เชียงใหม่"` |
| `fullAddress` | string \| null | Google Sheets Col AH | Full_Address | ที่อยู่เต็มของบริษัท (Full registered address) | `"123 ถ.สุขุมวิท แขวงคลองเตย..."` |

**Data Flow:**
```
Brevo Webhook (new lead)
  ↓
Gemini AI + Google Search Grounding
  ↓
Google Sheets (Leads tab, columns AE-AH)
  ↓
Backend API (GET /api/admin/leads, GET /api/admin/leads/:id)
  ↓
Frontend UI (lead-table.tsx, lead-detail-sheet.tsx)
```

**UI Display:**
- **Lead Table**: `dbdSector` (badge in Company column), `province` (Location column with fallback to `city`)
- **Detail Sheet**: All 4 fields displayed in Company Information section
- **Capital Column**: Uses existing `capital` field (Column H, not grounding-specific but displayed alongside)

**Null Handling:**
- All grounding fields are nullable (legacy leads won't have these fields)
- Frontend uses smart fallbacks: `province || city || "-"`
- Empty badges not shown (cleaner UI)

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
| 2026-01-19 | Initial version from Epic 4 Retrospective | Amelia (Dev Agent) |
