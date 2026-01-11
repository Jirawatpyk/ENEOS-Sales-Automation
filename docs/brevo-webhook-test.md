# Brevo Webhook Test Payloads

## Payload ที่ถูกต้อง (Complete)

```bash
curl -X POST http://localhost:3000/webhook/brevo \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "event": "click",
    "email": "somchai@example.com",
    "id": 99001,
    "date": "2026-01-12T11:00:00.000Z",
    "ts": 1736676000,
    "message-id": "msg-brevo-001",
    "ts_event": 1736676000,
    "subject": "ENEOS น้ำมันหล่อลื่นคุณภาพสูง",
    "tag": "lubricant-campaign",
    "sending_ip": "185.107.232.1",
    "ts_epoch": 1736676000,
    "link": "https://eneos.co.th/products",
    "sender_email": "sales@eneos.co.th",
    "campaign_id": 12345,
    "campaign_name": "Lubricant Campaign Q1-2026",
    "contact_id": 67890,
    "contact": {
      "FIRSTNAME": "สมชาย",
      "LASTNAME": "ใจดี",
      "PHONE": "081-234-5678",
      "COMPANY": "บริษัท ทดสอบ จำกัด"
    }
  }'
```

## Field Mapping

| Brevo Field | System Field | Required | Note |
|-------------|--------------|----------|------|
| `event` | - | ✅ | ต้องเป็น "click" |
| `email` | email | ✅ | Email ลูกค้า |
| `campaign_id` | campaignId | ✅ | ID แคมเปญ |
| `campaign_name` | campaignName | ✅ | ชื่อแคมเปญ |
| `subject` | emailSubject | ⚪ | หัวข้ออีเมล |
| `contact.FIRSTNAME` | customerName | ✅ | ชื่อลูกค้า |
| `contact.LASTNAME` | customerName | ✅ | นามสกุลลูกค้า |
| `contact.PHONE` | phone | ✅ | เบอร์โทร |
| `contact.COMPANY` | company | ✅ | ชื่อบริษัท |
| `contact_id` | leadId | ⚪ | Brevo Contact ID |
| `message-id` | eventId | ⚪ | Event ID |
| `date` | clickedAt | ⚪ | เวลาคลิก |

## ตัวอย่าง Payloads

### 1. บริษัทไทย (ภาษาไทย)

```json
{
  "event": "click",
  "email": "procurement@scg.com",
  "campaign_id": 10001,
  "campaign_name": "Construction Lubricant 2026",
  "subject": "น้ำมันหล่อลื่นสำหรับงานก่อสร้าง",
  "contact": {
    "FIRSTNAME": "วิชัย",
    "LASTNAME": "ศรีสวัสดิ์",
    "PHONE": "089-123-4567",
    "COMPANY": "บริษัท ปูนซิเมนต์ไทย จำกัด (มหาชน)"
  }
}
```

### 2. บริษัทไทย (ภาษาอังกฤษ)

```json
{
  "event": "click",
  "email": "purchase@cpall.co.th",
  "campaign_id": 10002,
  "campaign_name": "Retail Lubricant Q1-2026",
  "subject": "ENEOS Premium Lubricant for Retail",
  "contact": {
    "FIRSTNAME": "Somchai",
    "LASTNAME": "Jaidee",
    "PHONE": "081-987-6543",
    "COMPANY": "CP ALL Public Company Limited"
  }
}
```

### 3. โรงงานอุตสาหกรรม

```json
{
  "event": "click",
  "email": "factory@toyota.co.th",
  "campaign_id": 10003,
  "campaign_name": "Automotive Industrial Oil 2026",
  "subject": "น้ำมันเครื่องสำหรับสายการผลิต",
  "contact": {
    "FIRSTNAME": "Takeshi",
    "LASTNAME": "Yamamoto",
    "PHONE": "02-345-6789",
    "COMPANY": "Toyota Motor Thailand Co., Ltd."
  }
}
```

### 4. ธุรกิจขนส่ง

```json
{
  "event": "click",
  "email": "fleet@kerry.co.th",
  "campaign_id": 10004,
  "campaign_name": "Fleet Lubricant Solutions",
  "subject": "โซลูชันน้ำมันหล่อลื่นสำหรับกองรถ",
  "contact": {
    "FIRSTNAME": "สมศักดิ์",
    "LASTNAME": "รักขนส่ง",
    "PHONE": "086-555-1234",
    "COMPANY": "Kerry Express (Thailand) Limited"
  }
}
```

## Alternative Format (Flat)

Brevo อาจส่งแบบ flat (ไม่มี contact object):

```json
{
  "event": "click",
  "email": "test@company.com",
  "campaign_id": 10005,
  "campaign_name": "Test Campaign",
  "FIRSTNAME": "ชื่อ",
  "LASTNAME": "นามสกุล",
  "PHONE": "081-xxx-xxxx",
  "COMPANY": "บริษัท xxx"
}
```

## Expected Response

### Success

```json
{
  "success": true,
  "message": "Lead processed successfully",
  "data": {
    "rowNumber": 31,
    "email": "procurement@cpall.co.th",
    "company": "CP ALL Public Company Limited",
    "industry": "Retail"
  }
}
```

### Duplicate

```json
{
  "success": true,
  "message": "Duplicate lead - already processed"
}
```

### Invalid Payload

```json
{
  "success": false,
  "error": "Invalid payload",
  "details": "email: Invalid email format"
}
```

## Brevo Settings Checklist

ตรวจสอบใน Brevo Dashboard:

- [ ] Contacts → Settings → Contact Attributes มี:
  - FIRSTNAME
  - LASTNAME
  - PHONE
  - COMPANY
- [ ] Campaign → Settings → Webhook URL = `https://your-domain/webhook/brevo`
- [ ] Campaign → Settings → Events → Enable "Click" event
- [ ] List ที่ใช้มี Contact Attributes ครบ

## Test Commands

```bash
# Health check
curl http://localhost:3000/health

# Test webhook (complete payload)
curl -X POST http://localhost:3000/webhook/brevo \
  -H "Content-Type: application/json" \
  -d @docs/brevo-test-payload.json

# Check stats
curl http://localhost:3000/stats
```
