# Services Documentation

> รายละเอียด Services ทั้งหมดในระบบ ENEOS Sales Automation

## Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                          Services Layer                                │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Leads     │  │   Gemini    │  │    LINE     │  │  Campaign   │   │
│  │   Service   │  │   Service   │  │   Service   │  │   Stats     │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
│         │                │                │                │          │
│         ▼                ▼                ▼                ▼          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Supabase   │  │  Gemini AI  │  │    LINE     │  │  Supabase   │   │
│  │  PostgreSQL │  │  + Grounding│  │    API      │  │  PostgreSQL │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │    Dedup    │  │     DLQ     │  │    Redis    │  │  Background │   │
│  │   Service   │  │   Service   │  │   Service   │  │  Processor  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                        │
│  ┌─────────────┐                                                       │
│  │  Processing │                                                       │
│  │   Status    │                                                       │
│  └─────────────┘                                                       │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 1. Leads Service

> Lead CRUD operations via Supabase - ใจกลางของระบบ

### Location
`src/services/leads.service.ts`

### Responsibilities
- เพิ่ม/อ่าน/อัปเดต Lead data
- Race Condition Protection (Version column + optimistic locking)
- UUID-based identification

### Methods

#### `addLead(lead: Lead): Promise<SupabaseLead>`
เพิ่ม Lead ใหม่ลง Supabase

```typescript
const supabaseLead = await addLead({
  email: 'customer@company.com',
  company: 'ACME Corp',
  customerName: 'John Doe',
  phone: '0812345678',
});
// Returns: { id: 'uuid', version: 1, created_at, updated_at }
```

#### `getLeadById(id: string): Promise<SupabaseLead | null>`
ดึงข้อมูล Lead ตาม UUID

#### `claimLead(id: string, userId: string, userName: string): Promise<ClaimResult>`
รับงาน Lead พร้อมตรวจสอบ Race Condition

```typescript
const result = await claimLead('lead-uuid', 'U123', 'John');
// Returns: { success: true, lead: LeadRow, alreadyClaimed: false, isNewClaim: true }
```

#### `getAllLeads(): Promise<LeadRow[]>`
ดึง Lead ทั้งหมดสำหรับ Admin Dashboard

---

## 1b. Sales Team Service

> Sales Team CRUD via Supabase

### Location
`src/services/sales-team.service.ts`

### Key Methods
- `getSalesTeamMember(userId)` — ค้นหาด้วย LINE User ID
- `getUserByEmail(email)` — ค้นหาด้วย email (สำหรับ admin auth)
- `linkLINEAccount(email, lineUserId)` — เชื่อม LINE account (race-safe)
- `getSalesTeamAll()` — ดึงทั้งหมด
- `createSalesTeamMember(data)` / `updateSalesTeamMember(id, data)` — CRUD

---

## 1c. Status History Service

> Status History tracking via Supabase

### Location
`src/services/status-history.service.ts`

### Key Methods
- `addStatusHistory(data)` — บันทึกการเปลี่ยนสถานะ (fire-and-forget, catches all errors)
- `getStatusHistory(leadId)` — ดึงประวัติสถานะ
- `getAllStatusHistory()` — ดึงทั้งหมดสำหรับ activity log

---

## 2. Gemini Service

> AI Company Analysis - วิเคราะห์ข้อมูลบริษัท

### Location
`src/services/gemini.service.ts`

### Responsibilities
- วิเคราะห์ domain/company name
- สร้าง Talking Point สำหรับเซลล์
- ระบุอุตสาหกรรมและประเภทธุรกิจ

### Methods

#### `analyzeCompany(domain: string, companyName: string): Promise<CompanyAnalysis>`
วิเคราะห์ข้อมูลบริษัทด้วย AI

```typescript
const analysis = await geminiService.analyzeCompany(
  'acme.com',
  'ACME Corporation'
);
// Returns:
// {
//   industry: 'Manufacturing',
//   companyType: 'B2B',
//   talkingPoint: 'ENEOS มีน้ำมันหล่อลื่นสำหรับเครื่องจักร...',
//   website: 'https://acme.com',
//   registeredCapital: '10,000,000 บาท',
//   keywords: ['manufacturing', 'industrial']
// }
```

#### `generateSalesMessage(companyName: string): Promise<string>`
สร้างข้อความขายสำหรับบริษัท

```typescript
const message = await geminiService.generateSalesMessage('ACME Corp');
// Returns: "สวัสดีครับ ACME Corp, ENEOS มีน้ำมัน..."
```

#### `healthCheck(): Promise<HealthCheckResult>`
ตรวจสอบการเชื่อมต่อ Gemini API

