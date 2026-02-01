# API Contracts - Backend API

**Project:** ENEOS Sales Automation
**Part:** Backend (Express.js)
**Generated:** 2026-02-01

---

## Overview

The Backend API provides 25+ REST endpoints for the ENEOS Sales Automation system. All `/api/admin/*` endpoints require Google OAuth authentication via Bearer token.

---

## Authentication

All admin routes use `adminAuthMiddleware` with role-based access control (RBAC):

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | Full access | All endpoints including export, team management |
| `viewer` | Read-only access | Dashboard, leads list, campaigns (no export) |

**Header:** `Authorization: Bearer <google_id_token>`

---

## Endpoints

### User Info

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/me` | Any | Get current user info with role |

**Response:**
```typescript
{
  success: boolean;
  data: {
    email: string;
    name: string;
    role: 'admin' | 'viewer';
  }
}
```

---

### Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/dashboard` | viewer+ | Dashboard summary with KPIs |

**Query Params:**
- `period`: today | yesterday | week | month | quarter | year | custom
- `startDate`: ISO date (for custom)
- `endDate`: ISO date (for custom)

**Response:** `DashboardResponse` with summary, trends, status distribution, top sales, alerts

---

### Leads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/leads` | viewer+ | Paginated leads list with filters |
| GET | `/api/admin/leads/:id` | viewer+ | Single lead detail with history |

**Query Params (leads list):**
- `page`, `limit` (max 100)
- `status`: new | claimed | contacted | closed | lost | unreachable
- `owner`: Sales team LINE User ID
- `campaign`: Campaign ID
- `search`: Text search (company, name, email)
- `startDate`, `endDate`: ISO dates
- `sortBy`: date | company | status
- `sortOrder`: asc | desc

---

### Sales Team

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/sales-team` | viewer+ | Sales team list for dropdowns |
| GET | `/api/admin/sales-team/list` | admin | Full team list with status/role |
| POST | `/api/admin/sales-team` | admin | Create new team member |
| GET | `/api/admin/sales-team/:lineUserId` | admin | Get single member |
| PATCH | `/api/admin/sales-team/:lineUserId` | admin | Update member |

**Team Linking (Story 7-4b):**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/sales-team/unlinked-line-accounts` | admin | LINE accounts without dashboard members |
| GET | `/api/admin/sales-team/unlinked-dashboard-members` | admin | Dashboard members without LINE accounts |
| PATCH | `/api/admin/sales-team/email/:email/link` | admin | Link LINE account to member |

---

### Sales Performance

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/sales-performance` | viewer+ | Team performance metrics |
| GET | `/api/admin/sales-performance/trend` | viewer+ | Individual daily trend |

**Query Params (performance):**
- `period`: today | yesterday | week | month | quarter | year | custom
- `sortBy`: claimed | closed | conversionRate
- `sortOrder`: asc | desc

**Query Params (trend):**
- `userId`: LINE User ID (required)
- `days`: 7 | 30 | 90 (default: 30)

---

### Campaigns

**Email Metrics (Story 5-2):**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/campaigns/stats` | viewer+ | Campaign email metrics list |
| GET | `/api/admin/campaigns/:id/stats` | viewer+ | Single campaign metrics |
| GET | `/api/admin/campaigns/:id/events` | viewer+ | Campaign event log |

**Legacy Lead-based Analytics:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/campaigns` | viewer+ | Campaign analytics from leads |
| GET | `/api/admin/campaigns/:campaignId` | viewer+ | Campaign detail |

---

### Activity Log (Story 7-7)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/activity-log` | admin | Status change audit log |

**Query Params:**
- `page`, `limit` (max 100)
- `from`, `to`: ISO dates
- `status`: Comma-separated status values
- `changedBy`: LINE User ID or 'System'

---

### Export

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/api/admin/export` | admin | 10/hour | Export data to file |

**Query Params:**
- `type`: leads | sales | campaigns | all (required)
- `format`: xlsx | csv | pdf (required)
- `startDate`, `endDate`: ISO dates
- `status`, `owner`, `campaign`: Filters
- `fields`: Comma-separated field names

---

### Webhook Endpoints (No Auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhook/brevo` | Brevo automation webhook (create lead) |
| POST | `/webhook/brevo/campaign` | Brevo campaign events (email metrics) |
| POST | `/webhook/line` | LINE webhook (postback actions) |

---

### Health & Status

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Full health check with service status |
| GET | `/ready` | Readiness check |
| GET | `/live` | Liveness check |
| GET | `/metrics` | Prometheus metrics |
| GET | `/metrics/summary` | Human-readable metrics JSON |
| GET | `/api-docs.json` | OpenAPI specification |

---

## Error Responses

All endpoints return standardized errors:

```typescript
{
  success: false;
  error: {
    code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'RATE_LIMIT' | 'INTERNAL_ERROR';
    message: string;
    details?: unknown;
  }
}
```

---

## Rate Limiting

- **Global:** 100 requests per 60 seconds
- **Export:** 10 requests per hour per user
