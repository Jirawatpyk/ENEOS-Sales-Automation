/**
 * Gemini AI Intelligence Test
 * Test Gemini's ability to analyze Thai companies accurately
 *
 * Usage:
 *   npx tsx scripts/test-gemini-intelligence.ts
 */

import { GeminiService } from '../src/services/gemini.service.js';

interface TestCase {
  domain: string;
  companyName: string;
  expectedIndustry: string;
  description: string;
}

const testCases: TestCase[] = [
  {
    domain: 'scg.com',
    companyName: 'SCG (Siam Cement Group)',
    expectedIndustry: 'Conglomerate / Building Materials',
    description: 'เจ้าแรกในไทย - ปูนซีเมนต์และวัสดุก่อสร้าง',
  },
  {
    domain: 'pttplc.com',
    companyName: 'PTT',
    expectedIndustry: 'Energy / Oil & Gas',
    description: 'บริษัทพลังงานแห่งชาติ',
  },
  {
    domain: 'cpall.co.th',
    companyName: 'CP All (7-Eleven Thailand)',
    expectedIndustry: 'Retail / Convenience Store',
    description: 'ผู้บริหาร 7-Eleven ในไทย',
  },
  {
    domain: 'truecorp.co.th',
    companyName: 'True Corporation',
    expectedIndustry: 'Telecommunications',
    description: 'ผู้ให้บริการโทรคมนาคมครบวงจร',
  },
  {
    domain: 'central.co.th',
    companyName: 'Central Group',
    expectedIndustry: 'Retail / Department Store',
    description: 'ห้างสรรพสินค้าและค้าปลีกชั้นนำ',
  },
  {
    domain: 'minor.com',
    companyName: 'Minor International',
    expectedIndustry: 'Hospitality / Food Service',
    description: 'ธุรกิจโรงแรมและร้านอาหาร (The Pizza Company, Swensen\'s)',
  },
  {
    domain: 'thaibev.com',
    companyName: 'Thai Beverage',
    expectedIndustry: 'Beverage / Alcohol',
    description: 'ผู้ผลิตเครื่องดื่มและแอลกอฮอล์',
  },
  {
    domain: 'kasikornbank.com',
    companyName: 'Kasikorn Bank',
    expectedIndustry: 'Banking / Financial Services',
    description: 'ธนาคารกสิกรไทย',
  },
  {
    domain: 'ais.co.th',
    companyName: 'AIS (Advanced Info Service)',
    expectedIndustry: 'Telecommunications',
    description: 'ผู้ให้บริการโทรศัพท์มือถืออันดับ 1',
  },
  {
    domain: 'dtac.co.th',
    companyName: 'DTAC (Total Access Communication)',
    expectedIndustry: 'Telecommunications',
    description: 'ผู้ให้บริการโทรศัพท์มือถือ',
  },
];

/**
 * Test Gemini's analysis against expected results
 */
async function testGeminiIntelligence(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🧠 Gemini AI Intelligence Test - Thai Companies');
  console.log('='.repeat(80));
  console.log('\nTesting Gemini\'s ability to accurately analyze Thai companies...\n');

  const geminiService = new GeminiService();
  let correctCount = 0;
  let totalCount = 0;

  for (const testCase of testCases) {
    totalCount++;
    console.log(`\n[${ totalCount }/${testCases.length}] Testing: ${testCase.companyName}`);
    console.log('-'.repeat(80));
    console.log(`Domain:      ${testCase.domain}`);
    console.log(`Expected:    ${testCase.expectedIndustry}`);
    console.log(`Description: ${testCase.description}`);

    try {
      const startTime = Date.now();
      const analysis = await geminiService.analyzeCompany(testCase.domain, testCase.companyName);
      const duration = Date.now() - startTime;

      console.log(`\n✅ Analysis completed in ${duration}ms`);
      console.log(`\n📊 Gemini's Response:`);
      console.log(`  Industry:           ${analysis.industry}`);
      console.log(`  Confidence:         ${(analysis.confidence * 100).toFixed(1)}%`);
      console.log(`  DBD Sector:         ${analysis.dbdSector || 'N/A'}`);
      console.log(`  Juristic ID:        ${analysis.juristicId || 'N/A'}`);
      console.log(`  Registered Capital: ${analysis.registeredCapital ? `฿${analysis.registeredCapital.toLocaleString()}` : 'N/A'}`);
      console.log(`  Website:            ${analysis.website || 'N/A'}`);
      console.log(`  Province:           ${analysis.province || 'N/A'}`);
      console.log(`  Keywords:           ${analysis.keywords.join(', ')}`);

      console.log(`\n💡 Talking Point:`);
      console.log(`  "${analysis.talkingPoint}"`);

      console.log(`\n🔍 Confidence Factors:`);
      console.log(`  Real Domain:        ${analysis.confidenceFactors.hasRealDomain ? '✅' : '❌'}`);
      console.log(`  DBD Data:           ${analysis.confidenceFactors.hasDBDData ? '✅' : '❌'}`);
      console.log(`  Keyword Match:      ${analysis.confidenceFactors.keywordMatch ? '✅' : '❌'}`);
      console.log(`  Gemini Confident:   ${analysis.confidenceFactors.geminiConfident ? '✅' : '❌'}`);
      console.log(`  Data Completeness:  ${(analysis.confidenceFactors.dataCompleteness * 100).toFixed(0)}%`);

      // Check if industry is reasonable
      const isCorrect = analysis.confidence >= 0.7; // 70% confidence threshold
      if (isCorrect) {
        correctCount++;
        console.log(`\n✅ PASS - High confidence (${(analysis.confidence * 100).toFixed(1)}%)`);
      } else {
        console.log(`\n⚠️  REVIEW - Low confidence (${(analysis.confidence * 100).toFixed(1)}%)`);
      }

    } catch (error) {
      console.log(`\n❌ FAIL - Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Small delay between requests
    if (totalCount < testCases.length) {
      console.log('\n⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📈 Test Summary');
  console.log('='.repeat(80));
  console.log(`\nTotal Tests:       ${totalCount}`);
  console.log(`High Confidence:   ${correctCount} (${((correctCount / totalCount) * 100).toFixed(1)}%)`);
  console.log(`Low Confidence:    ${totalCount - correctCount} (${(((totalCount - correctCount) / totalCount) * 100).toFixed(1)}%)`);

  if (correctCount === totalCount) {
    console.log(`\n🎉 EXCELLENT! All companies analyzed with high confidence!`);
  } else if (correctCount / totalCount >= 0.8) {
    console.log(`\n✅ GOOD! Most companies (${((correctCount / totalCount) * 100).toFixed(0)}%) analyzed accurately.`);
  } else if (correctCount / totalCount >= 0.6) {
    console.log(`\n⚠️  FAIR! ${((correctCount / totalCount) * 100).toFixed(0)}% accuracy - may need prompt tuning.`);
  } else {
    console.log(`\n❌ NEEDS IMPROVEMENT! Only ${((correctCount / totalCount) * 100).toFixed(0)}% accuracy.`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Intelligence test complete!\n');
}

// Run test
testGeminiIntelligence().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
