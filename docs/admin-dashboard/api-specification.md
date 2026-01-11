# Admin Dashboard - API Specification

> API Endpoints สำหรับ Admin Dashboard
> Version: 1.0.0 | Last Updated: 2024-01

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Common Patterns](#3-common-patterns)
4. [Dashboard Endpoints](#4-dashboard-endpoints)
5. [Sales Performance Endpoints](#5-sales-performance-endpoints)
6. [Leads Endpoints](#6-leads-endpoints)
7. [Campaigns Endpoints](#7-campaigns-endpoints)
8. [Export Endpoints](#8-export-endpoints)
9. [Error Responses](#9-error-responses)

---

## 1. Overview

### 1.1 Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://api.eneos-sales.com` |
| Staging | `https://staging-api.eneos-sales.com` |
| Development | `http://localhost:3000` |

### 1.2 API Version

All Admin APIs are prefixed with `/api/admin/`

### 1.3 Content Type

```
Content-Type: application/json
Accept: application/json
```

---

## 2. Authentication

### 2.1 Authentication Method

Bearer Token (Google OAuth Access Token)

```http
Authorization: Bearer <access_token>
```

### 2.2 Token Validation

Backend จะ verify token กับ Google และตรวจสอบ:
- Token ยังไม่หมดอายุ
- Email domain เป็น `@eneos.co.th`

### 2.3 Authentication Errors

```json
// 401 Unauthorized - Missing or invalid token
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}

// 403 Forbidden - Invalid domain
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Only @eneos.co.th accounts allowed"
  }
}
```

---

## 3. Common Patterns

### 3.1 Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### 3.2 Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {} // Optional additional details
  }
}
```

### 3.3 Pagination

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "totalPages": 16,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 3.4 Date Format

All dates are in ISO 8601 format: `2024-01-15T10:30:00.000Z`

### 3.5 Time/Duration Units

| Field | Unit | Description |
|-------|------|-------------|
| `avgResponseTime` | minutes | เวลาเฉลี่ยที่เซลล์ใช้ในการรับ lead (claimed - new) |
| `avgClosingTime` | minutes | เวลาเฉลี่ยที่ใช้ในการปิดการขาย (closed - claimed) |
| `metrics.age` | minutes | อายุของ lead ตั้งแต่สร้าง |
| `metrics.responseTime` | minutes | Response time สำหรับ lead นั้นๆ |
| `metrics.closingTime` | minutes | Closing time สำหรับ lead นั้นๆ |
| `estimatedTime` | seconds | เวลาประมาณสำหรับ async jobs |

**ตัวอย่างการแปลงค่า:**
- `avgResponseTime: 15` = 15 นาที
- `avgClosingTime: 7200` = 5 วัน (7200 / 60 / 24 = 5)
- `metrics.age: 12960` = 9 วัน

### 3.6 Period Parameter

```
?period=today      // Today
?period=yesterday  // Yesterday
?period=week       // This week (Mon-Sun)
?period=month      // This month
?period=quarter    // This quarter
?period=year       // This year
?period=custom&startDate=2024-01-01&endDate=2024-01-31  // Custom range
```

---

## 4. Dashboard Endpoints

### 4.1 GET /api/admin/dashboard

Get dashboard summary data.

#### Request

```http
GET /api/admin/dashboard?period=month
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | string | No | Time period (default: month) |
| startDate | string | No | Custom start date (ISO 8601) |
| endDate | string | No | Custom end date (ISO 8601) |

#### Response

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalLeads": 156,
      "claimed": 89,
      "contacted": 42,
      "closed": 23,
      "lost": 14,
      "unreachable": 8,
      "conversionRate": 14.74,
      "changes": {
        "totalLeads": 12.5,
        "claimed": 8.3,
        "closed": -5.2
      }
    },
    "trend": [
      {
        "date": "2024-01-01",
        "leads": 5,
        "claimed": 4,
        "contacted": 3,
        "closed": 1
      },
      {
        "date": "2024-01-02",
        "leads": 8,
        "claimed": 7,
        "contacted": 5,
        "closed": 2
      }
      // ... more dates
    ],
    "statusDistribution": {
      "new": 24,
      "claimed": 89,
      "contacted": 42,
      "closed": 23,
      "lost": 14,
      "unreachable": 8
    },
    "topSales": [
      {
        "id": "U123456789",
        "name": "สมชาย",
        "email": "somchai@eneos.co.th",
        "claimed": 25,
        "contacted": 20,
        "closed": 8,
        "conversionRate": 32.0,
        "rank": 1
      },
      {
        "id": "U234567890",
        "name": "สมหญิง",
        "email": "somying@eneos.co.th",
        "claimed": 22,
        "contacted": 18,
        "closed": 6,
        "conversionRate": 27.3,
        "rank": 2
      }
      // ... top 5
    ],
    "recentActivity": [
      {
        "id": "act_001",
        "type": "closed",
        "salesId": "U123456789",
        "salesName": "สมชาย",
        "leadId": 42,
        "company": "ABC Corporation",
        "customerName": "John Doe",
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": "act_002",
        "type": "claimed",
        "salesId": "U234567890",
        "salesName": "สมหญิง",
        "leadId": 55,
        "company": "XYZ Ltd",
        "customerName": "Jane Smith",
        "timestamp": "2024-01-15T10:15:00.000Z"
      }
      // ... last 10 activities
    ],
    "alerts": [
      {
        "id": "alert_001",
        "type": "unclaimed",
        "severity": "warning",
        "message": "5 leads ไม่มีคนรับเกิน 24 ชั่วโมง",
        "count": 5,
        "action": {
          "label": "View Leads",
          "url": "/leads?status=new&age=24h"
        }
      },
      {
        "id": "alert_002",
        "type": "stale",
        "severity": "info",
        "message": "3 leads ติดต่อแล้วเกิน 7 วัน",
        "count": 3,
        "action": {
          "label": "View Leads",
          "url": "/leads?status=contacted&age=7d"
        }
      }
    ],
    "period": {
      "type": "month",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.999Z"
    }
  }
}
```

---

## 5. Sales Performance Endpoints

### 5.1 GET /api/admin/sales-performance

Get sales team performance data.

#### Request

```http
GET /api/admin/sales-performance?period=month
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | string | No | Time period (default: month) |
| startDate | string | No | Custom start date |
| endDate | string | No | Custom end date |
| sortBy | string | No | Sort field (claimed, closed, conversionRate) |
| sortOrder | string | No | asc or desc (default: desc) |

#### Response

```json
{
  "success": true,
  "data": {
    "period": {
      "type": "month",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.999Z"
    },
    "team": [
      {
        "id": "U123456789",
        "name": "สมชาย",
        "email": "somchai@eneos.co.th",
        "phone": "081-234-5678",
        "avatar": "https://lh3.googleusercontent.com/...",
        "stats": {
          "claimed": 25,
          "contacted": 20,
          "closed": 8,
          "lost": 2,
          "unreachable": 1,
          "conversionRate": 32.0,
          "avgResponseTime": 15,
          "avgClosingTime": 120
        },
        "target": {
          "claimed": 30,
          "closed": 10,
          "progress": 80.0
        },
        "trend": [
          { "week": "W1", "closed": 2 },
          { "week": "W2", "closed": 3 },
          { "week": "W3", "closed": 2 },
          { "week": "W4", "closed": 1 }
        ]
      },
      {
        "id": "U234567890",
        "name": "สมหญิง",
        "email": "somying@eneos.co.th",
        "phone": "081-234-5679",
        "stats": {
          "claimed": 22,
          "contacted": 18,
          "closed": 6,
          "lost": 3,
          "unreachable": 2,
          "conversionRate": 27.3,
          "avgResponseTime": 22,
          "avgClosingTime": 150
        },
        "target": {
          "claimed": 30,
          "closed": 10,
          "progress": 60.0
        },
        "trend": [
          { "week": "W1", "closed": 1 },
          { "week": "W2", "closed": 2 },
          { "week": "W3", "closed": 2 },
          { "week": "W4", "closed": 1 }
        ]
      }
      // ... all sales team members
    ],
    "totals": {
      "teamSize": 5,
      "claimed": 92,
      "contacted": 68,
      "closed": 24,
      "lost": 12,
      "unreachable": 5,
      "conversionRate": 26.1,
      "avgResponseTime": 30,
      "avgClosingTime": 140
    },
    "comparison": {
      "previousPeriod": {
        "claimed": 85,
        "closed": 22,
        "conversionRate": 25.9
      },
      "changes": {
        "claimed": 8.2,
        "closed": 9.1,
        "conversionRate": 0.8
      }
    }
  }
}
```

### 5.2 GET /api/admin/sales-performance/:userId

Get individual sales person performance.

#### Request

```http
GET /api/admin/sales-performance/U123456789?period=month
Authorization: Bearer <token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "U123456789",
      "name": "สมชาย",
      "email": "somchai@eneos.co.th",
      "phone": "081-234-5678"
    },
    "stats": {
      "claimed": 25,
      "contacted": 20,
      "closed": 8,
      "lost": 2,
      "unreachable": 1,
      "conversionRate": 32.0,
      "avgResponseTime": 15
    },
    "leads": [
      {
        "row": 42,
        "company": "ABC Corporation",
        "status": "closed",
        "claimedAt": "2024-01-10T11:00:00.000Z",
        "closedAt": "2024-01-15T14:30:00.000Z"
      }
      // ... recent leads
    ],
    "dailyTrend": [
      { "date": "2024-01-01", "claimed": 2, "closed": 1 },
      { "date": "2024-01-02", "claimed": 1, "closed": 0 }
      // ... daily data
    ]
  }
}
```

---

## 6. Leads Endpoints

### 6.1 GET /api/admin/leads

Get paginated list of leads.

#### Request

```http
GET /api/admin/leads?page=1&limit=10&status=new&search=ABC
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 10, max: 100) |
| status | string | No | Filter by status (new, claimed, contacted, closed, lost, unreachable) |
| owner | string | No | Filter by owner LINE User ID |
| campaign | string | No | Filter by campaign ID |
| search | string | No | Search in company, customerName, email |
| startDate | string | No | Filter by date range start |
| endDate | string | No | Filter by date range end |
| sortBy | string | No | Sort field (date, company, status) |
| sortOrder | string | No | asc or desc (default: desc) |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "row": 42,
      "date": "2024-01-10T10:30:00.000Z",
      "customerName": "John Doe",
      "email": "john.doe@abc.com",
      "phone": "081-234-5678",
      "company": "ABC Corporation",
      "industry": "Manufacturing",
      "website": "https://abc.com",
      "capital": "10,000,000 THB",
      "status": "closed",
      "owner": {
        "id": "U123456789",
        "name": "สมชาย"
      },
      "campaign": {
        "id": "camp_123",
        "name": "Q1 Promotion 2024"
      },
      "source": "brevo_click",
      "talkingPoint": "ENEOS มีน้ำมันหล่อลื่นสำหรับเครื่องจักรในโรงงาน...",
      "clickedAt": "2024-01-10T10:30:00.000Z",
      "claimedAt": "2024-01-10T11:00:00.000Z",
      "contactedAt": "2024-01-12T09:15:00.000Z",
      "closedAt": "2024-01-15T14:30:00.000Z"
    }
    // ... more leads
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 156,
    "totalPages": 16,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "applied": {
      "status": "new",
      "search": "ABC"
    },
    "available": {
      "statuses": ["new", "claimed", "contacted", "closed", "lost", "unreachable"],
      "owners": [
        { "id": "U123456789", "name": "สมชาย" },
        { "id": "U234567890", "name": "สมหญิง" }
      ],
      "campaigns": [
        { "id": "camp_123", "name": "Q1 Promotion 2024" },
        { "id": "camp_124", "name": "Industrial Oil Launch" }
      ]
    }
  }
}
```

### 6.2 GET /api/admin/leads/:rowNumber

Get single lead details.

#### Request

```http
GET /api/admin/leads/42
Authorization: Bearer <token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "row": 42,
    "date": "2024-01-10T10:30:00.000Z",
    "customerName": "John Doe",
    "email": "john.doe@abc.com",
    "phone": "081-234-5678",
    "company": "ABC Corporation",
    "industry": "Manufacturing",
    "website": "https://abc.com",
    "capital": "10,000,000 THB",
    "status": "closed",
    "owner": {
      "id": "U123456789",
      "name": "สมชาย",
      "email": "somchai@eneos.co.th",
      "phone": "081-234-5678"
    },
    "campaign": {
      "id": "camp_123",
      "name": "Q1 Promotion 2024",
      "subject": "ENEOS น้ำมันหล่อลื่นคุณภาพสูง"
    },
    "source": "brevo_click",
    "leadId": "lead_abc123",
    "eventId": "event_xyz789",
    "talkingPoint": "ENEOS มีน้ำมันหล่อลื่นสำหรับเครื่องจักรในโรงงาน Manufacturing โดยเฉพาะ สามารถช่วยลดต้นทุนการบำรุงรักษาได้ถึง 20%",
    "history": [
      {
        "status": "closed",
        "by": "สมชาย",
        "timestamp": "2024-01-15T14:30:00.000Z"
      },
      {
        "status": "contacted",
        "by": "สมชาย",
        "timestamp": "2024-01-12T09:15:00.000Z"
      },
      {
        "status": "claimed",
        "by": "สมชาย",
        "timestamp": "2024-01-10T11:00:00.000Z"
      },
      {
        "status": "new",
        "by": "System",
        "timestamp": "2024-01-10T10:30:00.000Z"
      }
    ],
    "metrics": {
      "responseTime": 30,
      "closingTime": 7200,
      "age": 12960
    }
  }
}
```

### 6.3 GET /api/admin/leads/stats

Get leads statistics.

#### Request

```http
GET /api/admin/leads/stats?period=month
Authorization: Bearer <token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "total": 156,
    "byStatus": {
      "new": 24,
      "claimed": 89,
      "contacted": 42,
      "closed": 23,
      "lost": 14,
      "unreachable": 8
    },
    "byCampaign": [
      { "id": "camp_123", "name": "Q1 Promotion", "count": 45 },
      { "id": "camp_124", "name": "Industrial Oil", "count": 38 }
    ],
    "byOwner": [
      { "id": "U123456789", "name": "สมชาย", "count": 25 },
      { "id": "U234567890", "name": "สมหญิง", "count": 22 }
    ],
    "byIndustry": [
      { "industry": "Manufacturing", "count": 45 },
      { "industry": "Automotive", "count": 32 }
    ],
    "averages": {
      "responseTime": 30,
      "closingTime": 7200
    }
  }
}
```

---

## 7. Campaigns Endpoints

### 7.1 GET /api/admin/campaigns

Get campaign analytics.

#### Request

```http
GET /api/admin/campaigns?period=quarter
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | string | No | Time period (default: quarter) |
| startDate | string | No | Custom start date |
| endDate | string | No | Custom end date |
| sortBy | string | No | Sort field (leads, closed, conversionRate) |

#### Response

```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "camp_123",
        "name": "Q1 Promotion 2024",
        "subject": "ENEOS น้ำมันหล่อลื่นคุณภาพสูง",
        "startDate": "2024-01-01T00:00:00.000Z",
        "stats": {
          "leads": 45,
          "claimed": 40,
          "contacted": 30,
          "closed": 12,
          "lost": 5,
          "unreachable": 3,
          "conversionRate": 26.7,
          "claimRate": 88.9,
          "estimatedRevenue": 850000
        },
        "trend": [
          { "week": "W1", "leads": 15, "closed": 3 },
          { "week": "W2", "leads": 12, "closed": 4 },
          { "week": "W3", "leads": 10, "closed": 3 },
          { "week": "W4", "leads": 8, "closed": 2 }
        ]
      },
      {
        "id": "camp_124",
        "name": "Industrial Oil Launch",
        "subject": "เปิดตัวน้ำมันอุตสาหกรรมใหม่",
        "startDate": "2024-01-15T00:00:00.000Z",
        "stats": {
          "leads": 38,
          "claimed": 35,
          "contacted": 25,
          "closed": 8,
          "lost": 4,
          "unreachable": 2,
          "conversionRate": 21.1,
          "claimRate": 92.1,
          "estimatedRevenue": 620000
        },
        "trend": [
          { "week": "W3", "leads": 20, "closed": 4 },
          { "week": "W4", "leads": 18, "closed": 4 }
        ]
      }
      // ... more campaigns
    ],
    "totals": {
      "campaigns": 12,
      "leads": 156,
      "claimed": 140,
      "closed": 28,
      "conversionRate": 17.9,
      "estimatedRevenue": 2100000
    },
    "comparison": {
      "previousPeriod": {
        "leads": 142,
        "closed": 24,
        "conversionRate": 16.9
      },
      "changes": {
        "leads": 9.9,
        "closed": 16.7,
        "conversionRate": 5.9
      }
    },
    "topPerformers": [
      { "id": "camp_123", "name": "Q1 Promotion", "conversionRate": 26.7 }
    ],
    "period": {
      "type": "quarter",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-03-31T23:59:59.999Z"
    }
  }
}
```

### 7.2 GET /api/admin/campaigns/:campaignId

Get single campaign details.

#### Request

```http
GET /api/admin/campaigns/camp_123
Authorization: Bearer <token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "campaign": {
      "id": "camp_123",
      "name": "Q1 Promotion 2024",
      "subject": "ENEOS น้ำมันหล่อลื่นคุณภาพสูง",
      "startDate": "2024-01-01T00:00:00.000Z"
    },
    "stats": {
      "leads": 45,
      "claimed": 40,
      "contacted": 30,
      "closed": 12,
      "conversionRate": 26.7
    },
    "leadsByStatus": {
      "new": 5,
      "claimed": 8,
      "contacted": 10,
      "closed": 12,
      "lost": 5,
      "unreachable": 5
    },
    "leadsBySales": [
      { "id": "U123456789", "name": "สมชาย", "count": 15, "closed": 5 },
      { "id": "U234567890", "name": "สมหญิง", "count": 12, "closed": 4 }
    ],
    "dailyTrend": [
      { "date": "2024-01-01", "leads": 3, "closed": 0 },
      { "date": "2024-01-02", "leads": 5, "closed": 1 }
      // ... daily data
    ],
    "recentLeads": [
      {
        "row": 42,
        "company": "ABC Corporation",
        "status": "closed",
        "date": "2024-01-10T10:30:00.000Z"
      }
      // ... last 10 leads
    ]
  }
}
```

---

## 8. Export Endpoints

### 8.1 GET /api/admin/export

Export data to file.

#### Request

```http
GET /api/admin/export?type=leads&format=xlsx&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | Data type (leads, sales, campaigns, all) |
| format | string | Yes | Output format (xlsx, csv, pdf) |
| startDate | string | No | Start date filter |
| endDate | string | No | End date filter |
| status | string | No | Status filter (for leads) |
| owner | string | No | Owner filter (for leads) |
| campaign | string | No | Campaign filter (for leads) |
| fields | string | No | Comma-separated field names to include |

