# ENEOS Sales Automation - Deployment Guide

## 📋 Prerequisites

ก่อน Deploy ต้องเตรียมสิ่งเหล่านี้:

### 1. Supabase Setup
1. สร้าง Project ใน [Supabase Dashboard](https://supabase.com/dashboard)
2. รัน migration SQL เพื่อสร้าง tables (leads, sales_team, status_history, deduplication_log, campaign_events, campaign_stats)
3. จด Project URL และ Service Role Key

### 2. Google Gemini API
1. ไปที่ [Google AI Studio](https://aistudio.google.com/apikey)
2. สร้าง API Key

### 3. LINE Official Account
1. ไปที่ [LINE Developers Console](https://developers.line.biz)
2. สร้าง Messaging API Channel
3. ออก Channel Access Token (long-lived)
4. จด Channel Secret
5. เปิด Webhook และใส่ URL หลัง deploy

### 4. Brevo
1. ไปที่ [Brevo](https://app.brevo.com)
2. ตั้งค่า Webhook ใน Automation
3. สร้าง Webhook Secret

---

## 🚂 Deploy to Railway

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login
```bash
railway login
```

### Step 3: Create Project
```bash
railway init
```

### Step 4: Set Environment Variables
ไปที่ Railway Dashboard > Variables แล้วเพิ่ม:

```
NODE_ENV=production
BREVO_WEBHOOK_SECRET=your_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret
LINE_GROUP_ID=your_group_id
```

### Step 5: Deploy
```bash
railway up
```

### Step 6: Get URL
```bash
railway domain
```

---

## 🌐 Deploy to Render

### Option A: Blueprint (Recommended)

1. Push code to GitHub
2. ไปที่ [Render Dashboard](https://dashboard.render.com)
3. คลิก **New** > **Blueprint**
4. เลือก Repository
5. Render จะอ่าน `render.yaml` และ deploy อัตโนมัติ
6. ไปตั้งค่า Environment Variables ใน Dashboard

### Option B: Manual

1. ไปที่ [Render Dashboard](https://dashboard.render.com)
2. คลิก **New** > **Web Service**
3. เชื่อมต่อ Repository
4. ตั้งค่า:
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
5. เพิ่ม Environment Variables
6. คลิก **Create Web Service**

---

## 🐳 Deploy with Docker

### Build & Run Locally
```bash
docker-compose up -d
```

### Push to Container Registry
```bash
# Build
docker build -t eneos-sales-automation .

# Tag
docker tag eneos-sales-automation your-registry/eneos-sales-automation:latest

# Push
docker push your-registry/eneos-sales-automation:latest
```

### Deploy to Any Container Platform
- **Google Cloud Run**: `gcloud run deploy`
- **AWS ECS**: Use Fargate
- **Azure Container Apps**: `az containerapp up`

---

## 🔧 Post-Deployment Setup

### 1. Configure Brevo Webhook
1. ไปที่ Brevo > Automation > Webhooks
2. ใส่ URL: `https://your-domain.com/webhook/brevo`
3. เลือก Event: `click`
4. ใส่ Secret key

### 2. Configure LINE Webhook
1. ไปที่ LINE Developers Console
2. ไปที่ Channel > Messaging API
3. ใส่ Webhook URL: `https://your-domain.com/webhook/line`
4. เปิด **Use webhook**
5. Verify webhook

### 3. Test Endpoints
```bash
# Health check
curl https://your-domain.com/health

# Test Brevo webhook
curl -X POST https://your-domain.com/webhook/brevo \
  -H "Content-Type: application/json" \
  -d '{"event":"click","email":"test@test.com","campaign_id":1}'
```

---

## 📊 Monitoring

### Health Check Endpoint
```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "services": {
    "supabase": { "status": "up" },
    "geminiAI": { "status": "up" },
    "lineAPI": { "status": "up" }
  }
}
```

### Logs
- **Railway**: `railway logs`
- **Render**: Dashboard > Logs
- **Docker**: `docker-compose logs -f`

---

## 🔒 Security Checklist

- [ ] ใช้ HTTPS เท่านั้น
- [ ] ตั้ง Environment Variables ผ่าน Dashboard (ไม่เก็บใน code)
- [ ] ไม่ commit `.env` file
- [ ] ไม่ commit Supabase Service Role Key
- [ ] ตั้ง Rate Limiting
- [ ] ตั้ง CORS ถ้าต้องการ

---

## 🆘 Troubleshooting

### Error: Supabase Connection Failed
- ตรวจสอบว่า SUPABASE_URL ถูกต้อง
- ตรวจสอบว่า SUPABASE_SERVICE_ROLE_KEY ยังไม่หมดอายุ

### Error: LINE Signature Invalid
- ตรวจสอบ Channel Secret
- ตรวจสอบว่า Request Body ไม่ถูก parse ก่อน verify

### Error: Gemini API Rate Limit
- ระบบจะ fallback ใช้ค่า default อัตโนมัติ
- พิจารณา upgrade Gemini API plan

### Error: Webhook Timeout
- LINE Webhook ต้องตอบภายใน 1 วินาที
- ระบบนี้ออกแบบให้ตอบทันทีและ process ใน background

---

## 📞 Support

หากมีปัญหาในการ deploy กรุณาติดต่อทีม Development
