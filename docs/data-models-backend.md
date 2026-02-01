# Data Models - Backend API

**Project:** ENEOS Sales Automation
**Part:** Backend (Express.js)
**Generated:** 2026-02-01 (Updated)
**Type Files:** `src/types/index.ts`, `src/types/admin.types.ts`

---

## Overview

The Backend uses **Google Sheets as the primary database**. This is NOT a traditional SQL/NoSQL database:
- Row number = Primary Key
- Version column = Optimistic locking
- No transactions (use circuit breaker + retry)

---

## Google Sheets Structure

### 1. Leads (Main Database)

| Column | Field Name | Type | Description |
|--------|-----------|------|-------------|
| A | Date | string | Lead creation date (ISO 8601) |
| B | Customer_Name | string | Customer full name |
| C | Email | string | Customer email |
| D | Phone | string | Phone number (Thai format) |
| E | Company | string | Company name |
| F | Industry_AI | string | AI-classified industry |
| G | Website | string | Company website |
| H | Capital | string | Registered capital (from DBD) |
| I | Status | LeadStatus | new/claimed/contacted/closed/lost/unreachable |
| J | Sales_Owner_ID | string | LINE User ID of assigned sales |
| K | Sales_Owner_Name | string | Sales person name |
| L | Campaign_ID | string | Brevo campaign ID |
| M | Campaign_Name | string | Brevo campaign name |
| N | Email_Subject | string | Email subject line |
| O | Source | string | Lead source (e.g., brevo_click) |
| P | Lead_ID | string | Brevo contact ID |
| Q | Event_ID | string | Brevo event ID |
| R | Clicked_At | string | Email click timestamp |
| S | Talking_Point | string | AI-generated talking point |
| T | Closed_At | string | Closed timestamp |
| U | Lost_At | string | Lost timestamp |
| V | Unreachable_At | string | Unreachable timestamp |
| W | Version | number | Optimistic lock version |
| X | Lead_Source | string | Lead source categorization |
| Y | Job_Title | string | Contact's job title |
| Z | City | string | Contact's city |
| AA | Lead_UUID | string | UUID for Supabase migration |
| AB | Created_At | string | ISO 8601 timestamp |
| AC | Updated_At | string | ISO 8601 timestamp |
| AD | Contacted_At | string | When sales claimed lead |
| AE | Juristic_ID | string | DBD registration number |
| AF | DBD_Sector | string | DBD sector code |
| AG | Province | string | Province from DBD |
| AH | Full_Address | string | Full company address |

---

### 2. Sales_Team

| Column | Field Name | Type | Description |
|--------|-----------|------|-------------|
| A | LINE_User_ID | string | LINE User ID (can be null for manual members) |
| B | Name | string | Display name |
| C | Email | string | @eneos.co.th email |
| D | Phone | string | Phone number |
| E | Role | string | admin or sales |
| F | Created_At | string | ISO 8601 timestamp |
| G | Status | string | active or inactive |

---

### 3. Status_History (Audit Log)

| Column | Field Name | Type | Description |
|--------|-----------|------|-------------|
| A | Lead_UUID | string | Reference to lead |
| B | Status | LeadStatus | New status value |
| C | Changed_By_ID | string | LINE User ID or "System" |
| D | Changed_By_Name | string | Who made the change |
| E | Timestamp | string | ISO 8601 timestamp |
| F | Notes | string | Optional notes |

---

### 4. Deduplication_Log

| Column | Field Name | Type | Description |
|--------|-----------|------|-------------|
| A | Key | string | email + campaignId hash |
| B | Email | string | Lead email |
| C | Campaign_ID | string | Campaign ID |
| D | Processed_At | string | ISO 8601 timestamp |

---

### 5. Campaign_Events (Brevo Events)

| Column | Field Name | Type | Description |
|--------|-----------|------|-------------|
| A | Event_ID | number | Unique event ID |
| B | Campaign_ID | number | Brevo campaign ID |
| C | Campaign_Name | string | Campaign name |
| D | Email | string | Recipient email |
| E | Event | string | delivered/opened/click |
| F | Event_At | string | Event timestamp |
| G | Sent_At | string | Email sent timestamp |
| H | URL | string | Clicked URL (for click events) |
| I | Tag | string | Brevo tag |
| J | Segment_IDs | string | Brevo segment IDs |
| K | Created_At | string | Row creation time |

---

### 6. Campaign_Stats (Aggregates)

| Column | Field Name | Type | Description |
|--------|-----------|------|-------------|
| A | Campaign_ID | number | Brevo campaign ID |
| B | Campaign_Name | string | Campaign name |
| C | Delivered | number | Total delivered |
| D | Opened | number | Total opens |
| E | Clicked | number | Total clicks |
| F | Unique_Opens | number | Unique openers |
| G | Unique_Clicks | number | Unique clickers |
| H | Open_Rate | number | Opens / Delivered * 100 |
| I | Click_Rate | number | Clicks / Delivered * 100 |
| J | Hard_Bounce | number | (Future) |
| K | Soft_Bounce | number | (Future) |
| L | Unsubscribe | number | (Future) |
| M | Spam | number | (Future) |
| N | First_Event | string | First event timestamp |
| O | Last_Updated | string | Last update timestamp |

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
// Pattern for status updates
async function updateLeadStatus(rowNumber: number, newStatus: LeadStatus, salesId: string) {
  // 1. Read current row with version
  const lead = await getLeadByRow(rowNumber);

  // 2. Check if already claimed
  if (lead.salesOwnerId && lead.salesOwnerId !== salesId) {
    throw new RaceConditionError('Lead already claimed by another sales');
  }

  // 3. Update with version check
  await updateRow(rowNumber, { ...updates, version: lead.version + 1 });
}
```

### Deduplication

```typescript
// Unique key: email + campaignId
const key = `${email.toLowerCase()}:${campaignId}`;
const exists = await checkDuplicateLog(key);
if (exists) throw new DuplicateLeadError(email, 'brevo');
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
