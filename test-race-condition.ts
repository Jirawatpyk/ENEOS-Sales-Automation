/**
 * Race Condition Test Script
 * ทดสอบ 3 สถานการณ์:
 * 1. User A รับเคส → สำเร็จ
 * 2. User B พยายามรับเคสเดียวกัน → ถูกปฏิเสธ
 * 3. User A อัพเดทสถานะ → สำเร็จ
 */

import { sheetsService } from './src/services/sheets.service.js';

const ROW_TO_TEST = 22; // Row ที่จะทดสอบ (ต้องยังไม่มีคนรับ)

const USER_A = {
  id: 'U_test_user_a_12345',
  name: 'ทดสอบ A (เซลล์คนแรก)',
};

const USER_B = {
  id: 'U_test_user_b_67890',
  name: 'ทดสอบ B (เซลล์คนที่สอง)',
};

async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 RACE CONDITION TEST');
  console.log('='.repeat(60));
  console.log(`\nทดสอบ Row: ${ROW_TO_TEST}\n`);

  // ดึงข้อมูล Lead ปัจจุบัน
  console.log('📋 ข้อมูล Lead ก่อนทดสอบ:');
  const leadBefore = await sheetsService.getRow(ROW_TO_TEST);
  if (!leadBefore) {
    console.error('❌ ไม่พบ Row', ROW_TO_TEST);
    return;
  }
  console.log(`   บริษัท: ${leadBefore.company}`);
  console.log(`   สถานะ: ${leadBefore.status}`);
  console.log(`   เจ้าของ: ${leadBefore.salesOwnerName || '(ว่าง)'}`);
  console.log('');

  // ============================================
  // Test 1: User A รับเคส
  // ============================================
  console.log('-'.repeat(60));
  console.log('🧪 TEST 1: User A รับเคส');
  console.log('-'.repeat(60));

  try {
    const result1 = await sheetsService.claimLead(
      ROW_TO_TEST,
      USER_A.id,
      USER_A.name,
      'contacted'
    );

    if (result1.success) {
      console.log('✅ ผลลัพธ์: รับเคสสำเร็จ');
      console.log(`   เจ้าของใหม่: ${result1.lead.salesOwnerName}`);
      console.log(`   สถานะใหม่: ${result1.lead.status}`);
    } else {
      console.log('❌ ผลลัพธ์: รับเคสไม่สำเร็จ');
      console.log(`   เหตุผล: มีคนรับไปแล้ว (${result1.owner})`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  console.log('');

  // ============================================
  // Test 2: User B พยายามรับเคสเดียวกัน
  // ============================================
  console.log('-'.repeat(60));
  console.log('🧪 TEST 2: User B พยายามรับเคสเดียวกัน (ต้องถูกปฏิเสธ)');
  console.log('-'.repeat(60));

  try {
    const result2 = await sheetsService.claimLead(
      ROW_TO_TEST,
      USER_B.id,
      USER_B.name,
      'contacted'
    );

    if (result2.success) {
      console.log('⚠️ ผลลัพธ์: รับเคสสำเร็จ (ไม่ควรเกิดขึ้น!)');
      console.log('   ❌ RACE CONDITION BUG DETECTED!');
    } else if (result2.alreadyClaimed) {
      console.log('✅ ผลลัพธ์: ถูกปฏิเสธ (ถูกต้อง!)');
      console.log(`   เจ้าของปัจจุบัน: ${result2.owner}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  console.log('');

  // ============================================
  // Test 3: User A อัพเดทสถานะเป็น closed
  // ============================================
  console.log('-'.repeat(60));
  console.log('🧪 TEST 3: User A อัพเดทสถานะเป็น closed');
  console.log('-'.repeat(60));

  try {
    const result3 = await sheetsService.claimLead(
      ROW_TO_TEST,
      USER_A.id,
      USER_A.name,
      'closed'
    );

    if (result3.success) {
      console.log('✅ ผลลัพธ์: อัพเดทสถานะสำเร็จ');
      console.log(`   สถานะใหม่: ${result3.lead.status}`);
      console.log(`   Closed At: ${result3.lead.closedAt}`);
    } else {
      console.log('❌ ผลลัพธ์: อัพเดทไม่สำเร็จ');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  console.log('');

  // ============================================
  // Test 4: User B พยายามอัพเดทสถานะ (ไม่ใช่เจ้าของ)
  // ============================================
  console.log('-'.repeat(60));
  console.log('🧪 TEST 4: User B พยายามอัพเดทสถานะ (ต้องถูกปฏิเสธ)');
  console.log('-'.repeat(60));

  try {
    const result4 = await sheetsService.claimLead(
      ROW_TO_TEST,
      USER_B.id,
      USER_B.name,
      'lost'
    );

    if (result4.success) {
      console.log('⚠️ ผลลัพธ์: อัพเดทสำเร็จ (ไม่ควรเกิดขึ้น!)');
      console.log('   ❌ RACE CONDITION BUG DETECTED!');
    } else if (result4.alreadyClaimed) {
      console.log('✅ ผลลัพธ์: ถูกปฏิเสธ (ถูกต้อง!)');
      console.log(`   เจ้าของปัจจุบัน: ${result4.owner}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  console.log('');

  // ============================================
  // Test 5: เปลี่ยนสถานะหลายครั้ง (ต้องเคลียร์ timestamp อื่น)
  // ============================================
  console.log('-'.repeat(60));
  console.log('🧪 TEST 5: เปลี่ยนเป็น unreachable (ต้องเคลียร์ closed)');
  console.log('-'.repeat(60));

  try {
    const result5 = await sheetsService.claimLead(
      ROW_TO_TEST,
      USER_A.id,
      USER_A.name,
      'unreachable'
    );

    if (result5.success) {
      console.log('✅ ผลลัพธ์: อัพเดทสถานะสำเร็จ');
      console.log(`   สถานะใหม่: ${result5.lead.status}`);
      console.log(`   Closed At: ${result5.lead.closedAt || '(ว่าง)'} ${result5.lead.closedAt ? '❌ ควรเคลียร์!' : '✅'}`);
      console.log(`   Lost At: ${result5.lead.lostAt || '(ว่าง)'} ${result5.lead.lostAt ? '❌ ควรเคลียร์!' : '✅'}`);
      console.log(`   Unreachable At: ${result5.lead.unreachableAt || '(ว่าง)'} ${result5.lead.unreachableAt ? '✅' : '❌ ควรมีค่า!'}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  console.log('');

  // ============================================
  // Test 6: เปลี่ยนเป็น lost (ต้องเคลียร์ unreachable)
  // ============================================
  console.log('-'.repeat(60));
  console.log('🧪 TEST 6: เปลี่ยนเป็น lost (ต้องเคลียร์ unreachable)');
  console.log('-'.repeat(60));

  try {
    const result6 = await sheetsService.claimLead(
      ROW_TO_TEST,
      USER_A.id,
      USER_A.name,
      'lost'
    );

    if (result6.success) {
      console.log('✅ ผลลัพธ์: อัพเดทสถานะสำเร็จ');
      console.log(`   สถานะใหม่: ${result6.lead.status}`);
      console.log(`   Closed At: ${result6.lead.closedAt || '(ว่าง)'} ${result6.lead.closedAt ? '❌ ควรเคลียร์!' : '✅'}`);
      console.log(`   Lost At: ${result6.lead.lostAt || '(ว่าง)'} ${result6.lead.lostAt ? '✅' : '❌ ควรมีค่า!'}`);
      console.log(`   Unreachable At: ${result6.lead.unreachableAt || '(ว่าง)'} ${result6.lead.unreachableAt ? '❌ ควรเคลียร์!' : '✅'}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  console.log('');

  // ============================================
  // Test 7: เช็ครูปแบบวันเวลา
  // ============================================
  console.log('-'.repeat(60));
  console.log('🧪 TEST 7: ตรวจสอบรูปแบบวันเวลา');
  console.log('-'.repeat(60));

  const leadCheck = await sheetsService.getRow(ROW_TO_TEST);
  if (leadCheck) {
    const datePattern = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/;

    console.log(`   Date: ${leadCheck.date}`);
    console.log(`   → รูปแบบถูกต้อง: ${datePattern.test(leadCheck.date) ? '✅' : '❌'}`);

    console.log(`   Clicked At: ${leadCheck.clickedAt}`);
    console.log(`   → รูปแบบถูกต้อง: ${datePattern.test(leadCheck.clickedAt) ? '✅' : '❌'}`);

    if (leadCheck.closedAt) {
      console.log(`   Closed At: ${leadCheck.closedAt}`);
      console.log(`   → รูปแบบถูกต้อง: ${datePattern.test(leadCheck.closedAt) ? '✅' : '❌'}`);
    }
  }
  console.log('');

  // ============================================
  // สรุปผล
  // ============================================
  console.log('='.repeat(60));
  console.log('📋 ข้อมูล Lead หลังทดสอบ:');
  const leadAfter = await sheetsService.getRow(ROW_TO_TEST);
  if (leadAfter) {
    console.log(`   บริษัท: ${leadAfter.company}`);
    console.log(`   สถานะ: ${leadAfter.status}`);
    console.log(`   เจ้าของ: ${leadAfter.salesOwnerName}`);
    console.log(`   Date: ${leadAfter.date}`);
    console.log(`   Clicked At: ${leadAfter.clickedAt}`);
    console.log(`   Closed At: ${leadAfter.closedAt || '-'}`);
  }
  console.log('='.repeat(60));
}

runTests()
  .then(() => {
    console.log('\n✅ ทดสอบเสร็จสิ้น');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ ทดสอบล้มเหลว:', error);
    process.exit(1);
  });