### Google Search Grounding (Story 2-4)

Gemini ใช้ Google Search Grounding ดึงข้อมูลบริษัทจาก DBD:

```typescript
interface CompanyAnalysis {
  industry: string;         // อุตสาหกรรม (e.g., "Manufacturing")
  talkingPoint: string;     // ประโยคสำหรับเซลล์ (Thai)
  website: string | null;   // Official website
  registeredCapital: string | null;  // ทุนจดทะเบียน
  keywords: string[];       // Max 1 keyword
  juristicId: string | null;  // เลขทะเบียนนิติบุคคล 13 หลัก
  dbdSector: string | null;   // DBD Sector (e.g., "MFG-AUTO")
  province: string | null;    // จังหวัด
  fullAddress: string | null; // ที่อยู่เต็ม
  confidence: number;         // 0-100 confidence score
  confidenceFactors: {
    hasRealDomain: boolean;
    hasDBDData: boolean;
    keywordMatch: boolean;
    geminiConfident: boolean;
    dataCompleteness: number;
  };
}
```

### DBD Sector Codes

| Category | Code | Example |
|----------|------|---------|
| Construction | CON-B, CON-I | Building, Infrastructure |
| Manufacturing | MFG-AUTO, MFG-F | Automotive, Food |
| Food & Beverage | F&B-M, F&B-R | Manufacturing, Retail |
| Transportation | TRANS-F, TRANS-W | Freight, Warehouse |
| Technology | TECH-SW, TECH-IT | Software, IT Services |

### Fallback Values
เมื่อ API ล้มเหลว จะใช้ค่า default:

```typescript
{
  industry: 'Unknown',
  talkingPoint: 'ENEOS มีน้ำมันหล่อลื่นคุณภาพสูงจากญี่ปุ่น',
  website: null,
  registeredCapital: null,
  keywords: ['B2B'],
  juristicId: null,
  dbdSector: null,
  province: null,
  fullAddress: null,
  confidence: 0,
  confidenceFactors: { /* all false/0 */ }
}
```

---

## 3. LINE Service

> LINE Messaging - ส่งข้อความและ Flex Message

### Location
`src/services/line.service.ts`

### Responsibilities
- ส่ง Flex Message แจ้งเตือน Lead ใหม่
- Reply ข้อความตอบกลับ
- Verify webhook signature

### Methods

#### `pushLeadNotification(lead: LeadRow, analysis: CompanyAnalysis): Promise<void>`
ส่ง Flex Message แจ้งเตือน Lead ใหม่ไปยังกลุ่ม

```typescript
await lineService.pushLeadNotification(lead, analysis);
// Sends Flex Message to configured group
```

#### `replySuccess(replyToken: string, salesName: string, company: string, customer: string, status: string): Promise<void>`
ตอบกลับเมื่อดำเนินการสำเร็จ

```typescript
await lineService.replySuccess(token, 'John', 'ACME', 'Jane', 'contacted');
// Replies: "✅ John ได้รับ Lead ACME (Jane Doe) แล้ว"
```

#### `replyClaimed(replyToken: string, company: string, customer: string, owner: string): Promise<void>`
ตอบกลับเมื่อ Lead ถูกรับไปแล้ว

```typescript
await lineService.replyClaimed(token, 'ACME', 'Jane', 'Bob');
// Replies: "❌ Lead ACME (Jane) มีคนรับไปแล้วโดย Bob"
```

#### `replyError(replyToken: string, message?: string): Promise<void>`
ตอบกลับเมื่อเกิดข้อผิดพลาด

#### `verifySignature(body: string, signature: string): boolean`
ตรวจสอบ LINE webhook signature

```typescript
const isValid = lineService.verifySignature(rawBody, signature);
// Returns: true/false
```

#### `getUserProfile(userId: string): Promise<UserProfile>`
ดึงข้อมูลโปรไฟล์ผู้ใช้ LINE

#### `sendEscalationAlert(leads: LeadRow[], hoursThreshold: number): Promise<void>`
ส่งแจ้งเตือน Lead ที่ไม่มีคนรับเกินเวลา

---

## 4. Deduplication Service

> ป้องกัน Lead ซ้ำซ้อน

### Location
`src/services/deduplication.service.ts`

### Responsibilities
- ตรวจสอบ Lead ซ้ำด้วย email + campaignId
- Supabase upsert with `ignoreDuplicates: true`

### Methods

#### `checkAndMark(email: string, campaignId: string): Promise<boolean>`
ตรวจสอบและ mark as processed

