# Services Documentation

> รายละเอียด Services ทั้งหมดในระบบ ENEOS Sales Automation

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Services Layer                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Sheets    │  │   Gemini    │  │    LINE     │          │
│  │   Service   │  │   Service   │  │   Service   │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         ▼                ▼                ▼                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Google    │  │   Gemini    │  │    LINE     │          │
│  │   Sheets    │  │    API      │  │    API      │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │    Dedup    │  │     DLQ     │  │    Redis    │          │
│  │   Service   │  │   Service   │  │   Service   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Sheets Service

> Google Sheets CRUD operations - ใจกลางของระบบ

### Location
`src/services/sheets.service.ts`

### Responsibilities
- เพิ่ม/อ่าน/อัปเดต Lead data
- Race Condition Protection (Version column)
- Sales Team lookup

### Methods

#### `addLead(lead: LeadRow): Promise<number>`
เพิ่ม Lead ใหม่ลง Sheets

```typescript
const rowNumber = await sheetsService.addLead({
  email: 'customer@company.com',
  company: 'ACME Corp',
  customerName: 'John Doe',
  phone: '0812345678',
  // ... other fields
});
// Returns: 42 (row number)
```

#### `getLeadByRow(rowNumber: number): Promise<LeadRow | null>`
ดึงข้อมูล Lead ตาม row number

```typescript
const lead = await sheetsService.getLeadByRow(42);
// Returns: LeadRow object or null
```

#### `updateLeadStatus(rowNumber: number, status: string, userId: string): Promise<void>`
อัปเดตสถานะ Lead พร้อม Race Condition check

```typescript
await sheetsService.updateLeadStatus(42, 'contacted', 'U123456789');
// Throws RaceConditionError if already claimed by someone else
```

#### `claimLead(rowNumber: number, userId: string, userName: string): Promise<ClaimResult>`
รับงาน Lead พร้อมตรวจสอบ Race Condition

```typescript
const result = await sheetsService.claimLead(42, 'U123', 'John');
// Returns: { success: true, lead: LeadRow }
// Or: { success: false, owner: 'Jane' }
```

#### `getSalesTeamMember(userId: string): Promise<SalesTeamMember | null>`
ค้นหาข้อมูลเซลล์จาก LINE User ID

```typescript
const member = await sheetsService.getSalesTeamMember('U123456789');
// Returns: { userId, name, email, phone } or null
```

#### `healthCheck(): Promise<HealthCheckResult>`
ตรวจสอบการเชื่อมต่อ Google Sheets

```typescript
const health = await sheetsService.healthCheck();
// Returns: { healthy: true, latency: 150 }
```

### Error Handling
- Retry 3 ครั้งด้วย exponential backoff
- Circuit Breaker pattern
- Fallback to DLQ on persistent failure

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

### Fallback Values
เมื่อ API ล้มเหลว จะใช้ค่า default:

```typescript
{
  industry: 'ไม่ระบุ',
  companyType: 'B2B',
  talkingPoint: 'ENEOS มีน้ำมันหล่อลื่นคุณภาพสูงสำหรับทุกอุตสาหกรรม',
  website: null,
  registeredCapital: null,
  keywords: []
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
- Cache ใน Memory และ Redis
- บันทึกลง Google Sheets

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

### Cache Layers
1. **Memory Cache** - LRU Cache, 1000 items, 24h TTL
2. **Redis** - Optional, shared across instances
3. **Google Sheets** - Persistent storage

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
  error: 'Google Sheets API timeout',
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

## Service Initialization

### Singleton Pattern

ทุก services ใช้ singleton pattern:

```typescript
// src/services/sheets.service.ts
class SheetsService {
  private static instance: SheetsService;

  static getInstance(): SheetsService {
    if (!SheetsService.instance) {
      SheetsService.instance = new SheetsService();
    }
    return SheetsService.instance;
  }
}

export const sheetsService = SheetsService.getInstance();
```

### Dependency Injection

Services import กันโดยตรง:

```typescript
// webhook.controller.ts
import { sheetsService } from '../services/sheets.service.js';
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
app.get('/health', async (req, res) => {
  const [sheets, gemini, line] = await Promise.all([
    sheetsService.healthCheck(),
    geminiService.healthCheck(),
    lineService.healthCheck(),
  ]);

  const allHealthy = sheets.healthy && gemini.healthy && line.healthy;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services: { sheets, gemini, line }
  });
});
```
