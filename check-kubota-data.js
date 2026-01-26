/**
 * Check Kubota Lead Data - Row 73
 * ตรวจสอบว่า grounding fields มีข้อมูลไหม
 */

import { sheetsService } from './src/services/sheets.service.js';

async function checkKubotaLead() {
  console.log('🔍 Checking lead row 73 (สยามคูโบต้า)...\n');

  try {
    const lead = await sheetsService.getRow(73);

    if (!lead) {
      console.log('❌ Lead not found at row 73');
      return;
    }

    console.log('✅ Lead found!');
    console.log('==========================================');
    console.log('📋 Basic Info:');
    console.log(`  Company: ${lead.company}`);
    console.log(`  Email: ${lead.email}`);
    console.log(`  Industry: ${lead.industryAI}`);
    console.log(`  Capital: ${lead.capital || '(null)'}`);
    console.log('');
    console.log('🌐 Google Search Grounding Fields:');
    console.log('==========================================');
    console.log(`  Juristic ID: ${lead.juristicId || '(null)'}`);
    console.log(`  DBD Sector: ${lead.dbdSector || '(null)'}`);
    console.log(`  Province: ${lead.province || '(null)'}`);
    console.log(`  Full Address: ${lead.fullAddress || '(null)'}`);
    console.log('');

    // Check if grounding fields are populated
    const hasGrounding = !!(lead.juristicId || lead.dbdSector || lead.province || lead.fullAddress);

    if (hasGrounding) {
      console.log('✅ SUCCESS: Grounding fields are populated!');

      if (lead.juristicId) console.log('   ✓ Juristic ID found');
      if (lead.dbdSector) console.log('   ✓ DBD Sector found');
      if (lead.province) console.log('   ✓ Province found');
      if (lead.fullAddress) console.log('   ✓ Full Address found');
    } else {
      console.log('⚠️  WARNING: No grounding fields populated');
      console.log('   Possible reasons:');
      console.log('   1. Gemini AI could not find DBD data');
      console.log('   2. Google Search Grounding is disabled');
      console.log('   3. Search failed to find official data');
    }

    console.log('');
    console.log('🔗 View in Admin Dashboard:');
    console.log(`   http://localhost:3001/leads (click row 73)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkKubotaLead();
