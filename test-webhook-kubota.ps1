# Test Brevo Webhook - สยามคูโบต้า คอร์ปอเรชั่น
# ใช้สำหรับ test grounding fields (PowerShell version)

# Backend URL (เปลี่ยนตาม environment)
$BackendUrl = "http://localhost:3000"

Write-Host "🚀 Sending test webhook for: บจก. สยามคูโบต้า คอร์ปอเรชั่น" -ForegroundColor Cyan
Write-Host "Backend: $BackendUrl/webhook/brevo" -ForegroundColor Gray
Write-Host ""

$payload = @{
    event = "click"
    email = "contact@siamkubota.co.th"
    contact_id = 999001
    campaign_id = 100
    campaign_name = "Test Campaign - Kubota"
    subject = "ENEOS Lubricants for Industrial Equipment"
    link = "https://eneos.co.th/products"
    ts_event = 1737875400
    attributes = @{
        FIRSTNAME = "สมชาย"
        LASTNAME = "ใจดี"
        COMPANY = "บจก. สยามคูโบต้า คอร์ปอเรชั่น"
        PHONE = "02-123-4567"
        JOB_TITLE = "Purchasing Manager"
        LEAD_SOURCE = "Website"
        CITY = "Bangkok"
        WEBSITE = "https://www.siamkubota.co.th"
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$BackendUrl/webhook/brevo" `
        -Method Post `
        -ContentType "application/json" `
        -Body $payload `
        -Headers @{
            "X-Brevo-Signature" = "test-signature"
        }

    Write-Host "✅ Webhook sent successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10 | Write-Host

    Write-Host ""
    Write-Host "Expected grounding fields to be populated by Gemini AI:" -ForegroundColor Cyan
    Write-Host "  ✓ juristicId: เลขทะเบียนนิติบุคคล (ถ้า Gemini หาเจอ)" -ForegroundColor Gray
    Write-Host "  ✓ dbdSector: รหัส sector (ถ้า Gemini หาเจอ)" -ForegroundColor Gray
    Write-Host "  ✓ province: จังหวัด (ถ้า Gemini หาเจอ)" -ForegroundColor Gray
    Write-Host "  ✓ fullAddress: ที่อยู่เต็ม (ถ้า Gemini หาเจอ)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📋 ตรวจสอบ:" -ForegroundColor Yellow
    Write-Host "  1. Backend console - ดู Gemini AI response" -ForegroundColor Gray
    Write-Host "  2. Google Sheets - columns AE-AH (row ที่เพิ่งสร้าง)" -ForegroundColor Gray
    Write-Host "  3. Admin Dashboard - Lead Detail Sheet" -ForegroundColor Gray

} catch {
    Write-Host "❌ Error sending webhook:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. ตรวจสอบ backend running ที่ port 3000" -ForegroundColor Gray
    Write-Host "  2. ตรวจสอบ GEMINI_API_KEY ใน .env" -ForegroundColor Gray
    Write-Host "  3. ตรวจสอบ ENABLE_AI_ENRICHMENT=true ใน .env" -ForegroundColor Gray
}