#### Response

Returns binary file with appropriate headers:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="leads_2024-01.xlsx"
```

### 8.2 POST /api/admin/export/async

Start async export job (for large datasets).

#### Request

```http
POST /api/admin/export/async
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "leads",
  "format": "xlsx",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },
  "notifyEmail": "manager@eneos.co.th"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "jobId": "export_abc123",
    "status": "processing",
    "estimatedTime": 60,
    "message": "Export started. You will receive an email when ready."
  }
}
```

### 8.3 GET /api/admin/export/jobs/:jobId

Check export job status.

#### Response

```json
{
  "success": true,
  "data": {
    "jobId": "export_abc123",
    "status": "completed",
    "downloadUrl": "https://storage.eneos-sales.com/exports/leads_2024.xlsx",
    "expiresAt": "2024-01-16T10:30:00.000Z",
    "fileSize": 1048576,
    "rowCount": 5000
  }
}
```

---

## 9. Error Responses

### 9.1 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### 9.2 Error Response Examples

#### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "page": "must be a positive integer",
      "limit": "must be between 1 and 100"
    }
  }
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Lead not found",
    "details": {
      "row": 999
    }
  }
}
```

#### 429 Rate Limit
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60,
      "limit": 100,
      "remaining": 0
    }
  }
}
```

#### 500 Internal Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "requestId": "req_abc123"
  }
}
```

