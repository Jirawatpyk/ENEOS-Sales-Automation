# Brevo Webhooks Data Flow

**Project:** ENEOS Sales Automation
**Generated:** 2026-02-01
**Type:** Data Flow Diagram

---

## Overview

ระบบรับ webhook จาก Brevo 2 ประเภท:

| Webhook | Endpoint | Trigger | Purpose |
|---------|----------|---------|---------|
| **Workflow Automation** | `POST /webhook/brevo` | User clicks link in email | Create new Lead |
| **Email Marketing** | `POST /webhook/brevo/campaign` | Email events | Track delivered/opened/click |

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph Brevo["Brevo Platform"]
        WF[Workflow Automation]
        EM[Email Marketing Campaign]
    end

    subgraph Backend["Backend API :3000"]
        W1["/webhook/brevo"]
        W2["/webhook/brevo/campaign"]
        BG[Background Processor]
        CS[Campaign Stats Service]
    end

    subgraph Sheets["Google Sheets"]
        LE[Leads]
        DL[Deduplication_Log]
        SH[Status_History]
        CE[Campaign_Events]
        CST[Campaign_Stats]
    end

    subgraph External["External Services"]
        GE[Gemini AI]
        LN[LINE OA]
    end

    WF -->|Click event| W1
    EM -->|Email events| W2

    W1 --> BG
    BG --> GE
    BG --> LE
    BG --> DL
    BG --> SH
    BG --> LN

    W2 --> CS
    CS --> CE
    CS --> CST
```

---

## Webhook 1: Workflow Automation

**Endpoint:** `POST /webhook/brevo`
**Purpose:** สร้าง Lead ใหม่เมื่อ user คลิกลิงก์ใน email

### Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant B as Brevo Automation
    participant W as Webhook Controller
    participant D as Deduplication Service
    participant P as Processing Status
    participant BG as Background Processor
    participant G as Gemini AI
    participant S as Sheets Service
    participant L as LINE Service
    participant DLQ as Dead Letter Queue

    Note over B,DLQ: === Webhook 1: New Lead from Brevo Automation ===

    B->>W: POST /webhook/brevo<br/>(no event field)
    W->>W: Validate payload (Zod)

    alt Payload has 'event' field
        W->>B: 200 OK (skip - not from Automation)
    else No 'event' field (from Automation)
        W->>D: checkOrThrow(email, leadSource)

        alt Duplicate found
            D-->>W: DuplicateLeadError
            W->>B: 200 OK "Duplicate lead"
        else Not duplicate
            W->>P: create(correlationId)
            W->>B: 200 OK "Processing in background"

            Note over BG,L: === Background Processing (Fire-and-forget) ===

            W--)BG: processLeadAsync(payload, correlationId)

            BG->>P: startProcessing(correlationId)

            alt AI Enrichment Enabled
                BG->>G: analyzeCompany(domain, company)
                G->>G: Google Search Grounding<br/>(DBD data lookup)
                G-->>BG: {industry, talkingPoint, juristicId, ...}
            else AI Disabled or Error
                Note over BG: Use default values
            end

            BG->>S: addLead(lead)
            S->>S: generateLeadUUID()
            S-->>BG: rowNumber

            S--)S: addStatusHistory("new")<br/>(fire-and-forget)

            alt LINE Notifications Enabled
                BG->>L: pushLeadNotification(lead)
                L-->>BG: Success
            end

            BG->>P: complete(correlationId, rowNumber)
        end
    end

    rect rgb(255, 230, 230)
        Note over BG,DLQ: === Error Handling ===
        BG--xDLQ: On critical error → add to DLQ
        BG->>P: fail(correlationId, error)
    end
```

### Data Transformation

