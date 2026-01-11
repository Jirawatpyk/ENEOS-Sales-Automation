# API Reference

> ENEOS Sales Automation API Documentation

## Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://eneos-sales-automation-production.up.railway.app` |
| Development | `http://localhost:3000` |

---

## Health & Status Endpoints

### GET /

Returns API information.

**Response**
```json
{
  "name": "ENEOS Sales Automation API",
  "version": "1.0.0",
  "environment": "production",
  "endpoints": {
    "health": "/health",
    "ready": "/ready",
    "brevoWebhook": "/webhook/brevo",
    "lineWebhook": "/webhook/line"
  }
}
```

---

### GET /health

Full health check with service status.

**Response**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-11T12:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "googleSheets": { "status": "up", "latency": 150 },
    "geminiAI": { "status": "up", "latency": 500 },
    "lineAPI": { "status": "up", "latency": 100 }
  }
}
```

| Status Code | Meaning |
|-------------|---------|
| 200 | All services healthy |
| 503 | One or more services down |

---

### GET /ready

Kubernetes readiness probe.

**Response**
```json
{
  "ready": true,
  "timestamp": "2026-01-11T12:00:00.000Z"
}
```

---

### GET /live

Kubernetes liveness probe.

**Response**
```json
{
  "alive": true,
  "uptime": 3600.5
}
```

---

## Webhook Endpoints

### POST /webhook/brevo

Receives webhook events from Brevo email campaigns.

**Headers**
| Header | Required | Description |
|--------|----------|-------------|
| Content-Type | Yes | `application/json` |

**Request Body**
```json
{
  "event": "click",
  "email": "customer@company.com",
  "FIRSTNAME": "John",
  "LASTNAME": "Doe",
  "PHONE": "0812345678",
  "COMPANY": "ACME Corporation",
  "campaign_id": 12345,
  "campaign_name": "ENEOS Premium Oil 2024",
  "subject": "Special Offer for Your Business",
  "message-id": "abc-123-xyz",
  "date": "2026-01-11T12:00:00.000Z"
}
```

**Supported Events**
| Event | Action |
|-------|--------|
| `click` | Process as new lead |
| `opened` | Acknowledge only |
| `delivered` | Acknowledge only |
| `hard_bounce` | Acknowledge only |
| `soft_bounce` | Acknowledge only |
| `spam` | Acknowledge only |
| `unsubscribed` | Acknowledge only |

**Response - Success**
```json
{
  "success": true,
  "message": "Lead processed successfully",
  "data": {
    "rowNumber": 42,
    "email": "customer@company.com",
    "company": "ACME Corporation",
    "industry": "Manufacturing"
  }
}
```

**Response - Duplicate**
```json
{
  "success": true,
  "message": "Duplicate lead - already processed"
}
```

**Response - Error**
```json
{
  "success": false,
  "error": "Invalid payload",
  "details": "email: Required"
}
```

---

### POST /webhook/line

Receives postback events from LINE OA.

**Headers**
| Header | Required | Description |
|--------|----------|-------------|
| Content-Type | Yes | `application/json` |
| X-Line-Signature | Yes | HMAC-SHA256 signature |

**Request Body**
```json
{
  "destination": "U0000000000000000",
  "events": [
    {
      "type": "postback",
      "timestamp": 1704931200000,
      "replyToken": "xxx",
      "source": {
        "type": "group",
        "groupId": "Cxxxxxxxxx",
        "userId": "Uxxxxxxxxx"
      },
      "postback": {
        "data": "action=contacted&row_id=42"
      }
    }
  ]
}
```

**Postback Actions**
| Action | Description |
|--------|-------------|
| `contacted` | Claim/Accept the lead |
| `closed` | Mark as sale closed (won) |
| `lost` | Mark as sale lost |
| `unreachable` | Mark customer as unreachable |

**Response**
```json
{
  "success": true
}
```

> Note: LINE webhook always returns 200 immediately. Processing happens asynchronously.

---

## Metrics Endpoints

### GET /metrics

Prometheus metrics in text format.

**Response** (text/plain)
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/health",status_code="200"} 42

# HELP leads_processed_total Total number of leads processed
# TYPE leads_processed_total counter
leads_processed_total{status="success",source="brevo"} 100
```

---

### GET /metrics/summary

Human-readable metrics summary.

**Response**
```json
{
  "timestamp": "2026-01-11T12:00:00.000Z",
  "system": {
    "uptime": "2h 30m",
    "uptimeSeconds": 9000,
    "memory": {
      "used": "75.3 MB",
      "total": "128 MB",
      "percentage": "58.8%"
    },
    "nodeVersion": "v20.19.5"
  },
  "business": {
    "leads": {
      "processed": 100,
      "duplicates": 5
    },
    "claims": {
      "total": 50
    },
    "raceConditions": 2,
    "aiAnalysis": {
      "total": 95,
      "avgDurationMs": 1200
    },
    "lineNotifications": {
      "total": 95
    }
  },
  "http": {
    "totalRequests": 500,
    "activeRequests": 2,
    "avgResponseTimeMs": 150
  },
  "deadLetterQueue": {
    "size": 0,
    "totalEvents": 3
  }
}
```

---

## Development Endpoints

> Available only when `NODE_ENV=development`

### GET /stats

System statistics.

**Response**
```json
{
  "deduplication": {
    "enabled": true,
    "memoryCacheSize": 100,
    "redisAvailable": false
  },
  "deadLetterQueue": {
    "totalEvents": 0,
    "byType": {}
  },
  "uptime": 3600,
  "memory": {
    "rss": 140000000,
    "heapTotal": 80000000,
    "heapUsed": 75000000
  }
}
```

---

### GET /dlq

Get dead letter queue events.

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "evt-123",
      "type": "brevo_webhook",
      "error": "Google Sheets API error",
      "timestamp": "2026-01-11T12:00:00.000Z",
      "retryCount": 3,
      "payload": { ... }
    }
  ],
  "stats": {
    "total": 1,
    "byType": { "brevo_webhook": 1 }
  }
}
```

---

### DELETE /dlq/:id

Remove specific event from DLQ.

**Response**
```json
{
  "success": true
}
```

---

### DELETE /dlq

Clear all DLQ events.

**Response**
```json
{
  "success": true,
  "clearedCount": 5
}
```

---

## API Documentation UI

### GET /api-docs

Swagger UI for interactive API documentation.

### GET /api-docs.json

OpenAPI 3.0 specification in JSON format.

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": "Invalid payload",
  "details": "email: Required"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Invalid LINE signature"
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Not Found",
  "path": "/unknown-route"
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "error": "Too many requests, please try again later"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Internal server error",
  "requestId": "req-abc-123"
}
```

---

## Rate Limiting

| Setting | Default |
|---------|---------|
| Window | 60 seconds |
| Max Requests | 100 per window |

Exceeded requests receive `429 Too Many Requests`.

---

## Authentication

### Brevo Webhook
No authentication required (validated by payload structure).

### LINE Webhook
Requires `X-Line-Signature` header with valid HMAC-SHA256 signature.

```
Signature = Base64(HMAC-SHA256(channel_secret, request_body))
```
