#!/bin/bash
# Test Brevo Webhook - สยามคูโบต้า คอร์ปอเรชั่น
# ใช้สำหรับ test grounding fields

# Backend URL (เปลี่ยนตาม environment)
BACKEND_URL="http://localhost:3000"

# Webhook secret (ดูจาก .env file)
# ถ้าไม่มี secret ให้ comment บรรทัด header ออก
# WEBHOOK_SECRET="your-webhook-secret-here"

echo "🚀 Sending test webhook for: บจก. สยามคูโบต้า คอร์ปอเรชั่น"
echo "Backend: $BACKEND_URL/webhook/brevo"
echo ""

curl -X POST "$BACKEND_URL/webhook/brevo" \
  -H "Content-Type: application/json" \
  -H "X-Brevo-Signature: test-signature" \
  -d '{
    "event": "click",
    "email": "contact@siamkubota.co.th",
    "contact_id": 999001,
    "campaign_id": 100,
    "campaign_name": "Test Campaign - Kubota",
    "subject": "ENEOS Lubricants for Industrial Equipment",
    "link": "https://eneos.co.th/products",
    "ts_event": 1737875400,
    "attributes": {
      "FIRSTNAME": "สมชาย",
      "LASTNAME": "ใจดี",
      "COMPANY": "บจก. สยามคูโบต้า คอร์ปอเรชั่น",
      "PHONE": "02-123-4567",
      "JOB_TITLE": "Purchasing Manager",
      "LEAD_SOURCE": "Website",
      "CITY": "Bangkok",
      "WEBSITE": "https://www.siamkubota.co.th"
    }
  }' | jq .

echo ""
echo "✅ Webhook sent!"
echo ""
echo "Expected grounding fields to be populated by Gemini AI:"
echo "  - juristicId: เลขทะเบียนนิติบุคคล (ถ้า Gemini หาเจอ)"
echo "  - dbdSector: รหัส sector (ถ้า Gemini หาเจอ)"
echo "  - province: จังหวัด (ถ้า Gemini หาเจอ)"
echo "  - fullAddress: ที่อยู่เต็ม (ถ้า Gemini หาเจอ)"
echo ""
echo "📋 Check logs:"
echo "  - Backend console for Gemini AI response"
echo "  - Google Sheets columns AE-AH (juristicId, dbdSector, province, fullAddress)"
