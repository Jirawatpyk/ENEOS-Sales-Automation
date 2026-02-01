# Lead State Machine Diagram

**Project:** ENEOS Sales Automation
**Generated:** 2026-02-01
**Type:** State Machine Diagram

---

## Overview

This diagram shows the complete lead status lifecycle, including:
- All valid states
- Allowed transitions
- Who can trigger each transition
- Race condition handling
- Optimistic locking mechanism

---

## Lead Status Values

| Status | Description | Thai Name |
|--------|-------------|-----------|
| `new` | Lead just created from Brevo webhook | ใหม่ |
| `contacted` | Sales claimed the lead | ติดต่อแล้ว |
| `closed` | Successfully closed the sale | ปิดการขาย |
| `lost` | Lost the sale (customer declined) | เสียโอกาส |
| `unreachable` | Could not reach the customer | ติดต่อไม่ได้ |

---

## State Machine Diagram

```mermaid
stateDiagram-v2
    [*] --> new: Brevo Webhook

    new --> contacted: Sales claims<br/>(LINE Postback)

    contacted --> closed: Owner updates<br/>(LINE Postback)
    contacted --> lost: Owner updates<br/>(LINE Postback)
    contacted --> unreachable: Owner updates<br/>(LINE Postback)

    closed --> [*]
    lost --> [*]
    unreachable --> [*]

    note right of new
        Created by System
        Version = 1
        No owner assigned
    end note

    note right of contacted
        First claim sets:
        - salesOwnerId
        - salesOwnerName
        - contactedAt timestamp
        Version incremented
    end note

    note right of closed
        Sets closedAt timestamp
        Version incremented
    end note
```

---

## Transition Matrix

| From | To | Triggered By | Validation |
|------|----|--------------| -----------|
| (none) | `new` | System (Brevo Webhook) | Deduplication check |
| `new` | `contacted` | Any Sales (LINE) | Race condition check |
| `contacted` | `closed` | Owner only | Must be salesOwnerId |
| `contacted` | `lost` | Owner only | Must be salesOwnerId |
| `contacted` | `unreachable` | Owner only | Must be salesOwnerId |

**Important Notes:**
- Only the **owner** can update status after claiming
- Non-owners attempting to claim get "มีคนรับเคสนี้ไปแล้ว" (Already claimed)
- Status changes are **irreversible** in the current implementation

---

## Race Condition Handling

```mermaid
sequenceDiagram
    autonumber
    participant S1 as Sales A
    participant S2 as Sales B
    participant LINE as LINE Webhook
    participant API as Backend API
    participant GS as Google Sheets

    Note over S1,GS: === Concurrent Claim Attempt ===

    S1->>LINE: Tap "รับเคส" button
    S2->>LINE: Tap "รับเคส" button

    LINE->>API: POST /webhook/line (S1)
    LINE->>API: POST /webhook/line (S2)

    Note over API: Both arrive ~simultaneously

    par Sales A Processing
        API->>GS: getRow(rowNumber)
        GS->>API: {version: 1, salesOwnerId: null}
        API->>API: Check: salesOwnerId is null ✓
        API->>GS: updateLeadWithLock(row, updates, version=1)
    and Sales B Processing
        API->>GS: getRow(rowNumber)
        GS->>API: {version: 1, salesOwnerId: null}
        API->>API: Check: salesOwnerId is null ✓
        API->>GS: updateLeadWithLock(row, updates, version=1)
    end

    Note over GS: First write succeeds (S1)
    GS-->>API: Success (version now 2)

    Note over GS: Second write fails (S2)
    GS-->>API: Version mismatch (expected 1, got 2)
    API->>API: Throw RaceConditionError

    API->>LINE: replySuccess to S1
    LINE->>S1: "คุณ Sales A รับเคส บริษัท XYZ แล้ว"

    API->>GS: Re-fetch to get actual owner
    GS->>API: {salesOwnerName: "Sales A"}
    API->>LINE: replyClaimed to S2
    LINE->>S2: "เคสนี้ถูกรับไปแล้วโดย Sales A"
```

---

## Optimistic Locking Flow