```typescript
const isDuplicate = await deduplicationService.checkAndMark(
  'customer@company.com',
  '12345'
);
// Returns: true (duplicate) or false (new)
```

#### `isDuplicate(email: string, campaignId: string): Promise<boolean>`
ตรวจสอบอย่างเดียว ไม่ mark

#### `checkOrThrow(email: string, campaignId: string): Promise<void>`
Throw error ถ้าเป็น duplicate

```typescript
await deduplicationService.checkOrThrow(email, campaignId);
// Throws DuplicateLeadError if duplicate
```

#### `getStats(): DeduplicationStats`
ดึงสถิติการ dedupe

```typescript
const stats = deduplicationService.getStats();
// Returns: { enabled: true, memoryCacheSize: 100, redisAvailable: false }
```

### Deduplication Key
```typescript
const key = `${email.toLowerCase()}:${campaignId}`;
// Example: "customer@company.com:12345"
```

### Storage
- **Supabase** - UNIQUE constraint on `key` column prevents duplicates via upsert

---

## 5. Dead Letter Queue Service

> จัดการ Failed Events

### Location
`src/services/dead-letter-queue.service.ts`

### Responsibilities
- เก็บ events ที่ process ไม่สำเร็จ
- รองรับ retry และ manual recovery
- Track error statistics

### Methods

#### `add(event: DLQEvent): void`
เพิ่ม event เข้า queue

```typescript
deadLetterQueue.add({
  id: 'dlq-123',
  type: 'brevo_webhook',
  payload: webhookData,
  error: 'Supabase timeout',
  retryCount: 3,
  timestamp: new Date().toISOString()
});
```

#### `getAll(limit?: number): DLQEvent[]`
ดึง events ทั้งหมด

#### `getStats(): DLQStats`
ดึงสถิติ DLQ

```typescript
const stats = deadLetterQueue.getStats();
// Returns: { total: 5, byType: { brevo_webhook: 3, line_webhook: 2 } }
```

#### `remove(id: string): boolean`
ลบ event ออกจาก queue

#### `clear(): number`
ลบทุก events

### Storage
- **Development**: In-memory Map
- **Production**: Redis (if available) หรือ In-memory

---

## 6. Redis Service

> Optional caching layer

### Location
`src/services/redis.service.ts`

### Responsibilities
- Cache deduplication keys
- Cache lead data
- Session storage (future)

### Methods

#### `connect(): Promise<void>`
เชื่อมต่อ Redis

#### `disconnect(): Promise<void>`
ยกเลิกการเชื่อมต่อ

#### `isAvailable(): boolean`
ตรวจสอบว่า Redis พร้อมใช้งาน

#### `get(key: string): Promise<string | null>`
ดึงค่าจาก cache

#### `set(key: string, value: string, ttlSeconds?: number): Promise<boolean>`
บันทึกค่าลง cache

#### `del(key: string): Promise<boolean>`
ลบค่าจาก cache

### Fallback
ถ้า Redis ไม่พร้อม ระบบจะใช้ in-memory cache อัตโนมัติ

---

## 7. Campaign Stats Service

> Campaign Email Metrics - ติดตามสถิติ Email Campaign จาก Brevo

### Location
`src/services/campaign-stats.service.ts`

### Responsibilities
- รับ events จาก Brevo Campaign webhook (delivered, opened, click)
- ป้องกัน duplicate events ด้วย Event_ID
- นับ unique opens/clicks แบบ race condition safe
- คำนวณ Open Rate / Click Rate

### Methods

#### `recordCampaignEvent(event: NormalizedCampaignEvent): Promise<RecordEventResult>`
บันทึก campaign event ใหม่

```typescript
const result = await campaignStatsService.recordCampaignEvent({
  eventId: 456,
  campaignId: 123,
  campaignName: 'ENEOS Q1 2024',
  email: 'customer@company.com',
  event: 'click', // delivered | opened | click
  eventAt: '2026-01-30T10:00:00Z',
  sentAt: '2026-01-30T09:00:00Z',
  url: 'https://example.com/link',
  tag: 'promo',
  segmentIds: [1, 2],
});
// Returns: { success: true, duplicate: false, eventId: 456, campaignId: 123 }
```

#### `checkDuplicateEvent(eventId: number): Promise<boolean>`
ตรวจสอบว่า event ซ้ำหรือไม่

#### `getCampaignStats(campaignId: number): Promise<CampaignStatsItem | null>`
ดึงสถิติของ campaign

#### `getAllCampaignStats(options): Promise<{ data: CampaignStatsItem[], pagination: PaginationMeta }>`
ดึงสถิติทุก campaigns พร้อม pagination

