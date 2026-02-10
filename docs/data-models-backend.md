# Data Models - Backend API

**Project:** ENEOS Sales Automation
**Part:** Backend (Express.js)
**Generated:** 2026-02-01 (Updated)
**Type Files:** `src/types/index.ts`, `src/types/admin.types.ts`

---

## Overview

The Backend uses **Supabase (PostgreSQL)** as the primary database:
- UUID = Primary Key (for leads, uses `lead_<uuid>` format)
- `version` column = Optimistic locking
- Row Level Security (RLS) via service role key
- Parameterized queries prevent SQL injection

---

## Supabase PostgreSQL Tables

### 1. leads (Main Database)

| Column | Type | Description |
|--------|------|-------------|
| id | bigint (PK) | Auto-increment primary key |
| lead_uuid | text (UNIQUE) | UUID identifier `lead_<uuid>` |
| date | text | Lead creation date (ISO 8601) |
| customer_name | text | Customer full name |
| email | text | Customer email |
| phone | text | Phone number (Thai format) |
| company | text | Company name |
| industry_ai | text | AI-classified industry |
| website | text | Company website |
| capital | text | Registered capital (from DBD) |
| status | text | new/claimed/contacted/closed/lost/unreachable |
| sales_owner_id | text | LINE User ID of assigned sales |
| sales_owner_name | text | Sales person name |
| campaign_id | text | Brevo campaign ID |
| campaign_name | text | Brevo campaign name |
| email_subject | text | Email subject line |
| source | text | Lead source (e.g., brevo_click) |
| lead_id | text | Brevo contact ID |
| event_id | text | Brevo event ID |
| clicked_at | text | Email click timestamp |
| talking_point | text | AI-generated talking point |
| closed_at | text | Closed timestamp |
| lost_at | text | Lost timestamp |
| unreachable_at | text | Unreachable timestamp |
| version | integer | Optimistic lock version |
| lead_source | text | Lead source categorization |
| job_title | text | Contact's job title |
| city | text | Contact's city |
| created_at | timestamptz | Row creation timestamp |
| updated_at | timestamptz | Row update timestamp |
| contacted_at | text | When sales claimed lead |
| juristic_id | text | DBD registration number |
| dbd_sector | text | DBD sector code |
| province | text | Province from DBD |
| full_address | text | Full company address |

---

### 2. sales_team

| Column | Type | Description |
|--------|------|-------------|
| id | bigint (PK) | Auto-increment primary key |
| line_user_id | text (UNIQUE) | LINE User ID (can be null for manual members) |
| name | text | Display name |
| email | text (UNIQUE) | @eneos.co.th email |
| phone | text | Phone number |
| role | text | admin or sales |
| created_at | timestamptz | Row creation timestamp |
| status | text | active or inactive |

---

### 3. status_history (Audit Log)

| Column | Type | Description |
|--------|------|-------------|
| id | bigint (PK) | Auto-increment primary key |
| lead_id | bigint (FK) | References leads.id |
| status | text | New status value |
| changed_by_id | text | LINE User ID or "System" |
| changed_by_name | text | Who made the change |
| timestamp | timestamptz | When the change occurred |
| notes | text | Optional notes |

---

### 4. deduplication_log

| Column | Type | Description |
|--------|------|-------------|
| id | bigint (PK) | Auto-increment primary key |
| key | text (UNIQUE) | email + campaignId composite key |
| email | text | Lead email |
| campaign_id | text | Campaign ID |
| processed_at | timestamptz | When processed |

---

### 5. campaign_events (Brevo Events)

| Column | Type | Description |
|--------|------|-------------|
| id | bigint (PK) | Auto-increment primary key |
| event_id | text (UNIQUE) | Unique event ID from Brevo |
| campaign_id | text | Brevo campaign ID |
| campaign_name | text | Campaign name |
| email | text | Recipient email |
| event | text | delivered/opened/click |
| event_at | text | Event timestamp |
| sent_at | text | Email sent timestamp |
| url | text | Clicked URL (for click events) |
| tag | text | Brevo tag |
| segment_ids | text | Brevo segment IDs |
| created_at | timestamptz | Row creation time |

