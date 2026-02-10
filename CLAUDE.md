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
npm test                 # Run all tests (Vitest) - 1400+ tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report (79%+ coverage)
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

## Development Flow (BMAD) - MANDATORY

ทุกครั้งที่พัฒนา feature หรือ fix bug ต้องทำตาม flow นี้:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  1. Create Branch ──→ 2. Amelia (Dev) ──→ 3. Open PR        │
│                                               │              │
│                    4. Rex (Code Review) ◄──────┘              │
│                         │                                    │
│                    PASS? ──→ YES ──→ 5. Merge to main        │
│                         │                                    │
│                        FAIL                                  │
│                         │                                    │
│                         ▼                                    │
│                   Amelia (Fix) ──→ Push ──→ Rex review again │
│                   (loop until PASS)                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Branch & PR Convention

| Step | Action | Command |
|------|--------|---------|
| **1. Create branch** | สร้าง feature branch จาก main | `git checkout -b feat/story-{epic}-{number}` |
| **2. Implement** | Amelia implement story บน feature branch | `/bmad:bmm:agents:dev` → [DS] |
| **3. Open PR** | เปิด PR ไปยัง main | `gh pr create --base main` |
| **4. Code Review** | Rex review บน PR | `/bmad:bmm:agents:code-reviewer` → [RV] |
| **5. Merge** | Merge เมื่อ Rex APPROVED | Merge PR on GitHub |

**Branch Naming:**
- Feature: `feat/story-{epic}-{number}` (e.g., `feat/story-6-5`)
- Bugfix: `fix/{short-description}` (e.g., `fix/race-condition-sheets`)
- Hotfix: `hotfix/{short-description}` (e.g., `hotfix/line-signature`)

**PR Rules:**
- ห้าม push ตรงไป `main` — ต้องผ่าน PR เสมอ
- PR ต้องผ่าน CI (quality + test + burn-in) ก่อน merge
- Rex APPROVED = ready to merge

### Agents

| Agent | Command | Role |
|-------|---------|------|
| **Amelia** (Dev) | `/bmad:bmm:agents:dev` | Implement story, fix issues |
| **Rex** (Code-Reviewer) | `/bmad:bmm:agents:code-reviewer` | Adversarial code review |

### Rules

1. **ห้าม Dev review code ตัวเอง** - Amelia implement แล้วต้องให้ Rex review
2. **Loop จนกว่า Rex PASS** - ถ้า Rex พบ issues ต้อง fix แล้ว review อีกรอบ
3. **ใช้ Full Review [RV]** - ตรวจครบทั้ง Code + Tests + Acceptance Criteria
4. **No Human Review Required** - Rex เป็น quality gate สุดท้าย (Lead skip ได้)
5. **ห้าม push ตรงไป main** - ต้องผ่าน feature branch + PR เสมอ

> **Note:** ใช้ [AR] Adversarial Review สำหรับ security-sensitive code (auth, payment)

### Rex Review Verdicts

| Verdict | Action |
|---------|--------|
| ✅ **APPROVED** | Merge PR to main ได้ |
| ⚠️ **CHANGES_REQUESTED** | Amelia fix + push ไป branch เดิม → Rex review อีกรอบ |
| ❌ **BLOCKED** | มี Critical issue ต้องแก้ก่อน |

### Quick Start

```bash
# 1. Create feature branch
git checkout -b feat/story-6-5

# 2. Implement story
/bmad:bmm:agents:dev
# เลือก [DS] Dev Story

# 3. Open PR (after implementation done)
git add <files> && git commit -m "feat: story description"
gh pr create --base main --title "feat: story title" --body "## Summary ..."

# 4. Code review on PR
/bmad:bmm:agents:code-reviewer
# เลือก [RV] Full Review (หรือ [AR] สำหรับ security code)

# 5. If issues found → fix → push → review again (loop)
# 6. Rex APPROVED → Merge PR
```

## Architecture

### Data Flow (2 Main Scenarios)

**Scenario A (New Lead from Brevo):**
```
Brevo Webhook → Validate → Check Duplicate → Gemini AI Analysis
→ Save to Supabase → Send LINE Flex Message
```

**Scenario B (Sales Action from LINE):**
```
LINE Postback → Verify Signature → Check Race Condition
→ Update Supabase → Reply LINE Confirmation
```

### Project Structure