```mermaid
flowchart TD
    subgraph Read["1. Read Current State"]
        R1[getRow rowNumber]
        R2{Row exists?}
        R3[Return lead data with version]
        R4[Throw ROW_NOT_FOUND]
    end

    subgraph Validate["2. Validate Operation"]
        V1{Already claimed?}
        V2{Same owner?}
        V3[Allow claim]
        V4[Return alreadyClaimed]
        V5[Allow status update]
        V6[Throw RaceConditionError]
    end

    subgraph Write["3. Update with Lock"]
        W1[updateLeadWithLock]
        W2[Re-read current version]
        W3{Version matches?}
        W4[Apply updates]
        W5[Increment version]
        W6[Write to Sheets]
        W7[Throw RaceConditionError]
    end

    R1 --> R2
    R2 -->|Yes| R3
    R2 -->|No| R4

    R3 --> V1
    V1 -->|No| V3
    V1 -->|Yes| V2
    V2 -->|Yes| V5
    V2 -->|No| V4

    V3 --> W1
    V5 --> W1

    W1 --> W2
    W2 --> W3
    W3 -->|Yes| W4
    W3 -->|No| W7
    W4 --> W5
    W5 --> W6
```

---

## Status History Audit Trail

Every status change is recorded in the `Status_History` sheet.

```mermaid
erDiagram
    LEADS ||--o{ STATUS_HISTORY : has

    LEADS {
        string Lead_UUID PK "Unique identifier"
        string status "Current status"
        string salesOwnerId "Owner LINE ID"
        int version "Optimistic lock"
    }

    STATUS_HISTORY {
        string Lead_UUID FK "References Leads"
        string status "Status at this point"
        string changedById "Who changed"
        string changedByName "Name of changer"
        string timestamp "ISO 8601"
        string notes "Optional notes"
    }
```

### What Gets Logged

| Event | Status | Changed By | Notes |
|-------|--------|------------|-------|
| Lead created | `new` | System | "Lead created from webhook" |
| Sales claims | `contacted` | Sales name | (empty) |
| Close sale | `closed` | Sales name | (empty) |
| Lose sale | `lost` | Sales name | (empty) |
| Unreachable | `unreachable` | Sales name | (empty) |

### Fire-and-Forget Pattern

Status history writes are **asynchronous** and non-blocking:

```typescript
// From sheets.service.ts
this.addStatusHistory({
  leadUUID: enrichedLead.leadUUID,
  status: 'new',
  changedById: 'System',
  changedByName: 'System',
  timestamp: now,
  notes: 'Lead created from webhook',
}).catch((err) => {
  // Log but don't throw - main operation continues
  logger.error('Failed to record status history', { error: err });
});
```

---

## Timestamp Tracking

| Timestamp | Set When | Purpose |
|-----------|----------|---------|
| `createdAt` | Lead created | Track lead age |
| `contactedAt` | First claim (contacted) | Calculate Response Time |
| `closedAt` | Status → closed | Calculate Closing Time |
| `lostAt` | Status → lost | Track lost date |
| `unreachableAt` | Status → unreachable | Track unreachable date |
| `updatedAt` | Any update | Last modification |

### Metric Calculations

```
Response Time = contactedAt - createdAt
Closing Time = closedAt - contactedAt
Lead Age = now - createdAt
```

---

## LINE Postback Data Format

Postback data sent from LINE Flex Message buttons:

### Legacy Format (row-based)
```
action=contacted&row_id=42
```

### New Format (UUID-based)
```
action=contacted&lead_id=lead_550e8400-e29b-41d4-a716-446655440000
```

### Supported Actions
- `contacted` - Claim the lead
- `closed` - Mark as closed
- `lost` - Mark as lost
- `unreachable` - Mark as unreachable

---

## Error Handling Summary

| Error | HTTP | LINE Reply | Cause |
|-------|------|------------|-------|
| `ROW_NOT_FOUND` | 404 | "ไม่พบข้อมูลเคสนี้ในระบบ" | Row deleted or invalid |
| `RaceConditionError` | 409 | "มีคนรับเคสนี้ไปแล้วโดย {name}" | Version mismatch |
| Invalid postback | 200 | "ข้อมูลไม่ถูกต้อง" | Malformed data |
| Unknown error | 500 | "เกิดข้อผิดพลาด กรุณาลองใหม่" | Unexpected error |

---

## Key Code References

| File | Purpose |
|------|---------|
| `src/services/sheets.service.ts` | Lead CRUD, optimistic locking, status history |
| `src/controllers/line.controller.ts` | LINE postback handling, race condition detection |
| `src/types/index.ts` | `LeadStatus` type, `VALID_LEAD_STATUSES` constant |
| `src/validators/line.validator.ts` | Postback data parsing |

### Critical Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `claimLead()` | sheets.service.ts:357 | Claim lead with race condition check |
| `updateLeadStatus()` | sheets.service.ts:457 | Update status (owner only) |
| `updateLeadWithLock()` | sheets.service.ts:293 | Optimistic locking implementation |
| `addStatusHistory()` | sheets.service.ts:1330 | Audit log (fire-and-forget) |
| `processLineEvent()` | line.controller.ts:98 | Postback event handler |