---

### 6. campaign_stats (Aggregates)

| Column | Type | Description |
|--------|------|-------------|
| id | bigint (PK) | Auto-increment primary key |
| campaign_id | text (UNIQUE) | Brevo campaign ID |
| campaign_name | text | Campaign name |
| delivered | integer | Total delivered |
| opened | integer | Total opens |
| clicked | integer | Total clicks |
| unique_opens | integer | Unique openers |
| unique_clicks | integer | Unique clickers |
| open_rate | numeric | Opens / Delivered * 100 |
| click_rate | numeric | Clicks / Delivered * 100 |
| hard_bounce | integer | (Future) |
| soft_bounce | integer | (Future) |
| unsubscribe | integer | (Future) |
| spam | integer | (Future) |
| first_event | text | First event timestamp |
| last_updated | text | Last update timestamp |

---

## TypeScript Interfaces

### Lead

```typescript
interface Lead {
  date: string;
  customerName: string;
  email: string;
  phone: string;
  company: string;
  industryAI: string;
  website: string | null;
  capital: string | null;
  status: LeadStatus;
  salesOwnerId: string | null;
  salesOwnerName: string | null;
  campaignId: string;
  campaignName: string;
  emailSubject: string;
  source: string;
  leadId: string;
  eventId: string;
  clickedAt: string;
  talkingPoint: string | null;
  closedAt: string | null;
  lostAt: string | null;
  unreachableAt: string | null;
  leadSource: string | null;
  jobTitle: string | null;
  city: string | null;
  leadUUID: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  contactedAt: string | null;
  juristicId: string | null;
  dbdSector: string | null;
  province: string | null;
  fullAddress: string | null;
}

type LeadStatus = 'new' | 'claimed' | 'contacted' | 'closed' | 'lost' | 'unreachable';

interface LeadRow extends Lead {
  rowNumber: number;
  version: number;
}
```

### SalesTeamMember

```typescript
interface SalesTeamMember {
  lineUserId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string;
  createdAt?: string;
  status?: 'active' | 'inactive';
}

interface SalesTeamMemberFull {
  lineUserId: string | null; // Can be null for manually added members
  name: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'sales';
  createdAt: string;
  status: 'active' | 'inactive';
}
```

### CompanyAnalysis (Gemini AI + Google Search Grounding)

```typescript
interface CompanyAnalysis {
  industry: string;              // Generic category (e.g., "Food & Beverage", "Manufacturing")
  talkingPoint: string;          // Thai talking point for sales
  website: string | null;        // Official company website
  registeredCapital: string | null;  // ทุนจดทะเบียน
  keywords: string[];            // Max 1 keyword
  // Google Search Grounding fields (2026-01-26)
  juristicId: string | null;     // เลขทะเบียนนิติบุคคล 13 หลัก
  dbdSector: string | null;      // DBD Sector code (e.g., "F&B-M", "MFG-AUTO")
  province: string | null;       // จังหวัด
  fullAddress: string | null;    // ที่อยู่เต็มของบริษัท
  // Confidence scoring
  confidence?: number;           // 0-100 score
  confidenceFactors?: {
    hasRealDomain: boolean;      // Domain exists and is valid
    hasDBDData: boolean;         // Found official DBD registration
    keywordMatch: boolean;       // Matched keyword override rules
    geminiConfident: boolean;    // Gemini returned valid DBD sector code
    dataCompleteness: number;    // 0-100% of fields populated
  };
}
```

### StatusHistoryEntry (Audit Log)

```typescript
interface StatusHistoryEntry {
  leadUUID: string;              // References Lead.leadUUID
  status: LeadStatus;
  changedById: string;           // LINE User ID or "System"
  changedByName: string;
  timestamp: string;             // ISO 8601
  notes?: string;
}
```

### NormalizedBrevoPayload (Webhook Input)

```typescript
interface NormalizedBrevoPayload {
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
  company: string;
  campaignId: string;
  campaignName: string;
  subject: string;
  contactId: string;
  eventId: string;
  clickedAt: string;
  // Brevo Contact Attributes
  jobTitle: string;
  leadSource: string;
  city: string;
  website: string;
}
```

