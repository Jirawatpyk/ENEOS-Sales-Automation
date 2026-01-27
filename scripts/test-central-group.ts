/**
 * Test Central Group specifically (previously failed)
 */

import { GeminiService } from '../src/services/gemini.service.js';

async function testCentralGroup(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Testing Central Group (Previously Failed)');
  console.log('='.repeat(80));

  const geminiService = new GeminiService();

  try {
    console.log('\n⏳ Analyzing Central Group...\n');

    const startTime = Date.now();
    const analysis = await geminiService.analyzeCompany('central.co.th', 'Central Group');
    const duration = Date.now() - startTime;

    console.log(`✅ Analysis completed in ${duration}ms\n`);
    console.log('📊 Results:');
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

    if (analysis.confidence >= 0.7) {
      console.log('\n🎉 SUCCESS - Issue fixed! Central Group now analyzes correctly.');
    } else {
      console.log('\n⚠️  WARNING - Still low confidence, but better than complete failure.');
    }

  } catch (error) {
    console.log('\n❌ ERROR:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n' + '='.repeat(80));
}

testCentralGroup().catch(console.error);