---

## 10. Rate Limiting

### 10.1 Limits

| Endpoint | Rate Limit |
|----------|------------|
| Dashboard | 60 requests/minute |
| Leads (list) | 60 requests/minute |
| Leads (detail) | 120 requests/minute |
| Export | 10 requests/minute |
| Other | 100 requests/minute |

### 10.2 Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

---

## 11. Backend Implementation Notes

> **สำคัญ:** API endpoints เหล่านี้ต้องสร้างใหม่ใน Backend (eneos-sales-automation)

### 11.1 Endpoints ที่ต้องสร้าง

| Endpoint | Status | Priority | Notes |
|----------|--------|----------|-------|
| `GET /api/admin/dashboard` | **ต้องสร้าง** | High | Aggregation from Leads sheet |
| `GET /api/admin/leads` | **ต้องสร้าง** | High | Paginated list with filters |
| `GET /api/admin/leads/:id` | **ต้องสร้าง** | High | Single lead detail |
| `GET /api/admin/leads/stats` | **ต้องสร้าง** | Medium | Statistics aggregation |
| `GET /api/admin/sales-performance` | **ต้องสร้าง** | High | Team performance data |
| `GET /api/admin/sales-performance/:userId` | **ต้องสร้าง** | Medium | Individual performance |
| `GET /api/admin/campaigns` | **ต้องสร้าง** | Medium | Campaign analytics |
| `GET /api/admin/campaigns/:id` | **ต้องสร้าง** | Low | Single campaign detail |
| `GET /api/admin/export` | **ต้องสร้าง** | Medium | Export data to file |

