# ENEOS Sales Automation - Architecture

> Enterprise-grade Sales Automation System for ENEOS Thailand

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Component Architecture](#component-architecture)
- [Database Schema](#database-schema)
- [Security Architecture](#security-architecture)
- [Error Handling](#error-handling)
- [Monitoring & Observability](#monitoring--observability)

---

## System Overview

### Purpose
ระบบ Sales Automation ที่รับ Lead จาก Email Campaign (Brevo) วิเคราะห์ด้วย AI และแจ้งเตือนทีมขายผ่าน LINE OA พร้อมระบบป้องกัน Race Condition

### Key Features
- **Webhook Integration** - รับ events จาก Brevo (Workflow + Campaign) และ LINE
- **AI Enrichment** - วิเคราะห์ข้อมูลบริษัทด้วย Gemini AI + Google Search Grounding
- **Real-time Notifications** - แจ้งเตือนผ่าน LINE Flex Message
- **Race Condition Protection** - ป้องกันการแย่งงานระหว่างเซลล์
- **Deduplication** - ป้องกัน Lead ซ้ำซ้อน
- **Campaign Analytics** - Email metrics tracking (delivered/opened/click)
- **Admin Dashboard API** - 21 REST endpoints with Google OAuth RBAC

### Tech Stack
| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.x |
| Framework | Express.js 4.x |
| Database | Supabase PostgreSQL |
| AI | Google Gemini 1.5 Flash |
| Messaging | LINE Messaging API |
| Cache | Redis (optional) / In-Memory |
| Monitoring | Prometheus + Custom Metrics |

---

## High-Level Architecture

```mermaid
graph TB
    subgraph External["External Services"]
        Brevo[Brevo Email Platform]
        LINE[LINE Platform]
        Gemini[Google Gemini AI]
        DB[Supabase PostgreSQL]
        Google[Google OAuth]
    end

    subgraph Dashboard["Admin Dashboard (Next.js)"]
        NextJS[Next.js 16 + React 19]
    end

    subgraph App["ENEOS Sales Automation (Express.js)"]
        API[Express API Server]

        subgraph Controllers
            WebhookCtrl[Workflow Webhook]
            CampaignCtrl[Campaign Webhook]
            LineCtrl[LINE Controller]
            AdminCtrl[Admin Controller]
        end

        subgraph Services
            LeadsService[Leads Service]
            SalesTeamService[Sales Team Service]
            StatusHistoryService[Status History Service]
            GeminiService[Gemini + Grounding]
            LineService[LINE Service]
            CampaignStats[Campaign Stats]
            DedupService[Dedup Service]
            DLQ[Dead Letter Queue]
        end

        subgraph Middleware
            AdminAuth[Admin Auth + RBAC]
            RateLimit[Rate Limiter]
            Metrics[Metrics Collector]
        end
    end

    Brevo -->|Workflow Webhook| WebhookCtrl
    Brevo -->|Campaign Webhook| CampaignCtrl
    LINE -->|Webhook| LineCtrl
    NextJS -->|API + OAuth Token| AdminCtrl
    AdminCtrl --> AdminAuth
    AdminAuth --> Google
    Controllers --> Services
    Services --> Gemini
    Services --> DB
    Services --> LINE
```

---

## Data Flow Diagrams

### Scenario A: New Lead from Brevo

```mermaid
sequenceDiagram
    participant B as Brevo
    participant API as API Server
    participant V as Validator
    participant D as Dedup Service
    participant AI as Gemini AI
    participant S as Supabase
    participant L as LINE API

    B->>API: POST /webhook/brevo
    API->>V: Validate Payload
    V-->>API: Valid

    API->>D: Check Duplicate
    alt Is Duplicate
        D-->>API: Already Processed
        API-->>B: 200 OK (Duplicate)
    else New Lead
        D-->>API: New Lead

        API->>AI: Analyze Company
        AI-->>API: Industry, Talking Point

        API->>S: Insert Lead
        S-->>API: Lead UUID

        API->>L: Send Flex Message
        L-->>API: Success

        API-->>B: 200 OK (Processed)
    end
```

### Scenario B: Sales Action from LINE

```mermaid
sequenceDiagram
    participant Sales as Sales Person
    participant L as LINE App
    participant API as API Server
    participant S as Supabase

    Sales->>L: Click "รับงาน" Button
    L->>API: POST /webhook/line (Postback)

    API->>S: Get Lead by UUID
    S-->>API: Lead Data

    alt Lead Available
        API->>S: Update Status + Owner
        S-->>API: Success
        API->>L: Reply "สำเร็จ"
        L-->>Sales: Show Success Message
    else Already Claimed
        API->>L: Reply "มีคนรับไปแล้ว"
        L-->>Sales: Show Already Claimed
    end
```

### Scenario C: Campaign Email Events

```mermaid
sequenceDiagram
    participant B as Brevo Campaign
    participant API as API Server
    participant CE as Campaign_Events
    participant CS as Campaign_Stats

    B->>API: POST /webhook/brevo/campaign
    Note over B,API: {event: "click", camp_id: 123, id: 456}

    API->>CE: Check Event_ID exists
    alt Duplicate
        API-->>B: 200 OK (duplicate)
    else New Event
        API->>CE: Write Event Row (source of truth)
        API->>CE: COUNT unique emails for campaign
        CE-->>API: uniqueCount
        API->>CS: Update stats with accurate count
        API-->>B: 200 OK (success)
    end
```

### Background Processing with Status Tracking

**v1.1.0 Feature** - เพิ่ม Background Processing เพื่อลด Webhook Response Time จาก 16s → 0.5s (32x faster)

```mermaid
sequenceDiagram
    participant B as Brevo
    participant API as API Server
    participant BG as Background Processor
    participant Status as Status Service
    participant AI as Gemini AI
    participant S as Supabase
    participant L as LINE API

    B->>API: POST /webhook/brevo
    Note over API: Validation + Dedup Check (synchronous)

    API->>Status: Create Status (pending)
    API->>BG: Queue Background Job
    API-->>B: 200 OK + correlationId (< 1s)

    Note over BG,Status: Asynchronous Processing Starts

    BG->>Status: Update Status (processing)
    BG->>AI: Analyze Company
    AI-->>BG: Industry, Talking Point

    BG->>S: Insert Lead
    S-->>BG: Lead UUID

    BG->>L: Send Flex Message
    L-->>BG: Success

    BG->>Status: Update Status (completed)

    Note over Status: Status auto-expires after 1 hour
```

#### Status API Endpoints

Frontend/Client สามารถเช็คสถานะการประมวลผลแบบ Real-time:

**GET /api/leads/status/:correlationId** (Public)
- รับ correlationId จาก webhook response
- ตรวจสอบสถานะ: `pending` → `processing` → `completed` / `failed`
- ไม่ต้อง auth (ใช้ UUID เป็น secret)

**GET /api/leads/status** (Admin Only)
- ดูสถานะทั้งหมดใน memory
- ต้อง admin authentication

#### Background Processing Benefits

| Metric | Before (Sync) | After (Async) | Improvement |
|--------|---------------|---------------|-------------|
| **Response Time** | 16s | 0.5s | **32x faster** |
| **Throughput** | ~4 req/min | ~120 req/min | **40x higher** |
| **Timeout Risk** | High (Brevo 30s limit) | None | **Eliminated** |
| **Cost per Lead** | ~$0.018 | ~$0.005 | **70% cheaper** |
| **User Experience** | 16s wait | Instant feedback | **Significantly better** |

### Race Condition Protection

```mermaid
sequenceDiagram
    participant S1 as Sales A
    participant S2 as Sales B
    participant API as API Server
    participant DB as Supabase

    Note over S1,S2: Both click "รับงาน" simultaneously

    S1->>API: Claim Lead #42
    S2->>API: Claim Lead #42

    API->>DB: Read Row 42 (Version: 1)
    API->>DB: Read Row 42 (Version: 1)

    API->>DB: Update if Version=1, Set Owner=A, Version=2
    DB-->>API: Success (First wins)

    API->>DB: Update if Version=1, Set Owner=B, Version=2
    DB-->>API: Fail (Version mismatch)

    API-->>S1: "คุณได้รับงานแล้ว"
    API-->>S2: "Lead นี้มีคนรับไปแล้วโดย Sales A"
```

---

## Component Architecture

### Project Structure

```
src/
├── app.ts                 # Main Express application
├── config/
│   ├── index.ts          # Environment config with Zod validation
│   └── swagger.ts        # OpenAPI specification
├── controllers/
│   ├── webhook.controller.ts        # Brevo Workflow webhook
│   ├── campaign-webhook.controller.ts # Brevo Campaign webhook
│   ├── line.controller.ts           # LINE webhook handler
│   ├── admin.controller.ts          # Admin Dashboard API
│   ├── admin/
│   │   ├── campaign-stats.controller.ts # Campaign email metrics
│   │   └── team-management.controller.ts # Team management
│   └── status.controller.ts         # [v1.1.0] Status API handler
├── middleware/
│   ├── admin-auth.ts              # Google OAuth + RBAC
│   ├── error-handler.ts           # Centralized error handling
│   ├── request-context.ts         # Request ID, timeout, timing
│   ├── request-logger.ts          # HTTP request logging
│   └── metrics.middleware.ts      # Prometheus metrics
├── routes/
│   ├── webhook.routes.ts          # /webhook/brevo
│   ├── campaign-webhook.routes.ts # /webhook/brevo/campaign
│   ├── line.routes.ts             # /webhook/line
│   ├── admin.routes.ts            # /api/admin/*
│   └── status.routes.ts           # /api/leads/status
├── services/
│   ├── leads.service.ts            # Lead CRUD (Supabase)
│   ├── sales-team.service.ts       # Sales team CRUD (Supabase)
│   ├── status-history.service.ts   # Status history (Supabase)
│   ├── campaign-stats.service.ts   # Campaign email metrics (Supabase)
│   ├── deduplication.service.ts    # Prevent duplicates (Supabase)
│   ├── gemini.service.ts           # AI + Google Search Grounding
│   ├── line.service.ts             # LINE messaging
│   ├── dead-letter-queue.service.ts # Failed events
│   ├── redis.service.ts           # Redis cache (optional)
│   ├── background-processor.service.ts # Async lead processor
│   └── processing-status.service.ts    # Status tracking
├── templates/
│   └── flex-message.ts            # LINE Flex Message templates
├── types/
│   ├── index.ts                   # Core TypeScript interfaces
│   └── admin.types.ts             # Admin Dashboard types
├── utils/
│   ├── logger.ts                  # Winston logger
│   ├── retry.ts                   # Retry + Circuit Breaker
│   ├── metrics.ts                 # Prometheus metrics
│   ├── phone-formatter.ts         # Thai phone formatting
│   ├── email-parser.ts            # Email domain extraction
│   └── date-formatter.ts          # ISO 8601 formatting
├── validators/
│   ├── brevo.validator.ts         # Brevo Workflow validation
│   ├── campaign-event.validator.ts # Brevo Campaign validation
│   └── line.validator.ts          # LINE payload validation
└── constants/
    └── campaign.constants.ts      # Campaign columns, events
```

### Service Dependencies

```mermaid
graph LR
    subgraph Controllers
        WC[Workflow Webhook]
        CC[Campaign Webhook]
        LC[LINE Controller]
        AC[Admin Controller]
        SC[Status Controller]
    end

    subgraph Background Processing
        BP[Background Processor]
        PS[Processing Status]
    end

    subgraph Core Services
        LeadS[Leads Service]
        STS[Sales Team Service]
        SHS[Status History Service]
        GS[Gemini + Grounding]
        LS[LINE Service]
        CS[Campaign Stats]
    end

    subgraph Support Services
        DS[Dedup Service]
        DLQ[Dead Letter Queue]
        RS[Redis Service]
    end

    subgraph Auth
        AA[Admin Auth + RBAC]
    end

    WC --> DS
    WC --> BP
    BP --> GS
    BP --> LeadS
    BP --> LS
    BP --> PS
    SC --> PS
    WC --> DLQ

    CC --> CS

    LC --> LeadS
    LC --> LS

    AC --> AA
    AC --> LeadS
    AC --> STS
    AC --> CS

    DS --> RS
```

### Admin Dashboard API Architecture

```mermaid
graph TB
    subgraph Dashboard["Next.js Dashboard"]
        UI[React Components]
        RQ[React Query]
        Auth[NextAuth.js]
    end

    subgraph Backend["Express.js Backend"]
        Routes[Admin Routes]
        Middleware[Admin Auth Middleware]
        Controller[Admin Controller]
        Services[Services Layer]
    end

    subgraph External
        OAuth[Google OAuth]
        DB[Supabase PostgreSQL]
    end

    UI --> RQ
    RQ --> Routes
    Auth --> OAuth
    OAuth --> Middleware
    Routes --> Middleware
    Middleware --> Controller
    Controller --> Services
    Services --> DB
```

**RBAC (Role-Based Access Control):**

| Role | DB Value | Permissions |
|------|-------------|-------------|
| Admin | `admin` | Full access (export, team management) |
| Viewer | `sales` | Read-only access |

---

## Database Schema

### Supabase PostgreSQL Tables (6 Tables)

#### Table 1: leads (Main Database)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated primary key |
| date | timestamptz | วันที่สร้าง Lead |
| customer_name | text | ชื่อลูกค้า |
| email | text | อีเมล |
| phone | text | เบอร์โทร |
| company | text | ชื่อบริษัท |
| industry_ai | text | อุตสาหกรรม (จาก AI) |
| website | text | เว็บไซต์ |
| capital | text | ทุนจดทะเบียน (Grounding) |
| status | text | new/contacted/closed/lost/unreachable |
| sales_owner_id | text | LINE User ID ของเซลล์ |
| sales_owner_name | text | ชื่อเซลล์ |
| campaign_id | text | Brevo Campaign ID |
| talking_point | text | จุดขาย (จาก AI) |
| version | integer | Optimistic Lock |
| lead_uuid | text | Legacy UUID field |
| created_at | timestamptz | ISO 8601 timestamp |
| updated_at | timestamptz | ISO 8601 timestamp |
| contacted_at | timestamptz | When sales claimed |
| juristic_id | text | เลขทะเบียนนิติบุคคล (Grounding) |
| dbd_sector | text | DBD Sector code (Grounding) |
| province | text | จังหวัด (Grounding) |
| full_address | text | ที่อยู่เต็ม (Grounding) |

#### Table 2: sales_team

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated primary key |
| line_user_id | text | LINE User ID (nullable) |
| name | text | ชื่อเซลล์ |
| email | text | @eneos.co.th email |
| phone | text | เบอร์โทร |
| role | text | admin or sales |
| status | text | active or inactive |

#### Table 3: status_history (Audit Log)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated primary key |
| lead_id | UUID (FK) | Reference to leads.id |
| status | text | Status at this point |
| changed_by_id | text | LINE User ID or "System" |
| changed_by_name | text | Who made the change |
| timestamp | timestamptz | ISO 8601 timestamp |
| notes | text | Optional notes |

#### Table 4: deduplication_log

| Column | Type | Description |
|--------|------|-------------|
| key | text (UNIQUE) | `${email}:${campaignId}` |
| email | text | อีเมล |
| campaign_id | text | Campaign ID |
| processed_at | timestamptz | เวลา process |

#### Table 5: campaign_events

| Column | Type | Description |
|--------|------|-------------|
| event_id | text (UNIQUE) | Unique event ID |
| campaign_id | text | Brevo campaign ID |
| campaign_name | text | Campaign name |
| email | text | Recipient email |
| event | text | delivered/opened/click |
| event_at | timestamptz | Event timestamp |
| created_at | timestamptz | Row creation time |

#### Table 6: campaign_stats

| Column | Type | Description |
|--------|------|-------------|
| campaign_id | text (PK) | Brevo campaign ID |
| campaign_name | text | Campaign name |
| delivered | integer | Total delivered |
| opened | integer | Total opens |
| clicked | integer | Total clicks |
| unique_opens | integer | Unique openers |
| unique_clicks | integer | Unique clickers |
| open_rate | numeric | Unique_Opens / Delivered * 100 |
| click_rate | numeric | Unique_Clicks / Delivered * 100 |

---

## Security Architecture

```mermaid
graph TB
    subgraph Internet
        Attacker[Attacker]
        Brevo[Brevo]
        LINE[LINE]
    end

    subgraph Security Layer
        RL[Rate Limiter<br/>100 req/min]
        CORS[CORS Policy]
        Helmet[Helmet Headers]
    end

    subgraph Validation Layer
        LS[LINE Signature<br/>HMAC-SHA256]
        ZV[Zod Validation]
    end

    subgraph Application
        API[Express API]
    end

    Attacker -->|Blocked| RL
    Brevo --> RL
    LINE --> RL
    RL --> CORS
    CORS --> Helmet
    Helmet --> LS
    LS --> ZV
    ZV --> API
```

### Security Measures

| Layer | Protection | Implementation |
|-------|------------|----------------|
| Transport | HTTPS | Railway/Cloud Platform |
| Headers | Security Headers | Helmet.js |
| Rate Limit | DoS Protection | express-rate-limit |
| Validation | Input Validation | Zod schemas |
| Auth | LINE Signature | HMAC-SHA256 verification |
| Data | SQL Injection | Supabase parameterized queries |

---

## Error Handling

### Error Flow

```mermaid
graph TD
    E[Error Occurs] --> T{Error Type?}

    T -->|Validation| VE[ValidationError]
    T -->|Duplicate| DE[DuplicateLeadError]
    T -->|Race Condition| RE[RaceConditionError]
    T -->|External API| AE[AppError]
    T -->|Unknown| UE[Unknown Error]

    VE --> R1[400 Bad Request]
    DE --> R2[200 OK + Message]
    RE --> R3[Reply LINE + Log]
    AE --> R4[Retry or DLQ]
    UE --> R5[500 + Sentry]

    R4 --> DLQ[Dead Letter Queue]
    R5 --> Sentry[Sentry Alert]
```

### Dead Letter Queue

```mermaid
graph LR
    subgraph Normal Flow
        E[Event] --> P[Process]
        P --> S[Success]
    end

    subgraph Error Flow
        P -->|Fail| R[Retry 3x]
        R -->|Still Fail| DLQ[Dead Letter Queue]
    end

    subgraph Recovery
        DLQ --> M[Manual Review]
        M --> RP[Reprocess]
        RP --> S
    end
```

---

## Monitoring & Observability

### Metrics Architecture

```mermaid
graph LR
    subgraph Application
        API[Express API]
        MC[Metrics Collector]
    end

    subgraph Endpoints
        PM[/metrics<br/>Prometheus Format]
        PS[/metrics/summary<br/>JSON Format]
        H[/health<br/>Service Health]
    end

    subgraph External
        Prom[Prometheus]
        Graf[Grafana]
        Alert[Alert Manager]
    end

    API --> MC
    MC --> PM
    MC --> PS
    API --> H

    PM --> Prom
    Prom --> Graf
    Prom --> Alert
```

### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | Request latency |
| `leads_processed_total` | Counter | Leads processed |
| `leads_claimed_total` | Counter | Leads claimed by sales |
| `duplicate_leads_total` | Counter | Duplicate leads detected |
| `race_conditions_total` | Counter | Race conditions detected |
| `ai_analysis_duration_seconds` | Histogram | AI analysis latency |
| `line_notification_total` | Counter | LINE notifications sent |
| `dead_letter_queue_size` | Gauge | DLQ current size |

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2026-01-11T12:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "supabase": { "status": "up", "latency": 150 },
    "geminiAI": { "status": "up", "latency": 500 },
    "lineAPI": { "status": "up", "latency": 100 }
  }
}
```

---

## Appendix

### Environment Variables

See [.env.example](.env.example) for complete list.

### API Documentation

See [/api-docs](https://eneos-sales-automation-production.up.railway.app/api-docs) for OpenAPI/Swagger documentation.

### Related Documents

- [README.md](README.md) - Quick Start Guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment Instructions
- [CLAUDE.md](CLAUDE.md) - AI Assistant Context
- [docs/](docs/) - Detailed Documentation
