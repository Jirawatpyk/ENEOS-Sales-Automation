# ENEOS Sales Automation System

ระบบ Sales Automation ครบวงจรสำหรับ ENEOS Thailand พัฒนาด้วย Node.js + TypeScript

## Features

- **Brevo Integration** - รับ Lead อัตโนมัติจาก Email Click Events
- **Gemini AI** - วิเคราะห์ข้อมูลบริษัทลูกค้าอัตโนมัติ
- **Supabase** - PostgreSQL Database สำหรับเก็บข้อมูล Lead, Sales Team, Campaign Events
- **LINE OA** - แจ้งเตือนทีมขายด้วย Flex Message + กดรับงานได้เลย
- **Race Condition Protection** - ป้องกันการแย่งงานระหว่างเซลล์ (optimistic locking)
- **Deduplication** - ป้องกัน Lead ซ้ำซ้อน

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SCENARIO A (New Lead)                    │
├─────────────────────────────────────────────────────────────┤
│  Brevo (Email Click) → Webhook → Check Duplicate            │
│         ↓                                                    │
│  Gemini AI (วิเคราะห์บริษัท)                                   │
│         ↓                                                    │
│  Supabase (บันทึก Lead)                                      │
│         ↓                                                    │
│  LINE OA (ส่ง Flex Message ไป Group)                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  SCENARIO B (Sales Action)                  │
├─────────────────────────────────────────────────────────────┤
│  Sales กดปุ่มใน LINE → Webhook → Check Race Condition        │
│         ↓                                                    │
│  Update Supabase (Status + Owner via optimistic locking)    │
│         ↓                                                    │
│  Reply LINE (ยืนยัน/แจ้งเตือน)                                │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase Project (PostgreSQL)
- LINE Official Account
- Brevo Account
- Google Gemini API Key

### Installation

```bash
# Clone repository
git clone <https://github.com/Jirawatpyk/ENEOS-Sales-Automation.git>
cd eneos-sales-automation

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
```

### Configuration

Edit `.env` file with your credentials:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# LINE OA
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret
LINE_GROUP_ID=your_group_id

# Brevo
BREVO_WEBHOOK_SECRET=your_brevo_secret
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API Information |
| GET | `/health` | Health Check (all services) |
| GET | `/ready` | Readiness Check |
| POST | `/webhook/brevo` | Brevo Webhook (Scenario A) |
| POST | `/webhook/line` | LINE Webhook (Scenario B) |

## Supabase Database

The system uses Supabase PostgreSQL with the following tables:

### `leads`
Primary table for lead data — UUID primary key, optimistic locking via `version` column.

### `deduplication_log`
Prevents duplicate leads using `email + campaign_id` unique constraint.

### `sales_team`
User mapping — LINE User ID to sales team member details.

### `status_history`
Audit log for lead status changes.

### `campaign_events` / `campaign_stats`
Campaign event tracking and aggregate metrics.

## Security Features

- **Helmet** - Security headers
- **Rate Limiting** - Protect against abuse
- **Input Validation** - Zod schema validation
- **Webhook Signature** - LINE signature verification
- **Graceful Shutdown** - Clean shutdown on SIGTERM/SIGINT
- **Error Handling** - Centralized error handling

## Architecture

```
src/
├── config/          # Configuration & environment
├── controllers/     # Request handlers
├── lib/             # Supabase client
├── middleware/      # Express middleware
├── routes/          # API routes
├── services/        # Business logic
│   ├── leads.service.ts          # Lead CRUD (Supabase)
│   ├── sales-team.service.ts     # Sales team CRUD (Supabase)
│   ├── status-history.service.ts # Status history (Supabase)
│   ├── campaign-stats.service.ts # Campaign events & stats (Supabase)
│   ├── deduplication.service.ts  # Lead deduplication (Supabase)
│   ├── gemini.service.ts         # AI analysis
│   ├── line.service.ts           # LINE messaging
│   └── dead-letter-queue.service.ts # Failed event tracking
├── templates/       # LINE Flex Message templates
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
│   ├── logger.ts    # Winston logger
│   ├── retry.ts     # Retry logic & Circuit Breaker
│   └── ...
├── validators/      # Input validation schemas
└── app.ts           # Main application entry
```

## Monitoring

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "supabase": { "status": "up", "latency": 50 },
    "geminiAI": { "status": "up", "latency": 500 },
    "lineAPI": { "status": "up", "latency": 100 }
  }
}
```

## Troubleshooting

### Common Issues

1. **Supabase Connection Failed**
   - ตรวจสอบ `SUPABASE_URL` ว่าถูกต้อง
   - ตรวจสอบ `SUPABASE_SERVICE_ROLE_KEY` ว่าเป็น service role key (ไม่ใช่ anon key)
   - ตรวจสอบว่า tables ถูกสร้างครบ (leads, deduplication_log, sales_team, etc.)

2. **LINE Signature Invalid**
   - ตรวจสอบ Channel Secret
   - ตรวจสอบว่า Request Body ไม่ถูก parse ก่อน verify

3. **Gemini API Error**
   - ตรวจสอบ API Key
   - ตรวจสอบ Rate Limit
   - ระบบจะ fallback ใช้ค่า default อัตโนมัติ

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture with diagrams |
| [docs/api-reference.md](docs/api-reference.md) | API endpoints reference |
| [docs/data-flow.md](docs/data-flow.md) | Data flow documentation |
| [docs/services.md](docs/services.md) | Services documentation |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment instructions |
| [CLAUDE.md](CLAUDE.md) | AI assistant context |

### Interactive Documentation
- **Swagger UI**: `/api-docs`
- **OpenAPI Spec**: `/api-docs.json`

## Monitoring

| Endpoint | Description |
|----------|-------------|
| `/health` | Full health check with service status |
| `/ready` | Kubernetes readiness probe |
| `/live` | Kubernetes liveness probe |
| `/metrics` | Prometheus metrics |
| `/metrics/summary` | Human-readable metrics JSON |

## License

UNLICENSED - ENEOS Thailand Internal Use Only

## Contributors

- ENEOS Thailand Digital Team