```mermaid
flowchart LR
    subgraph Input["Brevo Payload"]
        I1[email]
        I2[FIRSTNAME/LASTNAME]
        I3[PHONE]
        I4[COMPANY]
        I5[campaign_id]
        I6[campaign_name]
        I7[subject]
        I8["message-id"]
    end

    subgraph Process["Processing"]
        P1[Normalize fields]
        P2[Format phone]
        P3[Extract domain]
        P4[Gemini AI Analysis]
    end

    subgraph Output["Leads Sheet Row"]
        O1[customerName]
        O2[email]
        O3[phone]
        O4[company]
        O5[industryAI]
        O6[talkingPoint]
        O7[juristicId]
        O8[dbdSector]
        O9[province]
        O10[capital]
    end

    I1 --> P1
    I2 --> P1
    I3 --> P2
    I4 --> P3
    I5 --> P1
    I6 --> P1
    I7 --> P1
    I8 --> P1

    P1 --> O1
    P1 --> O2
    P2 --> O3
    P1 --> O4
    P3 --> P4
    P4 --> O5
    P4 --> O6
    P4 --> O7
    P4 --> O8
    P4 --> O9
    P4 --> O10
```

### Gemini AI Enrichment

```mermaid
flowchart TD
    subgraph Input["Input"]
        D[Email Domain]
        C[Company Name]
    end

    subgraph Gemini["Gemini AI + Google Search Grounding"]
        G1[Extract company info]
        G2[DBD Lookup]
        G3[Industry Classification]
        G4[Generate Talking Point]
    end

    subgraph Output["CompanyAnalysis"]
        O1[industry: "Manufacturing"]
        O2[talkingPoint: "ENEOS..."]
        O3[website: "company.co.th"]
        O4[registeredCapital: "50 ล้านบาท"]
        O5[juristicId: "0105546012345"]
        O6[dbdSector: "MFG-A"]
        O7[province: "กรุงเทพมหานคร"]
        O8[fullAddress: "123 ถนน..."]
    end

    D --> G1
    C --> G1
    G1 --> G2
    G2 --> G3
    G3 --> G4

    G4 --> O1
    G4 --> O2
    G2 --> O3
    G2 --> O4
    G2 --> O5
    G2 --> O6
    G2 --> O7
    G2 --> O8
```

### LINE Flex Message

```mermaid
flowchart TD
    subgraph Lead["Lead Data"]
        L1[company]
        L2[customerName]
        L3[email]
        L4[phone]
        L5[industry]
        L6[talkingPoint]
    end

    subgraph Template["Flex Message Template"]
        T1["🏢 บริษัท XYZ"]
        T2["👤 ชื่อลูกค้า"]
        T3["📧 email@company.com"]
        T4["📱 081-234-5678"]
        T5["🏭 Manufacturing"]
        T6["💬 Talking Point"]
        B1["🤝 รับเคส"]
    end

    subgraph Postback["Button Postback Data"]
        P1["action=contacted"]
        P2["lead_id=lead_xxx"]
    end

    L1 --> T1
    L2 --> T2
    L3 --> T3
    L4 --> T4
    L5 --> T5
    L6 --> T6

    B1 --> P1
    B1 --> P2
```

---

## Webhook 2: Email Marketing Campaign

**Endpoint:** `POST /webhook/brevo/campaign`
**Purpose:** Track email events (delivered, opened, click)

### Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant B as Brevo Email Campaign
    participant W as Campaign Webhook
    participant CS as CampaignStats Service
    participant CE as Campaign_Events Sheet
    participant CST as Campaign_Stats Sheet
    participant DLQ as Dead Letter Queue

    Note over B,DLQ: === Webhook 2: Email Marketing Events ===

    B->>W: POST /webhook/brevo/campaign<br/>{event: "opened", email, camp_id}
    W->>W: Validate payload (Zod)

    alt Invalid payload
        W->>B: 400 Bad Request
    else Valid payload
        W->>W: Check event enabled?

        alt Event not enabled
            W->>B: 200 OK "Event not enabled"
        else Event enabled (delivered/opened/click)
            W->>B: 200 OK "Event received"

            Note over CS,CST: === Async Processing ===

            W--)CS: processCampaignEventAsync(event)

            CS->>CE: checkDuplicateEvent(eventId)

            alt Event_ID exists
                CE-->>CS: true (duplicate)
                Note over CS: Skip processing
            else New event
                CE-->>CS: false

                CS->>CE: writeCampaignEvent(event)
                Note over CE: Append row to Campaign_Events

                CS->>CE: countUniqueEmailsForEvent(campaignId, eventType)
                CE-->>CS: uniqueCount

                CS->>CST: getCampaignStats(campaignId)

                alt Campaign exists
                    CST-->>CS: {row, rowIndex}
                    CS->>CST: Update row with new counts
                else New campaign
                    CS->>CST: Create new stats row
                end

                CS->>CST: Recalculate Open_Rate, Click_Rate
            end
        end
    end

    rect rgb(255, 230, 230)
        Note over CS,DLQ: === Error Handling ===
        CS--xDLQ: On error → add to DLQ
    end
