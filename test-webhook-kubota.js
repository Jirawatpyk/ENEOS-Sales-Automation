/**
 * Test Brevo Webhook - สยามคูโบต้า คอร์ปอเรชั่น
 * ทดสอบว่า Gemini AI จะดึง grounding fields มาได้ไหม
 *
 * Usage: node test-webhook-kubota.js
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const payload = {
  event: 'click',
  email: 'contact@siamkubota.co.th',
  contact_id: 999001,
  campaign_id: 100,
  campaign_name: 'Test Campaign - Kubota',
  subject: 'ENEOS Lubricants for Industrial Equipment',
  link: 'https://eneos.co.th/products',
  ts_event: Math.floor(Date.now() / 1000),
  attributes: {
    FIRSTNAME: 'สมชาย',
    LASTNAME: 'ใจดี',
    COMPANY: 'บจก. สยามคูโบต้า คอร์ปอเรชั่น',
    PHONE: '02-123-4567',
    JOB_TITLE: 'Purchasing Manager',
    LEAD_SOURCE: 'Website',
    CITY: 'Bangkok',
    WEBSITE: 'https://www.siamkubota.co.th'
  }
};

console.log('🚀 Sending test webhook for: บจก. สยามคูโบต้า คอร์ปอเรชั่น');
console.log(`Backend: ${BACKEND_URL}/webhook/brevo\n`);

fetch(`${BACKEND_URL}/webhook/brevo`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Brevo-Signature': 'test-signature'
  },
  body: JSON.stringify(payload)
})
  .then(async (res) => {
    const data = await res.json();
    console.log('✅ Webhook sent!');
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('\n📋 Expected grounding fields from Gemini AI:');
    console.log('  ✓ juristicId: เลขทะเบียนนิติบุคคล 13 หลัก');
    console.log('  ✓ dbdSector: รหัส sector (e.g., "MFG-A", "F&B-M")');
    console.log('  ✓ province: จังหวัด (e.g., "กรุงเทพมหานคร")');
    console.log('  ✓ fullAddress: ที่อยู่เต็มของบริษัท');
    console.log('\n🔍 Next steps:');
    console.log('  1. Check backend console for Gemini AI response');
    console.log('  2. Open Google Sheets and check columns AE-AH');
    console.log('  3. Open Admin Dashboard and view Lead Detail');
    console.log('\n💡 Expected data for สยามคูโบต้า:');
    console.log('  - Industry: Manufacturing / Agriculture Equipment');
    console.log('  - DBD Sector: MFG-A (Manufacturing - Agriculture)');
    console.log('  - Province: Should contain "กรุงเทพมหานคร" or similar');
    console.log('  - Juristic ID: 13-digit number (if Gemini finds it)');
  })
  .catch((error) => {
    console.error('❌ Error sending webhook:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Make sure backend is running: npm run dev');
    console.log('  2. Check .env file has GEMINI_API_KEY');
    console.log('  3. Check ENABLE_AI_ENRICHMENT=true in .env');
    console.log('  4. Check backend logs for errors');
  });
