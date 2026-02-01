# Database Schema Diagram

**Project:** ENEOS Sales Automation
**Generated:** 2026-02-01
**Database:** Google Sheets (6 sheets)

---

## Overview

This system uses **Google Sheets as the primary database** instead of traditional SQL/NoSQL:

| Feature | Google Sheets Approach |
|---------|------------------------|
| Primary Key | Row number (auto-increment) |
| Foreign Key | Manual reference (Lead_UUID, Campaign_ID) |
| Transactions | Not supported (use retry + circuit breaker) |
| Locking | Optimistic locking via Version column |
| Indexes | No native indexes (full scan required) |

---

## Entity Relationship Diagram

```mermaid
erDiagram
    LEADS ||--o{ STATUS_HISTORY : "has history"
    LEADS }o--|| SALES_TEAM : "owned by"
    LEADS }o--|| CAMPAIGN_STATS : "from campaign"
    LEADS ||--o| DEDUPLICATION_LOG : "checked against"
    CAMPAIGN_EVENTS }o--|| CAMPAIGN_STATS : "aggregated to"

    LEADS {
        int rowNumber PK "Row number (auto)"
        string Lead_UUID UK "UUID for migration"
        string Email "Customer email"
        string Company "Company name"
        string Status "new/contacted/closed/lost/unreachable"
        string Sales_Owner_ID FK "→ Sales_Team.LINE_User_ID"
        string Campaign_ID FK "→ Campaign_Stats.Campaign_ID"
        int Version "Optimistic lock"
        timestamp Created_At "ISO 8601"
        timestamp Updated_At "ISO 8601"
    }

    SALES_TEAM {
        string LINE_User_ID PK "LINE User ID (nullable)"
        string Email UK "@eneos.co.th"
        string Name "Display name"
        string Role "admin or sales"
        string Status "active or inactive"
        timestamp Created_At "ISO 8601"
    }

    STATUS_HISTORY {
        string Lead_UUID FK "→ Leads.Lead_UUID"
        string Status "Status at this point"
        string Changed_By_ID "LINE User ID or System"
        string Changed_By_Name "Who changed"
        timestamp Timestamp PK "ISO 8601"
        string Notes "Optional notes"
    }

    DEDUPLICATION_LOG {
        string Key PK "email:campaignId hash"
        string Email "Lead email"
        string Campaign_ID "Campaign ID"
        timestamp Processed_At "ISO 8601"
    }

    CAMPAIGN_EVENTS {
        int Event_ID PK "Unique event ID"
        int Campaign_ID FK "→ Campaign_Stats"
        string Campaign_Name "Campaign name"
        string Email "Recipient email"
        string Event "delivered/opened/click"
        timestamp Event_At "Event timestamp"
        string URL "Clicked URL"
    }

    CAMPAIGN_STATS {
        int Campaign_ID PK "Brevo campaign ID"
        string Campaign_Name "Campaign name"
        int Delivered "Total delivered"
        int Opened "Total opens"
        int Clicked "Total clicks"
        int Unique_Opens "Unique openers"
        int Unique_Clicks "Unique clickers"
        float Open_Rate "Opens/Delivered %"
        float Click_Rate "Clicks/Delivered %"
        timestamp Last_Updated "ISO 8601"
    }
```

---

## Sheet Details

### 1. Leads (Main Database)

**Columns:** 34 (A-AH)
**Purpose:** Core lead data with sales tracking

```mermaid
classDiagram
    class Leads {
        <<Google Sheet>>
        +int rowNumber [PK]
        +string Date
        +string Customer_Name
        +string Email
        +string Phone
        +string Company
        +string Industry_AI
        +string Website
        +string Capital
        +LeadStatus Status
        +string Sales_Owner_ID [FK]
        +string Sales_Owner_Name
        +string Campaign_ID [FK]
        +string Campaign_Name
        +string Email_Subject
        +string Source
        +string Lead_ID
        +string Event_ID
        +string Clicked_At
        +string Talking_Point
        +string Closed_At
        +string Lost_At
        +string Unreachable_At
        +int Version [Lock]
        +string Lead_Source
        +string Job_Title
        +string City
        +string Lead_UUID [UK]
        +string Created_At
        +string Updated_At
        +string Contacted_At
        +string Juristic_ID
        +string DBD_Sector
        +string Province
        +string Full_Address
    }
```