### Race Condition Fix (Count-after-Write)

```
1. Check duplicate (Event_ID)
2. Write event → Campaign_Events (source of truth)
3. Count unique emails from table (AFTER write)
4. Update campaign_stats with accurate count
```

### Supabase Tables
- **campaign_events**: Raw event log (immutable source of truth)
- **campaign_stats**: Aggregated metrics (derived, can be recalculated)

---

## 8. Background Processor Service

> Async Lead Processing - ประมวลผล Lead แบบ Background

### Location
`src/services/background-processor.service.ts`

### Responsibilities
- รับ payload จาก webhook → respond 200 OK ทันที
- ประมวลผล Lead แบบ async (AI, Sheets, LINE)
- Track status และ handle errors

### Methods

#### `processLeadInBackground(payload: NormalizedBrevoPayload, correlationId: string): Promise<void>`
ประมวลผล Lead ใน background

```typescript
// Webhook Controller
// 1. Respond 200 OK immediately
res.json({ success: true, message: 'Processing' });

// 2. Process in background (fire-and-forget)
processLeadInBackground(payload, correlationId).catch(err => {
  logger.error('Background processing failed', { correlationId, error: err });
});
```

### Processing Steps

```
1. Update status → "processing"
2. AI Enrichment (Gemini + Google Search Grounding)
3. Save to Supabase (with UUID, timestamps)
4. Send LINE notification (fire-and-forget)
5. Update status → "completed" or "failed"
```

### Error Handling
- AI failure → ใช้ default values, continue processing
- Supabase failure → Add to DLQ, notify LINE with error
- LINE failure → Log error only (non-critical)

---

## 9. Processing Status Service

> Processing Tracking - ติดตามสถานะการประมวลผล

### Location
`src/services/processing-status.service.ts`

### Responsibilities
- Track processing status per correlation ID
- Provide status lookup for debugging
- Auto-cleanup expired entries

### Methods

#### `startProcessing(correlationId: string): void`
เริ่มต้นการ tracking

#### `completeProcessing(correlationId: string): void`
Mark as completed

#### `failProcessing(correlationId: string, error: string): void`
Mark as failed พร้อม error message

#### `getStatus(correlationId: string): ProcessingStatus | null`
ดึงสถานะปัจจุบัน

```typescript
const status = processingStatusService.getStatus('abc-123');
// Returns: { status: 'processing', startTime: Date, correlationId: 'abc-123' }
// Or: { status: 'completed', startTime: Date, endTime: Date, correlationId: 'abc-123' }
// Or: { status: 'failed', startTime: Date, endTime: Date, error: 'Supabase timeout', correlationId: 'abc-123' }
```

---

## Service Initialization

### Singleton Pattern

Services export functions (not classes) — module-level singletons:

```typescript
// src/services/leads.service.ts
import { supabase } from '../lib/supabase.js';

export async function addLead(lead: Lead): Promise<SupabaseLead> { ... }
export async function getLeadById(id: string): Promise<SupabaseLead | null> { ... }
export async function claimLead(...): Promise<ClaimResult> { ... }
export async function getAllLeads(): Promise<LeadRow[]> { ... }

// Compatibility wrapper for consumers expecting object syntax
export const leadsService = { addLead, getLeadById, claimLead, getAllLeads };
```

### Dependency Injection

Services import กันโดยตรง:

```typescript
// webhook.controller.ts
import * as leadsService from '../services/leads.service.js';
import { geminiService } from '../services/gemini.service.js';
import { lineService } from '../services/line.service.js';
import { deduplicationService } from '../services/deduplication.service.js';
```

---

## Circuit Breaker Pattern

### Implementation

```typescript
// src/utils/retry.ts
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures = 0;
  private lastFailure: number = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

### States

| State | Description |
|-------|-------------|
| **Closed** | ปกติ, requests ผ่านได้ |
| **Open** | หยุดรับ requests, fail fast |
| **Half-Open** | ทดสอบ 1 request |

---

## Health Check Integration

ทุก external services มี healthCheck():

```typescript
// src/app.ts
import { checkSupabaseHealth } from './lib/supabase.js';

app.get('/health', async (req, res) => {
  const [supabaseHealth, gemini, line] = await Promise.all([
    supabaseHealthCheck(),  // wraps checkSupabaseHealth() with latency
    geminiService.healthCheck(),
    lineService.healthCheck(),
  ]);

  const allHealthy = supabaseHealth.healthy && gemini.healthy && line.healthy;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services: { supabase: supabaseHealth, gemini, line }
  });
});
```