```

### Event Types

```mermaid
flowchart LR
    subgraph Brevo["Brevo Events"]
        E1[delivered]
        E2[opened]
        E3[click]
        E4[hard_bounce]
        E5[soft_bounce]
        E6[unsubscribed]
        E7[spam]
    end

    subgraph Enabled["Currently Enabled"]
        EN1[delivered ✅]
        EN2[opened ✅]
        EN3[click ✅]
    end

    subgraph Future["Future Events"]
        F1[hard_bounce ⏳]
        F2[soft_bounce ⏳]
        F3[unsubscribed ⏳]
        F4[spam ⏳]
    end

    E1 --> EN1
    E2 --> EN2
    E3 --> EN3
    E4 --> F1
    E5 --> F2
    E6 --> F3
    E7 --> F4
```

### Campaign Stats Update Flow

```mermaid
flowchart TD
    subgraph Event["Incoming Event"]
        E[event: opened<br/>email: user@email.com<br/>camp_id: 12345]
    end

    subgraph Check["1. Duplicate Check"]
        C1{Event_ID exists<br/>in Campaign_Events?}
    end

    subgraph Write["2. Write Event"]
        W1[Append to Campaign_Events]
    end

    subgraph Count["3. Count Unique"]
        CT1[SELECT COUNT DISTINCT email<br/>WHERE camp_id = 12345<br/>AND event = 'opened']
        CT2[uniqueCount = 42]
    end

    subgraph Update["4. Update Stats"]
        U1[Opened++]
        U2["Unique_Opens = 42 (from count)"]
        U3["Open_Rate = Unique_Opens/Delivered × 100"]
    end

    E --> C1
    C1 -->|Yes| SKIP[Skip - Duplicate]
    C1 -->|No| W1
    W1 --> CT1
    CT1 --> CT2
    CT2 --> U1
    U1 --> U2
    U2 --> U3
```

### Race Condition Prevention

```mermaid
sequenceDiagram
    autonumber
    participant R1 as Request 1
    participant R2 as Request 2
    participant CE as Campaign_Events
    participant CS as Campaign_Stats

    Note over R1,CS: Same email opens email twice simultaneously

    par Request 1
        R1->>CE: Check duplicate (Event_ID: 1001)
        CE-->>R1: Not exists
        R1->>CE: Write event
        R1->>CE: Count unique emails
        CE-->>R1: uniqueCount = 42
        R1->>CS: Update Unique_Opens = 42
    and Request 2
        R2->>CE: Check duplicate (Event_ID: 1002)
        CE-->>R2: Not exists
        R2->>CE: Write event
        R2->>CE: Count unique emails
        CE-->>R2: uniqueCount = 42 (same user)
        R2->>CS: Update Unique_Opens = 42
    end

    Note over CS: Both requests set same value<br/>No race condition!
