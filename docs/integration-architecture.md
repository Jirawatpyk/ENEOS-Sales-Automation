# Integration Architecture

**Project:** ENEOS Sales Automation
**Generated:** 2026-02-01

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────┐   │
│   │  Brevo  │    │  LINE   │    │ Gemini  │    │  Supabase   │   │
│   │  Email  │    │   OA    │    │   AI    │    │ (PostgreSQL)│   │
│   └────┬────┘    └────┬────┘    └────┬────┘    └──────┬──────┘   │
│        │              │              │                 │          │
└────────┼──────────────┼──────────────┼─────────────────┼──────────┘
         │              │              │                 │
         ▼              ▼              ▼                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND API (:3000)                          │
│                                                                    │
│   ┌────────────────────────────────────────────────────────────┐  │
│   │                     Express.js Routes                       │  │
│   ├──────────────┬─────────────┬────────────┬─────────────────┤  │
│   │ /webhook/*   │ /api/admin/*│ /health    │ /metrics        │  │
│   │ (No Auth)    │ (JWT Auth)  │ (No Auth)  │ (No Auth)       │  │
│   └──────────────┴─────────────┴────────────┴─────────────────┘  │
│                                                                    │
│   ┌────────────────────────────────────────────────────────────┐  │
│   │                     Services Layer                          │  │
│   ├─────────┬──────────┬─────────┬────────────┬───────────────┤  │
│   │ Leads   │ Gemini   │  LINE   │ Dedup      │ Campaign      │  │
│   │ Service │ Service  │ Service │ Service    │ Stats         │  │
│   └─────────┴──────────┴─────────┴────────────┴───────────────┘  │
│                                                                    │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                │ HTTP/JSON
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                   ADMIN DASHBOARD (:3001)                         │
│                                                                    │
│   ┌────────────────────────────────────────────────────────────┐  │
│   │                  Next.js API Routes                         │  │
│   │              (Proxy to Backend + Auth)                      │  │
│   └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│   ┌────────────────────────────────────────────────────────────┐  │
│   │                    React Components                         │  │
│   │   Dashboard │ Leads │ Campaigns │ Sales │ Settings │ Export │  │
│   └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│   ┌────────────────────────────────────────────────────────────┐  │
│   │                    Custom Hooks                             │  │
│   │         (React Query + URL State + Local State)             │  │
│   └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. Dashboard → Backend API

**Protocol:** HTTP/JSON over HTTPS
**Authentication:** Google OAuth ID Token (Bearer)
**Port:** Dashboard (:3001) → Backend (:3000)

```typescript
// Dashboard lib/auth.ts
const response = await fetch(`${BACKEND_URL}/api/admin/me`, {
  headers: {
    'Authorization': `Bearer ${idToken}`,
  },
});
```

**Endpoints Used:**
- `/api/admin/me` - User role sync
- `/api/admin/dashboard` - KPI data
- `/api/admin/leads` - Leads list
- `/api/admin/leads/:id` - Lead detail
- `/api/admin/sales-performance` - Team metrics
- `/api/admin/campaigns/*` - Campaign data
- `/api/admin/export` - Data export
- `/api/admin/sales-team/*` - Team management
- `/api/admin/activity-log` - Audit log
- `/health` - Health check

---

### 2. Brevo → Backend Webhooks

**Scenario A: Automation Webhook (New Lead)**

```
Brevo Email Campaign
        │
        │ User clicks link
        ▼
┌───────────────────┐
│ POST /webhook/brevo│
│ (No auth - IP check)│
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ 1. Validate payload│
│ 2. Check duplicate │
│ 3. Gemini AI enrich│
│ 4. Save to Supabase│
│ 5. LINE notify     │
└───────────────────┘
```

**Scenario B: Campaign Webhook (Email Events)**

```
Brevo Email Event (delivered/opened/click)
        │
        ▼
┌────────────────────────┐
│ POST /webhook/brevo/   │
│         campaign       │
└─────────┬──────────────┘
          │
          ▼
┌────────────────────────┐
│ 1. Validate event      │
│ 2. Deduplicate by ID   │
│ 3. Save to campaign_   │
│    events table        │
│ 4. Update campaign_    │
│    stats aggregates    │
└────────────────────────┘
```

---

### 3. LINE → Backend Webhook

**Scenario: Sales Action (Postback)**

```
Sales taps button in LINE
        │
        ▼
┌───────────────────┐
│ POST /webhook/line │
│ (Signature verify) │
└─────────┬─────────┘
          │
          │ 1. Verify X-Line-Signature
          │ 2. Respond 200 OK immediately
          │ 3. Process async:
          ▼
┌───────────────────┐
│ 1. Parse postback  │
│ 2. Race condition  │
│    check (version) │
│ 3. Update Supabase │
│ 4. Add to history  │
│ 5. Reply to LINE   │
└───────────────────┘
```

---

### 4. Backend → External APIs

**Supabase (PostgreSQL)**
```
┌─────────────────┐
│ leads.service   │
│ sales-team.svc  │
│ status-history  │
│ campaign-stats  │
│ dedup.service   │
│                 │
│ - Supabase JS   │
│   client        │
│ - Parameterized │
│   queries       │
└────────┬────────┘
         │ @supabase/supabase-js
         ▼
┌─────────────────┐
│ Supabase        │
│ PostgreSQL      │
└─────────────────┘
```

**Gemini AI API**
```
┌─────────────────┐
│ gemini.service  │
│                 │
│ - Fallback to   │
│   defaults      │
│ - Retry logic   │
│ - JSON parse    │
│   safety        │
└────────┬────────┘
         │ @google/generative-ai
         ▼
┌─────────────────┐
│ Gemini Pro 1.5  │
│ + Search        │
│   Grounding     │
└─────────────────┘
```

**LINE Messaging API**
```
┌─────────────────┐
│ line.service    │
│                 │
│ - Push message  │
│ - Reply message │
│ - Flex message  │
│   templates     │
└────────┬────────┘
         │ @line/bot-sdk
         ▼
┌─────────────────┐
│ LINE Messaging  │
│ API             │
└─────────────────┘
```

---

## Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │Dashboard │     │ Backend  │     │ Google   │
│          │     │ (Next.js)│     │(Express) │     │ OAuth    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Login       │                │                │
     ├───────────────►│                │                │
     │                │ 2. Redirect    │                │
     │                ├────────────────┼───────────────►│
     │                │                │                │
     │                │ 3. OAuth code  │                │
     │◄───────────────┼────────────────┼────────────────┤
     │                │                │                │
     │                │ 4. Exchange for tokens          │
     │                ├────────────────┼───────────────►│
     │                │                │                │
     │                │ 5. ID Token + Refresh Token     │
     │                │◄───────────────┼────────────────┤
     │                │                │                │
     │                │ 6. Fetch role  │                │
     │                ├───────────────►│                │
     │                │                │                │
     │                │ 7. Role from   │                │
     │                │    Supabase    │                │
     │                │◄───────────────┤                │
     │                │                │                │
     │ 8. Session     │                │                │
     │◄───────────────┤                │                │
     │                │                │                │
```

---

## Data Flow Summary

| Flow | Trigger | Source | Destination | Auth |
|------|---------|--------|-------------|------|
| New Lead | Brevo click | Brevo Webhook | Supabase (leads) | Webhook secret |
| Email Event | Email activity | Brevo Webhook | Supabase (campaign_events) | Webhook secret |
| Sales Action | LINE postback | LINE Webhook | Supabase (leads) | LINE signature |
| Dashboard View | User request | Dashboard | Backend API | Google ID Token |
| Export | Admin request | Dashboard | Backend → File | Google ID Token |
| Team Edit | Admin action | Dashboard | Backend → Supabase | Google ID Token |

---

## Error Handling

### Circuit Breaker Pattern
```
Supabase / LINE / Gemini
        │
        ▼
┌───────────────────┐
│ Circuit Breaker   │
│                   │
│ Closed → Open     │
│ (5 failures)      │
│                   │
│ Open → Half-Open  │
│ (60s timeout)     │
│                   │
│ Half-Open →       │
│ Closed (success)  │
└───────────────────┘
```

### Dead Letter Queue
```
Failed Events → DLQ (in-memory/Redis)
                    │
                    ▼
            GET /dlq → Review
                    │
                    ▼
            Manual retry or discard
```

---

## Environment Configuration

### Backend (.env)
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# Gemini AI
GEMINI_API_KEY=...

# LINE
LINE_CHANNEL_ACCESS_TOKEN=...
LINE_CHANNEL_SECRET=...
LINE_GROUP_ID=...

# Brevo
BREVO_WEBHOOK_SECRET=...
```

### Dashboard (.env.local)
```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Access Control
ALLOWED_DOMAINS=eneos.co.th
```