### 11.2 Backend Middleware ที่ต้องเพิ่ม

```typescript
// ต้องเพิ่ม middleware สำหรับ /api/admin/* routes

// 1. Google OAuth Token Validation
// - รับ Bearer token จาก Authorization header
// - Verify กับ Google OAuth API
// - ตรวจสอบ token ยังไม่หมดอายุ

// 2. Domain Restriction
// - ตรวจสอบ email ต้องลงท้ายด้วย @eneos.co.th
// - Return 403 ถ้าไม่ใช่ domain ที่อนุญาต

// 3. Rate Limiting
// - แยก rate limit สำหรับ admin endpoints
// - Stricter limits สำหรับ export endpoints
```

### 11.3 Google Sheets Data Aggregation

```typescript
// Dashboard aggregation ต้องคำนวณจาก Leads sheet:

// Summary counts:
// - totalLeads: COUNT all rows
// - claimed: COUNT WHERE Sales_Owner_ID IS NOT NULL
// - contacted: COUNT WHERE Status = 'contacted'
// - closed: COUNT WHERE Status = 'closed'
// - lost: COUNT WHERE Status = 'lost'
// - unreachable: COUNT WHERE Status = 'unreachable'

// Conversion rate:
// - conversionRate: (closed / totalLeads) * 100

// Trend data:
// - GROUP BY Date, COUNT per status

// Alert calculations:
// - unclaimed: WHERE Status = 'new' AND (NOW - Date) > 24 hours
// - stale: WHERE Status = 'contacted' AND (NOW - Last_Update) > 7 days
```

### 11.4 cURL Examples

```bash
# Get Dashboard
curl -X GET "http://localhost:3000/api/admin/dashboard?period=month" \
  -H "Authorization: Bearer <google-access-token>" \
  -H "Content-Type: application/json"

# Get Leads (paginated)
curl -X GET "http://localhost:3000/api/admin/leads?page=1&limit=10&status=new" \
  -H "Authorization: Bearer <google-access-token>" \
  -H "Content-Type: application/json"

# Get Single Lead
curl -X GET "http://localhost:3000/api/admin/leads/42" \
  -H "Authorization: Bearer <google-access-token>" \
  -H "Content-Type: application/json"

# Export to Excel
curl -X GET "http://localhost:3000/api/admin/export?type=leads&format=xlsx" \
  -H "Authorization: Bearer <google-access-token>" \
  -o "leads_export.xlsx"
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-01 | Claude | Initial document |
