import { GeminiService } from '../src/services/gemini.service.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function validateConfidenceScoring() {
  console.log('\n=== Confidence Scoring Validation ===\n');

  const service = new GeminiService();

  // Test Scenario 1: High Confidence (Real company with data)
  console.log('🟢 Test 1: HIGH CONFIDENCE (Real company - SCG)');
  const high = await service.analyzeCompany('www.scg.com', 'บริษัท ปูนซีเมนต์ไทย จำกัด (มหาชน)');
  console.log(`  Industry: ${high.industry}`);
  console.log(`  DBD Sector: ${high.dbdSector || 'N/A'}`);
  console.log(`  Confidence: ${high.confidence}%`);
  console.log(`  Factors:`, high.confidenceFactors);
  console.log('');

  // Test Scenario 2: Medium Confidence (Real domain, keyword match)
  console.log('🟡 Test 2: MEDIUM CONFIDENCE (Keyword match - Bitkub)');
  const medium = await service.analyzeCompany('www.bitkub.com', 'บริษัท บิทคับ แคปปิตอล กรุ๊ป โฮลดิ้งส์ จำกัด');
  console.log(`  Industry: ${medium.industry}`);
  console.log(`  DBD Sector: ${medium.dbdSector || 'N/A'}`);
  console.log(`  Confidence: ${medium.confidence}%`);
  console.log(`  Factors:`, medium.confidenceFactors);
  console.log('');

  // Test Scenario 3: Low Confidence (Invalid domain)
  console.log('🔴 Test 3: LOW CONFIDENCE (Fake domain)');
  const low = await service.analyzeCompany('www.invalid-fake-xyz.com', 'บริษัท ไม่มีข้อมูล จำกัด');
  console.log(`  Industry: ${low.industry}`);
  console.log(`  DBD Sector: ${low.dbdSector || 'N/A'}`);
  console.log(`  Confidence: ${low.confidence}%`);
  console.log(`  Factors:`, low.confidenceFactors);
  console.log('');

  // Test Scenario 4: Zero Confidence (Fallback)
  console.log('⚫ Test 4: ZERO CONFIDENCE (No domain)');
  const zero = await service.analyzeCompany('', '');
  console.log(`  Industry: ${zero.industry}`);
  console.log(`  DBD Sector: ${zero.dbdSector || 'N/A'}`);
  console.log(`  Confidence: ${zero.confidence}%`);
  console.log(`  Factors:`, zero.confidenceFactors);
  console.log('');

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`High Confidence: ${high.confidence}% (Expected: 70-100%)`);
  console.log(`Medium Confidence: ${medium.confidence}% (Expected: 40-70%)`);
  console.log(`Low Confidence: ${low.confidence}% (Expected: 10-40%)`);
  console.log(`Zero Confidence: ${zero.confidence}% (Expected: 0%)`);
  console.log('');

  // Validation
  const allValid =
    high.confidence !== undefined &&
    medium.confidence !== undefined &&
    low.confidence !== undefined &&
    zero.confidence === 0 &&
    high.confidence > medium.confidence &&
    medium.confidence > low.confidence;

  if (allValid) {
    console.log('✅ VALIDATION PASSED - Confidence scoring working correctly!');
  } else {
    console.log('❌ VALIDATION FAILED - Check confidence calculations');
  }
}

validateConfidenceScoring().catch(console.error);