**Column Groups:**

| Group | Columns | Purpose |
|-------|---------|---------|
| **Identity** | A-E | Customer info (Date, Name, Email, Phone, Company) |
| **AI Enrichment** | F-H | Gemini AI data (Industry, Website, Capital) |
| **Status** | I-K | Lead status and owner |
| **Campaign** | L-N | Brevo campaign info |
| **Tracking** | O-R | Source and event tracking |
| **Timestamps** | S-V | Status change timestamps |
| **System** | W | Version for optimistic locking |
| **Brevo Attrs** | X-Z | Additional Brevo contact attributes |
| **UUID Migration** | AA-AD | For future Supabase migration |
| **DBD Grounding** | AE-AH | Google Search grounding data |

---

### 2. Sales_Team

**Columns:** 7 (A-G)
**Purpose:** User management and authentication

```mermaid
classDiagram
    class Sales_Team {
        <<Google Sheet>>
        +string LINE_User_ID [PK, nullable]
        +string Name
        +string Email [UK]
        +string Phone
        +string Role
        +string Created_At
        +string Status
    }
```

**Role Mapping:**

| Sheet Value | Dashboard Role | Permissions |
|-------------|----------------|-------------|
| `admin` | Admin | Full access (export, team management) |
| `sales` | Viewer | Read-only access |

**User Types (Story 7-4b):**

| Type | LINE_User_ID | Email | How Created |
|------|--------------|-------|-------------|
| LINE Account | Not null | Null | Auto from LINE postback |
| Dashboard Member | Null | Not null | Manual creation |
| Linked Member | Not null | Not null | Linked after creation |

---

### 3. Status_History (Audit Log)

**Columns:** 6 (A-F)
**Purpose:** Track all status changes for leads

```mermaid
classDiagram
    class Status_History {
        <<Google Sheet>>
        +string Lead_UUID [FK]
        +LeadStatus Status
        +string Changed_By_ID
        +string Changed_By_Name
        +string Timestamp [PK]
        +string Notes
    }
```

**Write Pattern:** Fire-and-forget (async, non-blocking)

```typescript
// Non-blocking history write
this.addStatusHistory({...}).catch(err => logger.error(err));
```

---

### 4. Deduplication_Log

**Columns:** 4 (A-D)
**Purpose:** Prevent duplicate leads from same email + campaign

```mermaid
classDiagram
    class Deduplication_Log {
        <<Google Sheet>>
        +string Key [PK]
        +string Email
        +string Campaign_ID
        +string Processed_At
    }
```

**Key Generation:**
```typescript
const key = `${email.toLowerCase()}:${campaignId}`;
```

---

### 5. Campaign_Events (Brevo Events)

**Columns:** 11 (A-K)
**Purpose:** Raw event log from Brevo webhooks

```mermaid
classDiagram
    class Campaign_Events {
        <<Google Sheet>>
        +int Event_ID [PK]
        +int Campaign_ID [FK]
        +string Campaign_Name
        +string Email
        +string Event
        +string Event_At
        +string Sent_At
        +string URL
        +string Tag
        +string Segment_IDs
        +string Created_At
    }
```

**Event Types:**
- `delivered` - Email delivered
- `opened` - Email opened
- `click` - Link clicked

---

### 6. Campaign_Stats (Aggregates)

**Columns:** 15 (A-O)
**Purpose:** Aggregated campaign metrics for dashboard

```mermaid
classDiagram
    class Campaign_Stats {
        <<Google Sheet>>
        +int Campaign_ID [PK]
        +string Campaign_Name
        +int Delivered
        +int Opened
        +int Clicked
        +int Unique_Opens
        +int Unique_Clicks
        +float Open_Rate
        +float Click_Rate
        +int Hard_Bounce
        +int Soft_Bounce
        +int Unsubscribe
        +int Spam
        +string First_Event
        +string Last_Updated
    }
```

**Rate Calculations:**
```
Open_Rate = (Unique_Opens / Delivered) * 100
Click_Rate = (Unique_Clicks / Delivered) * 100
```

---

## Relationships Diagram