### LinePostbackData (LINE Action)

```typescript
interface LinePostbackData {
  action: LeadStatus;
  /** @deprecated Use leadId instead */
  rowId?: number;
  /** UUID-based lead identifier (future-proof) */
  leadId?: string;
}
```

### SalesTeamFilter

```typescript
interface SalesTeamFilter {
  status?: 'active' | 'inactive' | 'all';
  role?: 'admin' | 'sales' | 'all';
}
```

### SalesTeamMemberUpdate

```typescript
interface SalesTeamMemberUpdate {
  email?: string | null;
  phone?: string | null;
  role?: 'admin' | 'sales';
  status?: 'active' | 'inactive';
}
```

---

## Error Classes

```typescript
class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;
}

class ValidationError extends AppError { } // 400
class DuplicateLeadError extends AppError { } // 409
class RaceConditionError extends AppError { } // 409
class ExternalServiceError extends AppError { } // 502
```

---

## Data Operations

### Race Condition Protection

```typescript
// Pattern for status updates (Supabase with optimistic locking)
async function claimLead(leadUuid: string, salesId: string, salesName: string) {
  // 1. Read current lead with version
  const lead = await getLeadById(leadUuid);

  // 2. Atomic update with version check
  const { data, error } = await supabase
    .from('leads')
    .update({ sales_owner_id: salesId, version: lead.version + 1 })
    .eq('lead_uuid', leadUuid)
    .eq('version', lead.version)    // Optimistic lock
    .is('sales_owner_id', null)     // Race-safe: only if unclaimed
    .select()
    .single();
}
```

### Deduplication

```typescript
// Unique key: email + campaignId (Supabase upsert with ignoreDuplicates)
const key = `${email.toLowerCase()}:${campaignId}`;
const { data, error } = await supabase
  .from('deduplication_log')
  .upsert({ key, email, campaign_id: campaignId }, { ignoreDuplicates: true });
// If no row returned → duplicate exists
```

---

## Admin Dashboard Types

> For complete Admin Dashboard types, see `src/types/admin.types.ts`

### Key Admin Types Summary

| Type | Purpose |
|------|---------|
| `AdminApiResponse<T>` | Standard API response wrapper |
| `PaginationMeta` | Pagination info (page, limit, total, hasNext, hasPrev) |
| `DashboardResponse` | GET /api/admin/dashboard |
| `LeadsListResponse` | GET /api/admin/leads |
| `LeadItem` | Lead in list view (includes grounding fields) |
| `LeadDetailResponse` | GET /api/admin/leads/:id |
| `SalesPerformanceResponse` | GET /api/admin/sales-performance |
| `CampaignsResponse` | GET /api/admin/campaigns |
| `CampaignStatsItem` | Campaign email metrics (Story 5-2) |
| `CampaignEventItem` | Single campaign event |
| `ActivityLogEntry` | Status change log entry (Story 7-7) |
| `ExportRequest` | Export request parameters |

### Campaign Stats Types (Story 5-2)

```typescript
interface CampaignStatsItem {
  campaignId: number;
  campaignName: string;
  delivered: number;
  opened: number;
  clicked: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;           // Percentage (0-100)
  clickRate: number;          // Percentage (0-100)
  hardBounce: number;         // Future
  softBounce: number;         // Future
  unsubscribe: number;        // Future
  spam: number;               // Future
  firstEvent: string;         // ISO 8601
  lastUpdated: string;        // ISO 8601
}

interface CampaignEventItem {
  eventId: number;
  email: string;
  event: string;              // delivered | opened | click
  eventAt: string;            // ISO 8601
  url: string | null;         // URL for click events
}
```

### Activity Log Types (Story 7-7)

```typescript
interface ActivityLogEntry {
  id: string;                 // Unique ID (leadUUID + timestamp)
  leadUUID: string;
  rowNumber: number;          // For Lead Detail Modal
  companyName: string;        // From Leads sheet join
  status: LeadStatus;
  changedById: string;
  changedByName: string;
  timestamp: string;          // ISO 8601
  notes: string | null;
  lead: LeadItem;             // Full lead data
}
```
