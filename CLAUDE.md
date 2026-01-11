# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ระบบ Sales Automation แบบ Enterprise สำหรับ ENEOS Thailand ที่รับ Lead จาก Email Campaign (Brevo) วิเคราะห์ด้วย Gemini AI และแจ้งเตือนทีมขายผ่าน LINE OA พร้อมป้องกัน Race Condition และ Duplicate Leads

## Common Commands

### Development
```bash
npm run dev              # Start development server with hot reload (tsx watch)
npm run typecheck        # Type checking without emit
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors automatically
```

### Testing
```bash
npm test                 # Run all tests (Vitest) - 301 tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report (75%+ coverage)
npm run test:ui          # Open Vitest UI
```

### Production
```bash
npm run build            # Compile TypeScript to dist/
npm start                # Run production server (node dist/app.js)
```

### Docker
```bash
docker-compose up -d     # Build and run in background
docker-compose logs -f   # View logs
docker-compose down      # Stop and remove containers
```

### Health Check
```bash
npm run health           # Check health endpoint (requires jq)
curl http://localhost:3000/health
```

## Architecture

### Data Flow (2 Main Scenarios)

**Scenario A (New Lead from Brevo):**
```
Brevo Webhook → Validate → Check Duplicate → Gemini AI Analysis
→ Save to Google Sheets → Send LINE Flex Message
```

**Scenario B (Sales Action from LINE):**
```
LINE Postback → Verify Signature → Check Race Condition
→ Update Google Sheets → Reply LINE Confirmation
```

### Project Structure

```
src/
├── config/              # Centralized config with Zod validation
├── controllers/         # Request handlers (webhook, line)
├── middleware/          # Express middleware (auth, logging, errors)
├── routes/              # API routes definition
├── services/            # Business logic layer
│   ├── sheets.service.ts         # Google Sheets CRUD operations
│   ├── gemini.service.ts         # AI company analysis
│   ├── line.service.ts           # LINE messaging & Flex Message
│   ├── deduplication.service.ts  # Prevent duplicate leads
│   ├── dead-letter-queue.service.ts  # Failed event tracking
│   └── redis.service.ts          # Redis client wrapper (optional)
├── templates/           # LINE Flex Message JSON templates
├── types/               # TypeScript type definitions
├── utils/               # Utilities (logger, retry, formatter)
├── validators/          # Zod schemas (brevo, line)
└── __tests__/           # Vitest test files
    ├── mocks/           # Shared mock objects
    ├── services/        # Service unit tests
    ├── controllers/     # Controller tests
    ├── templates/       # Template tests
    └── app.test.ts      # Integration tests
```

### Core Services

1. **sheets.service.ts** - ใจกลางของระบบ CRUD
   - `addLead()`: เพิ่ม Lead ใหม่ (Scenario A)
   - `updateLeadStatus()`: อัปเดตสถานะพร้อม Race Condition Check (Scenario B)
   - `getLeadByRow()`: ดึงข้อมูล Lead ตาม row number
   - `checkDuplicate()`: ตรวจสอบการซ้ำซ้อนผ่าน Deduplication_Log sheet
   - `getSalesTeamMember()`: ดึงข้อมูลเซลล์จาก Sales_Team sheet

2. **gemini.service.ts** - AI Enrichment
   - `analyzeCompany()`: วิเคราะห์อุตสาหกรรมและสร้าง Talking Point
   - Fallback ไป default values เมื่อ API error
   - Retry logic with exponential backoff

3. **line.service.ts** - LINE Integration
   - `pushLeadNotification()`: ส่ง Flex Message ไปกลุ่ม
   - `replyMessage()`: ตอบกลับเซลล์หลังกดปุ่ม
   - `verifySignature()`: ตรวจสอบ webhook signature (CRITICAL for security)

4. **deduplication.service.ts** - Prevent Duplicates
   - ใช้ `email + campaignId` เป็น unique key
   - บันทึกลง Google Sheets tab "Deduplication_Log"
   - Fallback to in-memory cache ถ้า Sheets ล่ม

5. **dead-letter-queue.service.ts** - Error Recovery
   - เก็บ failed events ไว้ใน memory (development)
   - มี `/dlq` endpoints สำหรับดู/ลบ events ที่ล้มเหลว

## Google Sheets Structure

ระบบต้องการ 3 Sheets หลัก:

1. **Leads** (Main database)
   - Columns: Date, Customer Name, Email, Phone, Company, Industry_AI, Website, Capital, Status, Sales_Owner_ID, Sales_Owner_Name, Campaign_ID, Campaign_Name, Email_Subject, Source, Lead_ID, Event_ID, Clicked_At, Talking_Point, Closed_At, Lost_At, Unreachable_At, Version

2. **Deduplication_Log** (Prevent duplicates)
   - Columns: Key, Email, Campaign_ID, Processed_At

3. **Sales_Team** (User mapping)
   - Columns: LINE_User_ID, Name, Email, Phone

## Environment Variables

ตัวแปรที่จำเป็นต้องตั้งค่า (ดูรายละเอียดครบใน `.env.example`):

**Critical:**
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`
- `GEMINI_API_KEY`
- `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `LINE_GROUP_ID`
- `BREVO_WEBHOOK_SECRET`

**Feature Flags:**
- `ENABLE_AI_ENRICHMENT=true` - เปิด/ปิด Gemini AI
- `ENABLE_DEDUPLICATION=true` - เปิด/ปิดการตรวจสอบซ้ำ
- `ENABLE_LINE_NOTIFICATIONS=true` - เปิด/ปิด LINE แจ้งเตือน

