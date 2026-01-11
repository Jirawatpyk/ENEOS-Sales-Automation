# ENEOS Sales Automation System

ระบบ Sales Automation ครบวงจรสำหรับ ENEOS Thailand พัฒนาด้วย Node.js + TypeScript

## 🎯 Features

- **Brevo Integration** - รับ Lead อัตโนมัติจาก Email Click Events
- **Gemini AI** - วิเคราะห์ข้อมูลบริษัทลูกค้าอัตโนมัติ
- **Google Sheets** - Database สำหรับเก็บข้อมูล Lead
- **LINE OA** - แจ้งเตือนทีมขายด้วย Flex Message + กดรับงานได้เลย
- **Race Condition Protection** - ป้องกันการแย่งงานระหว่างเซลล์
- **Deduplication** - ป้องกัน Lead ซ้ำซ้อน

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SCENARIO A (New Lead)                    │
├─────────────────────────────────────────────────────────────┤
│  Brevo (Email Click) → Webhook → Check Duplicate            │
│         ↓                                                    │
│  Gemini AI (วิเคราะห์บริษัท)                                   │
│         ↓                                                    │
│  Google Sheets (บันทึก Lead)                                 │
│         ↓                                                    │
│  LINE OA (ส่ง Flex Message ไป Group)                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  SCENARIO B (Sales Action)                  │
├─────────────────────────────────────────────────────────────┤
│  Sales กดปุ่มใน LINE → Webhook → Check Race Condition        │
│         ↓                                                    │
│  Update Google Sheets (Status + Owner)                      │
│         ↓                                                    │
│  Reply LINE (ยืนยัน/แจ้งเตือน)                                │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Google Cloud Service Account
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
# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_sheet_id

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

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API Information |
| GET | `/health` | Health Check (all services) |
| GET | `/ready` | Readiness Check |
| POST | `/webhook/brevo` | Brevo Webhook (Scenario A) |
| POST | `/webhook/line` | LINE Webhook (Scenario B) |

## 📊 Google Sheets Setup

Create a Google Sheet with the following structure:

### Sheet 1: `Leads`

| Column | Header |
|--------|--------|
| A | Date |
| B | Customer Name |
| C | Email |
| D | Phone |
| E | Company |
| F | Industry_AI |
| G | Website |
| H | Capital |
| I | Status |
| J | Sales_Owner_ID |
| K | Sales_Owner_Name |
| L | Campaign_ID |
| M | Campaign_Name |
| N | Email_Subject |
| O | Source |
| P | Lead_ID |
| Q | Event_ID |
| R | Clicked_At |
| S | Talking_Point |
| T | Closed_At |
| U | Lost_At |
| V | Unreachable_At |
| W | Version |

### Sheet 2: `Deduplication_Log`

| Column | Header |
|--------|--------|
| A | Key |
| B | Email |
| C | Campaign_ID |
| D | Processed_At |

### Sheet 3: `Sales_Team`

| Column | Header |
|--------|--------|
| A | LINE_User_ID |
| B | Name |
| C | Email |
| D | Phone |

## 🔐 Security Features

- **Helmet** - Security headers
- **Rate Limiting** - Protect against abuse
- **Input Validation** - Zod schema validation
- **Webhook Signature** - LINE signature verification
- **Graceful Shutdown** - Clean shutdown on SIGTERM/SIGINT
- **Error Handling** - Centralized error handling

## 🏗️ Architecture

```
src/
├── config/          # Configuration & environment
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── routes/          # API routes
├── services/        # Business logic
│   ├── sheets.service.ts      # Google Sheets operations
│   ├── gemini.service.ts      # AI analysis
│   ├── line.service.ts        # LINE messaging
│   └── deduplication.service.ts # Lead deduplication
├── templates/       # LINE Flex Message templates
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
│   ├── logger.ts    # Winston logger
│   ├── retry.ts     # Retry logic & Circuit Breaker
│   └── ...
├── validators/      # Input validation schemas
└── app.ts           # Main application entry
```

## 📈 Monitoring

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "googleSheets": { "status": "up", "latency": 150 },
    "geminiAI": { "status": "up", "latency": 500 },
    "lineAPI": { "status": "up", "latency": 100 }
  }
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Google Sheets Auth Failed**
   - ตรวจสอบ Service Account Email
   - ตรวจสอบ Private Key (ต้องมี `\n` ครบถ้วน)
   - Share Sheet ให้ Service Account

2. **LINE Signature Invalid**
   - ตรวจสอบ Channel Secret
   - ตรวจสอบว่า Request Body ไม่ถูก parse ก่อน verify

3. **Gemini API Error**
   - ตรวจสอบ API Key
   - ตรวจสอบ Rate Limit
   - ระบบจะ fallback ใช้ค่า default อัตโนมัติ

## 📚 Documentation

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

## 📈 Monitoring

| Endpoint | Description |
|----------|-------------|
| `/health` | Full health check with service status |
| `/ready` | Kubernetes readiness probe |
| `/live` | Kubernetes liveness probe |
| `/metrics` | Prometheus metrics |
| `/metrics/summary` | Human-readable metrics JSON |

## 📝 License

UNLICENSED - ENEOS Thailand Internal Use Only

## 👥 Contributors

- ENEOS Thailand Digital Team