```
src/
├── config/              # Centralized config with Zod validation
├── controllers/         # Request handlers (webhook, line)
├── middleware/          # Express middleware (auth, logging, errors)
├── routes/              # API routes definition
├── services/            # Business logic layer
│   ├── leads.service.ts            # Lead CRUD (Supabase)
│   ├── sales-team.service.ts       # Sales team CRUD (Supabase)
│   ├── status-history.service.ts   # Status history tracking (Supabase)
│   ├── campaign-stats.service.ts   # Campaign events & stats (Supabase)
│   ├── deduplication.service.ts    # Prevent duplicate leads (Supabase)
│   ├── gemini.service.ts           # AI company analysis
│   ├── line.service.ts             # LINE messaging & Flex Message
│   ├── dead-letter-queue.service.ts  # Failed event tracking
│   └── redis.service.ts            # Redis client wrapper (optional)
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

1. **leads.service.ts** - Lead CRUD (Supabase)
   - `addLead()`: เพิ่ม Lead ใหม่ (Scenario A)
   - `getLeadById()`: ดึงข้อมูล Lead ตาม UUID
   - `claimLead()`: อัปเดตสถานะพร้อม Race Condition Check (Scenario B)
   - `getAllLeads()`: ดึง Lead ทั้งหมดสำหรับ Admin Dashboard

2. **sales-team.service.ts** - Sales Team CRUD (Supabase)
   - `getSalesTeamMember()`: ดึงข้อมูลเซลล์ตาม LINE User ID
   - `getUserByEmail()`: ดึงข้อมูลสมาชิกตาม email
   - `linkLINEAccount()`: เชื่อม LINE account กับสมาชิก (race-safe)

3. **status-history.service.ts** - Status History (Supabase)
   - `addStatusHistory()`: บันทึกการเปลี่ยนสถานะ (fire-and-forget)
   - `getStatusHistory()`: ดึงประวัติสถานะของ Lead

4. **campaign-stats.service.ts** - Campaign Events & Stats (Supabase)
   - `recordCampaignEvent()`: บันทึก event จาก Brevo Campaign webhook
   - `getAllCampaignStats()`: ดึง campaign stats ทั้งหมด
   - `getCampaignEvents()`: ดึง events สำหรับ campaign เฉพาะ

5. **deduplication.service.ts** - Prevent Duplicates (Supabase)
   - ใช้ `email + campaignId` เป็น unique key
   - Supabase upsert with `ignoreDuplicates: true`

6. **gemini.service.ts** - AI Enrichment
   - `analyzeCompany()`: วิเคราะห์อุตสาหกรรมและสร้าง Talking Point
   - Fallback ไป default values เมื่อ API error

7. **line.service.ts** - LINE Integration
   - `pushLeadNotification()`: ส่ง Flex Message ไปกลุ่ม
   - `replyMessage()`: ตอบกลับเซลล์หลังกดปุ่ม
   - `verifySignature()`: ตรวจสอบ webhook signature (CRITICAL for security)

8. **dead-letter-queue.service.ts** - Error Recovery
   - เก็บ failed events ไว้ใน memory (development)
   - มี `/dlq` endpoints สำหรับดู/ลบ events ที่ล้มเหลว

## Supabase Database Structure

ระบบใช้ Supabase PostgreSQL เป็น database หลัก พร้อม 6 tables:

1. **leads** (Main database)
   - Primary Key: `id` (UUID, auto-generated)
   - Key columns: email, customer_name, phone, company, industry_ai, status, sales_owner_id, sales_owner_name, campaign_id, talking_point, version, lead_uuid, created_at, updated_at, contacted_at
   - `version` column for optimistic locking (race condition protection)

2. **deduplication_log** (Prevent duplicates)
   - Key columns: key, email, campaign_id, processed_at
   - UNIQUE constraint on `key` for upsert-based dedup

3. **sales_team** (User mapping)
   - Key columns: line_user_id, name, email, phone, role, status

4. **status_history** (Status change audit log)
   - Key columns: lead_id (FK → leads.id), status, changed_by_id, changed_by_name, timestamp, notes
   - Fire-and-forget writes — never blocks main operations

5. **campaign_events** (Brevo Campaign Event Log)
   - Key columns: event_id, campaign_id, campaign_name, email, event, event_at
   - UNIQUE constraint on event_id for dedup

6. **campaign_stats** (Campaign Aggregate Metrics)
   - Key columns: campaign_id, campaign_name, delivered, opened, clicked, unique_opens, unique_clicks, open_rate, click_rate

## Environment Variables

ตัวแปรที่จำเป็นต้องตั้งค่า (ดูรายละเอียดครบใน `.env.example`):

**Critical:**
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
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
- Coverage: **75%+** (1400+ tests)
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
npm test                                                    # Run all tests
npm run test:coverage                                       # With coverage report
npm run test:ui                                             # Visual UI mode
npm test -- src/__tests__/services/leads.service.test.ts    # Run specific file
npm test -- -t "should add lead"                            # Run test by name
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
   - ใช้ Supabase version column (optimistic locking)
   - อ่าน → เช็ค Sales_Owner_ID → เขียน (version check)
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
| GET | `/metrics/summary` | Human-readable Metrics JSON |
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

1. **Supabase as Database:**
   - ระบบใช้ Supabase PostgreSQL เป็น database หลัก
   - UUID คือ Primary Key
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

6. **UUID-based Identifiers:**
   - Lead UUID เป็น Primary Key ใน Supabase
   - LINE Postback ใช้ `lead_id` (UUID) เท่านั้น (legacy `row_id` ไม่รองรับแล้ว)
   - Timestamps: `created_at`, `updated_at` เป็น ISO 8601 format
   - UUID ถูกสร้างอัตโนมัติโดย Supabase เมื่อ addLead()

## Documentation

### Backend API
| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture with Mermaid diagrams |
| [docs/api-reference.md](docs/api-reference.md) | API endpoints reference |
| [docs/api/api-contract.md](docs/api/api-contract.md) | **API Contract** - Shared frontend/backend param specs (Epic 4 Action Item) |
| [docs/data-flow.md](docs/data-flow.md) | Data flow and sequence diagrams |
| [docs/services.md](docs/services.md) | Services layer documentation |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment instructions |

### Planned Features
| Document | Description |
|----------|-------------|
| [docs/admin-dashboard/](docs/admin-dashboard/) | Admin Dashboard (Next.js) - Complete design docs |
| [docs/admin-dashboard/CLAUDE-CONTEXT.md](docs/admin-dashboard/CLAUDE-CONTEXT.md) | Quick reference for Admin Dashboard development |
| [docs/liff-plan.md](docs/liff-plan.md) | LIFF App (LINE Frontend) - Plan document |