```mermaid
flowchart LR
    subgraph Leads["Leads Sheet"]
        L_UUID[Lead_UUID]
        L_OWNER[Sales_Owner_ID]
        L_CAMP[Campaign_ID]
        L_EMAIL[Email]
    end

    subgraph Sales["Sales_Team Sheet"]
        S_LINE[LINE_User_ID]
        S_EMAIL[Email]
    end

    subgraph History["Status_History Sheet"]
        H_UUID[Lead_UUID]
    end

    subgraph Dedup["Deduplication_Log"]
        D_KEY[Key = email:campaignId]
    end

    subgraph Events["Campaign_Events"]
        E_CAMP[Campaign_ID]
    end

    subgraph Stats["Campaign_Stats"]
        ST_CAMP[Campaign_ID]
    end

    L_UUID -->|1:N| H_UUID
    L_OWNER -->|N:1| S_LINE
    L_CAMP -->|N:1| ST_CAMP
    L_EMAIL -.->|check| D_KEY
    E_CAMP -->|N:1| ST_CAMP
```

---

## Data Flow

```mermaid
flowchart TD
    subgraph Input["Data Sources"]
        B[Brevo Webhook]
        LN[LINE Postback]
        D[Dashboard API]
    end

    subgraph Sheets["Google Sheets"]
        LE[Leads]
        ST[Sales_Team]
        SH[Status_History]
        DL[Deduplication_Log]
        CE[Campaign_Events]
        CS[Campaign_Stats]
    end

    B -->|New Lead| DL
    DL -->|Check exists| DL
    DL -->|Not duplicate| LE
    LE -->|Fire-and-forget| SH

    B -->|Email event| CE
    CE -->|Aggregate| CS

    LN -->|Claim/Update| LE
    LE -->|Fire-and-forget| SH

    D -->|Read| LE
    D -->|Read| ST
    D -->|Read| SH
    D -->|Read| CS
    D -->|CRUD| ST
```

---

## Optimistic Locking

```mermaid
sequenceDiagram
    participant C as Client
    participant S as SheetsService
    participant G as Google Sheets

    C->>S: updateLeadWithLock(row, updates, expectedVersion)
    S->>G: getRow(row)
    G->>S: {version: 5, ...data}

    alt Version matches
        S->>G: update(row, {...updates, version: 6})
        G->>S: Success
        S->>C: Updated lead
    else Version mismatch
        S->>C: RaceConditionError
    end
```

---

## Key Constraints

| Constraint | Sheet | Column(s) | Enforcement |
|------------|-------|-----------|-------------|
| Primary Key | Leads | rowNumber | Auto (row position) |
| Unique | Leads | Lead_UUID | Application-level |
| Unique | Deduplication_Log | Key | Application check before insert |
| Unique | Campaign_Events | Event_ID | Application-level |
| Unique | Campaign_Stats | Campaign_ID | Application-level |
| Foreign Key | Status_History | Lead_UUID | Application-level (no cascade) |
| Foreign Key | Leads | Sales_Owner_ID | No enforcement (orphan allowed) |

---

## Migration Notes (Supabase)

When migrating to Supabase:

| Google Sheets | Supabase |
|---------------|----------|
| Row number | `id` (serial) |
| Lead_UUID | `id` (uuid, primary key) |
| Version | `updated_at` + RLS |
| No indexes | Proper indexes on Email, Campaign_ID |
| Sheet tabs | Separate tables |

**UUID Ready Fields:**
- `Lead_UUID` - Already generated for new leads
- `Created_At` / `Updated_At` - ISO 8601 timestamps
- `Contacted_At` - For metrics calculation

---

## Code References

| File | Purpose |
|------|---------|
| `src/services/sheets.service.ts` | All CRUD operations |
| `src/types/index.ts` | TypeScript interfaces |
| `src/config/index.ts` | Sheet names configuration |

### Key Functions

| Function | Purpose |
|----------|---------|
| `addLead()` | Insert new lead (generates UUID) |
| `getRow()` | Get lead by row number |
| `updateLeadWithLock()` | Update with optimistic locking |
| `claimLead()` | Claim lead (race condition safe) |
| `checkDuplicate()` | Check Deduplication_Log |
| `addStatusHistory()` | Fire-and-forget audit log |
| `getAllSalesTeamMembers()` | Get Sales_Team with filters |