```

**Key Insight:** ระบบใช้ **Count-after-Write** pattern แทน Increment:
- เขียน event ก่อน → นับ unique emails จาก sheet → set ค่าตรงๆ
- ไม่ใช่ `unique_count++` ที่มีปัญหา race condition

---

## Comparison: Two Webhooks

| Feature | Workflow Automation | Email Marketing |
|---------|---------------------|-----------------|
| **Endpoint** | `/webhook/brevo` | `/webhook/brevo/campaign` |
| **Trigger** | User clicks link | Email delivered/opened/clicked |
| **Has `event` field** | No | Yes |
| **Creates Lead** | Yes | No |
| **AI Enrichment** | Yes (Gemini) | No |
| **LINE Notification** | Yes | No |
| **Target Sheets** | Leads, Deduplication_Log, Status_History | Campaign_Events, Campaign_Stats |
| **Deduplication** | email + leadSource | Event_ID |

---

## Payload Examples

### Workflow Automation Payload

```json
{
  "email": "customer@company.co.th",
  "FIRSTNAME": "สมชาย",
  "LASTNAME": "ใจดี",
  "PHONE": "081-234-5678",
  "COMPANY": "บริษัท ทดสอบ จำกัด",
  "campaign_id": 12345,
  "campaign_name": "Q1 2026 Lubricant Promo",
  "subject": "พิเศษ! น้ำมันหล่อลื่น ENEOS",
  "message-id": "abc123",
  "contact_id": 98765,
  "date": "2026-02-01T10:30:00Z"
}
```

**Note:** ไม่มี `event` field = มาจาก Brevo Automation

### Email Marketing Payload

```json
{
  "event": "opened",
  "email": "customer@company.co.th",
  "id": 1001,
  "camp_id": 12345,
  "camp_name": "Q1 2026 Lubricant Promo",
  "date": "2026-02-01T10:35:00Z",
  "ts_event": 1706780100,
  "message-id": "abc123",
  "tag": "promo",
  "link": "https://eneos.co.th/products"
}
```

**Note:** มี `event` field = มาจาก Email Marketing Campaign

---

## Error Handling

### Dead Letter Queue

```mermaid
flowchart TD
    subgraph Webhook["Webhook Processing"]
        W1[Receive request]
        W2[Validate]
        W3[Process]
    end

    subgraph Error["Error Scenarios"]
        E1[Validation failed]
        E2[Sheets API error]
        E3[Gemini API error]
        E4[LINE API error]
    end

    subgraph DLQ["Dead Letter Queue"]
        D1[Store failed event]
        D2[Log error details]
        D3["GET /dlq → Review"]
        D4[Manual retry]
    end

    W1 --> W2
    W2 -->|Invalid| E1
    W2 -->|Valid| W3
    W3 -->|Sheets error| E2
    W3 -->|Gemini error| E3
    W3 -->|LINE error| E4

    E1 -->|400 response| END1[Return error]
    E2 --> D1
    E3 --> W3
    E4 --> W3

    Note right of E3: Gemini: Use defaults, continue
    Note right of E4: LINE: Log error, continue

    D1 --> D2
    D2 --> D3
    D3 --> D4
```

### Graceful Degradation

| Service | On Error | Behavior |
|---------|----------|----------|
| **Gemini AI** | API error | Use default values, continue |
| **LINE** | Push failed | Log error, continue (lead saved) |
| **Sheets** | API error | Add to DLQ, fail request |
| **Campaign Stats** | Stats update failed | Event already saved, log warning |

---

## Code References

| File | Purpose |
|------|---------|
| `src/controllers/webhook.controller.ts` | Workflow Automation webhook handler |
| `src/controllers/campaign-webhook.controller.ts` | Email Marketing webhook handler |
| `src/services/background-processor.service.ts` | Async lead processing |
| `src/services/campaign-stats.service.ts` | Campaign events & stats |
| `src/services/deduplication.service.ts` | Prevent duplicate leads |
| `src/services/gemini.service.ts` | AI enrichment |
| `src/services/line.service.ts` | LINE notifications |
| `src/validators/brevo.validator.ts` | Automation payload validation |
| `src/validators/campaign-event.validator.ts` | Campaign event validation |

### Key Functions

| Function | File | Purpose |
|----------|------|---------|
| `handleBrevoWebhook()` | webhook.controller.ts:30 | Main automation webhook |
| `handleCampaignWebhook()` | campaign-webhook.controller.ts:26 | Campaign events webhook |
| `processLeadInBackground()` | background-processor.service.ts:23 | Async lead processing |
| `recordCampaignEvent()` | campaign-stats.service.ts:91 | Event recording + stats |
| `analyzeCompany()` | gemini.service.ts | AI enrichment |
| `pushLeadNotification()` | line.service.ts | LINE Flex Message |