**Security (Development Only):**
- `SKIP_LINE_SIGNATURE_VERIFICATION=false` - ห้ามใช้ในโปรดักชัน

## Testing Guidelines

### Test Structure
- Framework: **Vitest** with supertest for HTTP testing
- Coverage: **75%+** (301 tests)
- Mocks: `src/__tests__/mocks/` for shared mock objects

### Key Testing Patterns

1. **Mock Hoisting with vi.hoisted()**
```typescript
const { mockClient, mockCircuitBreaker } = vi.hoisted(() => {
  const mockClient = {
    pushMessage: vi.fn().mockResolvedValue({}),
    replyMessage: vi.fn().mockResolvedValue({}),
  };
  const mockCircuitBreaker = {
    execute: vi.fn((fn: () => Promise<unknown>) => fn()),
  };
  return { mockClient, mockCircuitBreaker };
});

vi.mock('@line/bot-sdk', () => ({
  Client: vi.fn().mockImplementation(() => mockClient),
}));
```

2. **Integration Tests with Supertest**
```typescript
import request from 'supertest';
import app from '../app.js';

const response = await request(app).get('/health');
expect(response.status).toBe(200);
```

3. **Test Files Location**
- Unit tests: `src/__tests__/services/*.test.ts`
- Controller tests: `src/__tests__/controllers/*.test.ts`
- Integration tests: `src/__tests__/app.test.ts`
- Template tests: `src/__tests__/templates/*.test.ts`

### Running Tests
```bash
npm test                  # Run all tests
npm run test:coverage     # With coverage report
npm run test:ui           # Visual UI mode
```

## Security Best Practices

1. **LINE Signature Verification:**
   - ระบบ verify ทุก request จาก LINE webhook
   - ห้ามปิด `SKIP_LINE_SIGNATURE_VERIFICATION` ใน production
   - ใช้ raw body ก่อน parse เพื่อ verify signature

2. **Rate Limiting:**
   - Default: 100 requests ต่อ 60 วินาที
   - ปรับได้ผ่าน `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_MS`

3. **Race Condition Protection:**
   - ใช้ Google Sheets row เป็น lock mechanism
   - อ่าน → เช็ค Sales_Owner_ID → เขียน (atomic)
   - ถ้ามีคนรับงานก่อน จะ reply LINE แจ้งเตือน

4. **Error Handling:**
   - Centralized error handler ใน `middleware/error-handler.ts`
   - Custom error classes: `AppError`, `ValidationError`, `DuplicateLeadError`, `RaceConditionError`
   - Integration กับ Sentry (optional)

## Common Patterns

### 1. Retry Logic (utils/retry.ts)
```typescript
import { retryWithBackoff } from './utils/retry.js';

await retryWithBackoff(() => apiCall(), {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000
});
```

### 2. Logger Usage (utils/logger.ts)
```typescript
import { logger, webhookLogger } from './utils/logger.js';

logger.info('General log', { context: 'data' });
webhookLogger.info('Webhook specific', { email: 'test@test.com' });
```

### 3. Config Access (config/index.ts)
```typescript
import { config } from './config/index.js';

if (config.features.aiEnrichment) {
  // Do AI analysis
}
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API Information |
| GET | `/health` | Health Check (all services) |
| GET | `/ready` | Readiness Check |
| GET | `/live` | Liveness Check |
| GET | `/metrics` | Prometheus Metrics |
| GET | `/api-docs.json` | OpenAPI Specification |
| POST | `/webhook/brevo` | Brevo Webhook (Scenario A) |
| POST | `/webhook/line` | LINE Webhook (Scenario B) |
| GET | `/stats` | System Stats (dev only) |
| GET | `/dlq` | Dead Letter Queue (dev only) |

## Deployment

- Support: Railway, Render, Docker, Google Cloud Run
- ดูรายละเอียดครบใน `DEPLOYMENT.md`
- Health check endpoint: `/health`
- Readiness check: `/ready`
- Liveness check: `/live`

## Module System

- ใช้ ES Modules (NodeNext)
- ต้องมี `.js` extension ใน import statements
- TypeScript compiles to `dist/` folder

## Critical Notes

1. **Google Sheets as Database:**
   - ระบบใช้ Google Sheets เป็น database หลัก (ไม่ใช่ SQL/NoSQL)
   - Row number คือ Primary Key
   - Version column ใช้สำหรับ optimistic locking

2. **LINE Webhook Timeout:**
   - LINE ต้องการ response ภายใน 1 วินาที
   - ระบบ respond 200 OK ทันที แล้วค่อย process background

3. **Gemini AI Fallback:**
   - ถ้า API ล้มเหลว ใช้ค่า default: "ไม่ระบุ", "B2B", "ENEOS มีน้ำมันหล่อลื่นคุณภาพสูง"
   - ไม่ fail ทั้ง request เพราะ AI error

4. **Phone Number Formatting:**
   - ใช้ `utils/phone-formatter.ts` เพื่อแปลง 081-234-5678 → 0812345678
   - รองรับ format ไทยหลากหลายแบบ

5. **Email Domain Extraction:**
   - ใช้ `utils/email-parser.ts` แยก domain จาก email
   - ส่งให้ Gemini วิเคราะห์ว่าบริษัทนี้ทำธุรกิจอะไร
