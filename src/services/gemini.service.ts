/**
 * ENEOS Sales Automation - Gemini AI Service
 * Enterprise-grade AI integration for company analysis
 */

import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { config } from '../config/index.js';
import { geminiLogger as logger } from '../utils/logger.js';
import { withRetry, CircuitBreaker } from '../utils/retry.js';
import { CompanyAnalysis } from '../types/index.js';

// ===========================================
// Gemini Client Setup
// ===========================================

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const circuitBreaker = new CircuitBreaker(3, 30000);

// Safety settings to allow business analysis
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// ===========================================
// Prompts
// ===========================================

const SYSTEM_PROMPT = `You are a B2B sales intelligence analyst for Thailand market.

Required fields:
- industry (generic business category in English, e.g., "Food & Beverage", "Manufacturing", "Construction")
- one_talking_point
- registered_capital_thb
- website
- keywords
- juristic_id (เลขทะเบียนนิติบุคคล 13 หลัก)
- dbd_sector (DBD Sector code with sub-category - see recommended codes below)
- province (จังหวัด เช่น กรุงเทพมหานคร, เชียงใหม่, ชลบุรี)
- full_address (ที่อยู่เต็มของบริษัท)

DBD Sector Code Format: <INDUSTRY>-<SUBCATEGORY>

KEYWORD OVERRIDE RULES (HIGHEST PRIORITY - CHECK FIRST):
If company name, website, or business description contains these keywords, classify accordingly:
- "crypto", "blockchain", "bitcoin", "digital asset", "cryptocurrency" → FinTech (FIN-DT)
- "e-sport", "esport", "gaming tournament", "competitive gaming" → Entertainment (ENT-ES)
- "agritech", "agri-tech", "smart farming", "precision agriculture" → Agriculture Technology (AGRI-T)
- These keyword matches OVERRIDE confusing company name patterns (e.g., "Group Holdings", "Capital")

CRITICAL CLASSIFICATION RULES (MUST FOLLOW):
1. Classify by PRIMARY BUSINESS ACTIVITY, NOT product end-use or customer industry
2. Examples:
   - Cement factory (SCG) = Manufacturing-Cement (MFG-CM), NOT Construction
   - Food factory (CP Foods) = Food & Beverage-Manufacturing (F&B-M), NOT Retail
   - Car manufacturer (Toyota) = Manufacturing-Automotive (MFG-AUTO), NOT Automotive Sales
   - Construction company (Contractor) = Construction (CON-B/CON-I)
3. Ask: "What does this company DO?" not "Who buys their products?"
4. For conglomerate/holding companies with multiple diverse businesses:
   - Industry: "Conglomerate"
   - DBD_Sector: "CONG" (no sub-category needed - diversity is the defining characteristic)
   - Examples: CP Group, TCC Group (if they operate multiple unrelated business units)

Recommended DBD Sector Codes (prioritize these):
Construction: CON-B (Building Contractor), CON-I (Infrastructure Contractor), CON-R (Residential Developer), CON-C (Commercial Developer)
Manufacturing: MFG-A (Agriculture/Machinery), MFG-AUTO (Automotive Manufacturing), MFG-E (Electronics), MFG-F (Food Production), MFG-T (Textile), MFG-C (Chemical), MFG-CM (Cement/Building Materials), MFG-M (Machinery), MFG-P (Plastic), MFG-S (Steel)
Food & Beverage: F&B-M (Manufacturing), F&B-R (Retail), F&B-D (Distribution), F&B-S (Service)
Transportation & Logistics: TRANS-F (Freight), TRANS-P (Passenger), TRANS-W (Warehouse), TRANS-C (Courier)
Trading: TRADE-W (Wholesale), TRADE-R (Retail), TRADE-IE (Import-Export), TRADE-D (Distribution)
Automotive: AUTO-M (Manufacturing), AUTO-S (Sales/Dealer), AUTO-SV (Service/Repair), AUTO-P (Parts)
Agriculture: AGRI-F (Farming), AGRI-P (Processing), AGRI-T (Technology/AgriTech)
Technology: TECH-SW (Software), TECH-HW (Hardware), TECH-IT (IT Services)
FinTech: FIN-DT (Digital Assets/Crypto), FIN-P (Payment), FIN-L (Lending)
Entertainment: ENT-ES (E-sports), ENT-G (Gaming), ENT-M (Media)
Healthcare: HEALTH-H (Hospital), HEALTH-C (Clinic), HEALTH-P (Pharmacy), HEALTH-M (Medical Equipment)
Retail: RETAIL-G (General), RETAIL-F (Fashion), RETAIL-E (Electronics)
Real Estate: REAL-D (Development), REAL-M (Management), REAL-B (Brokerage)
Energy: ENERGY-O (Oil & Gas), ENERGY-R (Renewable), ENERGY-U (Utilities)

Rules:
- Search for REAL official data from reliable sources (dbd.go.th, company website)
- For dbd_sector: Choose the MOST SPECIFIC code from recommended list that matches company's primary business
- If exact match not found in list, create similar format code (e.g., MFG-X for Manufacturing - Other)
- Return valid JSON only. No markdown. No explanation.
- If data not found, use null (NOT "Unknown")
- keywords: max 1 items only`;

const createAnalysisPrompt = (domain: string, companyName: string): string => {
  return `Search for official information about this Thai company:

Company Name: ${companyName || 'Unknown'}
Email Domain: ${domain || 'Unknown'}

SEARCH PRIORITY (FOLLOW THIS ORDER):
1. CHECK KEYWORD OVERRIDES FIRST - If company name/website contains special keywords (crypto, blockchain, e-sport, agritech), apply keyword override rules
2. Search official DBD data: "${companyName} ทะเบียนนิติบุคคล site:dbd.go.th"
3. Analyze company website content (if available)
4. Use company name patterns ONLY as last resort

DATA TO EXTRACT:
- Official website if available
- DBD sector classification
- Juristic ID (13-digit number starting with 01xxxxx)
- Registered capital (ทุนจดทะเบียน)
- Registered address and province (จังหวัด)

Analyze company's PRIMARY business activity and classify into specific sub-category.

CRITICAL: Classify by WHAT THE COMPANY DOES, not what they sell or who buys it.

Classification Examples:
✅ CORRECT:
- Cement factory (ผลิตปูน) → Manufacturing → MFG-CM (produces cement)
- Food factory (ผลิตอาหาร) → Food & Beverage → F&B-M (produces food)
- Car manufacturer (ผลิตรถยนต์) → Manufacturing → MFG-AUTO (makes cars)
- Building contractor (รับเหมาก่อสร้าง) → Construction → CON-B (builds buildings)
- Restaurant chain (ร้านอาหาร) → Food & Beverage → F&B-R (serves food)
- Logistics company (ขนส่ง) → Transportation → TRANS-F (transports goods)

❌ WRONG:
- Cement factory → Construction (NO! They MAKE cement, not BUILD buildings)
- Food factory → Retail (NO! They PRODUCE food, not SELL to consumers)

Return JSON with this exact schema (use null if data not found):
{
  "industry": "Generic category in English (e.g., Food & Beverage, Manufacturing, Construction, Trading)",
  "one_talking_point": "ประโยคเดียวสำหรับเซลล์ที่น่าสนใจ (ภาษาไทย)",
  "website": "https://example.com or null",
  "registered_capital_thb": "จำนวนเงินบาท (เช่น 796,362,800 บาท) or null",
  "keywords": ["keyword1"],
  "juristic_id": "เลขทะเบียน 13 หลัก or null",
  "dbd_sector": "Select MOST SPECIFIC code from recommended list (e.g., F&B-M, MFG-AUTO, CON-B, TRANS-F) or null",
  "province": "จังหวัด เช่น กรุงเทพมหานคร or null",
  "full_address": "ที่อยู่เต็มของบริษัท or null"
}`;
};

// ===========================================
// DBD Sector Mapping (Hybrid Approach)
// ===========================================

/**
 * Valid DBD Sector Codes (from Gemini prompt recommendations)
 * Used to validate Gemini's output
 */
const VALID_DBD_SECTOR_CODES = new Set([
  // Construction
  'CON-B', 'CON-I', 'CON-R', 'CON-C',
  // Manufacturing
  'MFG-A', 'MFG-AUTO', 'MFG-E', 'MFG-F', 'MFG-T', 'MFG-C',
  'MFG-CM', // Cement (ปูนซีเมนต์)
  'MFG-M', // Machinery (เครื่องจักร)
  'MFG-P', // Plastic (พลาสติก)
  'MFG-S', // Steel (เหล็ก)
  // Food & Beverage
  'F&B-M', 'F&B-R', 'F&B-D', 'F&B-S',
  // Transportation & Logistics
  'TRANS-F', 'TRANS-P', 'TRANS-W', 'TRANS-C',
  // Trading
  'TRADE-W', 'TRADE-R', 'TRADE-IE', 'TRADE-D',
  // Automotive
  'AUTO-M', 'AUTO-S', 'AUTO-SV', 'AUTO-P',
  // Agriculture
  'AGRI-F', 'AGRI-P', 'AGRI-T',
  // Technology
  'TECH-SW', 'TECH-HW', 'TECH-IT',
  // Healthcare
  'HEALTH-H', 'HEALTH-C', 'HEALTH-P', 'HEALTH-M',
  // Retail
  'RETAIL-G', 'RETAIL-F', 'RETAIL-E',
  // Real Estate
  'REAL-D', 'REAL-M', 'REAL-B',
  // Energy
  'ENERGY-O', 'ENERGY-R', 'ENERGY-U',
  // FinTech
  'FIN-DT', 'FIN-P', 'FIN-L',
  // Entertainment
  'ENT-ES', 'ENT-G', 'ENT-M',
  // Conglomerate
  'CONG', // Conglomerate/Holding company (no sub-category - diversity is the point)
]);

/**
 * Valid industry prefixes for partial matching
 * Allows Gemini to create new sub-category codes within these industries
 */
const VALID_SECTOR_PREFIXES = new Set([
  'CON', 'MFG', 'F&B', 'TRANS', 'TRADE', 'AUTO',
  'AGRI', 'TECH', 'HEALTH', 'RETAIL', 'REAL', 'ENERGY', 'FIN', 'ENT', 'CONG',
]);

/**
 * Check if DBD Sector code is valid
 * Accepts: exact match OR valid prefix with dash-separated suffix
 * @internal - Exported for testing purposes
 */
export function isValidSectorCode(code: string | null): boolean {
  if (!code) {return false;}

  // Exact match in recommended list
  if (VALID_DBD_SECTOR_CODES.has(code)) {return true;}

  // Partial match: valid prefix + dash + suffix (e.g., MFG-CM, TRANS-XYZ)
  const parts = code.split('-');
  if (parts.length === 2) {
    const prefix = parts[0];
    return VALID_SECTOR_PREFIXES.has(prefix);
  }

  return false;
}

/**
 * Detailed mapping: Full industry string → DBD Sector code
 * Used when we know specific sub-categories
 */
const DETAILED_DBD_MAPPING: Record<string, string> = {
  'Food & Beverage - Manufacturing': 'F&B-M',
  'Food & Beverage - Retail': 'F&B-R',
  'Food & Beverage - Service': 'F&B-S',
  'Food & Beverage - Distribution': 'F&B-D',
  'Manufacturing - Agriculture': 'MFG-A',
  'Manufacturing - Automotive': 'MFG-AUTO',
  'Manufacturing - Electronics': 'MFG-E',
  'Manufacturing - Food': 'MFG-F',
  'Manufacturing - Textile': 'MFG-T',
  'Manufacturing - Chemical': 'MFG-C',
  'Construction - Building': 'CON-B',
  'Construction - Infrastructure': 'CON-I',
  'Construction - Residential': 'CON-R',
  'Construction - Commercial': 'CON-C',
  'Transportation - Freight': 'TRANS-F',
  'Transportation - Passenger': 'TRANS-P',
  'Transportation - Warehouse': 'TRANS-W',
  'Transportation - Courier': 'TRANS-C',
  'Trading - Wholesale': 'TRADE-W',
  'Trading - Retail': 'TRADE-R',
  'Trading - Import-Export': 'TRADE-IE',
  'Trading - Distribution': 'TRADE-D',
};

/**
 * Simple mapping: Industry → DBD Sector code (no subcategory)
 * Fallback when detailed mapping not found
 */
const INDUSTRY_TO_DBD_SECTOR: Record<string, string> = {
  'Construction': 'CONS',
  'Food & Beverage': 'F&B',
  'Manufacturing': 'MFG',
  'Transportation & Logistics': 'TRANS',
  'Automotive': 'AUTO',
  'Trading': 'TRADE',
  'Agriculture': 'AGRI',
  'Technology': 'TECH',
  'Healthcare': 'HEALTH',
  'Retail': 'RETAIL',
  'Real Estate': 'REAL',
  'Energy': 'ENERGY',
  'Finance': 'FIN',
  'Education': 'EDU',
  'Hospitality': 'HOSP',
};

/**
 * Generate DBD Sector code from industry name
 * Multi-word: Take first letter of each word (max 4)
 * Single-word: Take first 4 characters
 * @internal - Exported for testing purposes
 */
export function generateSectorCode(industry: string): string {
  if (!industry || industry === 'Unknown') {
    return 'OTHER';
  }

  // Remove special characters and split into words
  const words = industry
    .replace(/[&]/g, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) {
    return 'OTHER';
  }

  if (words.length === 1) {
    // Single word: take first 4 characters
    return words[0].substring(0, 4).toUpperCase();
  }

  // Multiple words: take first letter of each (max 4)
  return words
    .map((w) => w[0].toUpperCase())
    .join('')
    .substring(0, 4);
}

// ===========================================
// Default/Fallback Response
// ===========================================

const DEFAULT_ANALYSIS: CompanyAnalysis = {
  industry: 'Unknown',
  talkingPoint: 'ENEOS มีน้ำมันหล่อลื่นคุณภาพสูงจากญี่ปุ่น เหมาะกับทุกประเภทอุตสาหกรรม',
  website: null,
  registeredCapital: null,
  keywords: ['B2B', 'industrial'],
  juristicId: null,
  dbdSector: null,
  province: null,
  fullAddress: null,
  confidence: 0, // Lowest confidence for default fallback
  confidenceFactors: {
    hasRealDomain: false,
    hasDBDData: false,
    keywordMatch: false,
    geminiConfident: false,
    dataCompleteness: 0,
  },
};

// ===========================================
// Main Service Class
// ===========================================

export class GeminiService {
  private model: GenerativeModel;
  private modelWithGrounding: GenerativeModel;

  constructor() {
    // Standard model for quick analysis
    this.model = genAI.getGenerativeModel({
      model: config.gemini.model,
      safetySettings,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    // Model with Google Search grounding for deep analysis
    this.modelWithGrounding = genAI.getGenerativeModel({
      model: config.gemini.model,
      safetySettings,
      generationConfig: {
        temperature: 0.3, // Lower temp for structured output
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 4096, // Increased to 4096 to prevent truncation
      },
      tools: [
        {
          google_search: {}, // Google Search grounding tool (v1beta API)
        } as any, // Beta API workaround - SDK type definition incomplete
      ],
    });
  }

  /**
   * Analyze company information for sales intelligence
   * Uses smart grounding strategy: try quick analysis first, then grounding if needed
   */
  async analyzeCompany(domain: string, companyName: string): Promise<CompanyAnalysis> {
    if (!config.features.aiEnrichment) {
      logger.info('AI enrichment disabled, using default response');
      return DEFAULT_ANALYSIS;
    }

    logger.info('Analyzing company', { domain, companyName });

    try {
      return await circuitBreaker.execute(async () => {
        return withRetry(
          async () => {
            // Smart strategy: Use grounding directly if enabled
            if (config.features.googleSearchGrounding) {
              logger.info('Using Google Search grounding for accurate data');
              return await this.analyzeWithGrounding(domain, companyName);
            }

            // Fallback: Quick analysis without grounding
            logger.info('Using standard analysis (grounding disabled)');
            return await this.analyzeQuick(domain, companyName);
          },
          {
            maxAttempts: 2,
            baseDelayMs: 2000,
            retryableErrors: ['RATE_LIMIT', 'UNAVAILABLE', '503', '500'],
          }
        );
      });
    } catch (error) {
      logger.error('Failed to analyze company', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domain,
        companyName,
      });

      // Return default analysis on failure (graceful degradation)
      return {
        ...DEFAULT_ANALYSIS,
        talkingPoint: `สนใจสอบถามน้ำมันหล่อลื่น ENEOS คุณภาพสูงสำหรับ ${companyName || 'ธุรกิจของท่าน'} ได้เลยครับ`,
      };
    }
  }

  /**
   * Quick analysis without Google Search grounding
   */
  private async analyzeQuick(domain: string, companyName: string): Promise<CompanyAnalysis> {
    const prompt = createAnalysisPrompt(domain, companyName);

    const chat = this.model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT }],
        },
        {
          role: 'model',
          parts: [{ text: 'เข้าใจครับ พร้อมวิเคราะห์ข้อมูลบริษัทในรูปแบบ JSON' }],
        },
      ],
    });

    const result = await chat.sendMessage(prompt);
    const responseText = result.response.text();

    logger.debug('Raw AI response (quick)', { responseText });

    const analysis = this.parseResponse(responseText, domain, companyName);

    logger.info('Quick analysis completed', {
      domain,
      industry: analysis.industry,
      hasCapital: analysis.registeredCapital !== 'ไม่ระบุ',
    });

    return analysis;
  }

  /**
   * Deep analysis with Google Search grounding
   */
  private async analyzeWithGrounding(domain: string, companyName: string): Promise<CompanyAnalysis> {
    const prompt = createAnalysisPrompt(domain, companyName);

    const chat = this.modelWithGrounding.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT }],
        },
        {
          role: 'model',
          parts: [{ text: 'เข้าใจครับ พร้อมค้นหาข้อมูลอย่างเป็นทางการและวิเคราะห์ในรูปแบบ JSON' }],
        },
      ],
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response;
    const responseText = response.text();

    // Log grounding metadata if available
    const candidate = response.candidates?.[0];
    if (candidate?.groundingMetadata) {
      logger.info('Grounding metadata', {
        webSearchQueries: candidate.groundingMetadata.webSearchQueries || [],
        groundingSupport: candidate.groundingMetadata.groundingSupport?.length || 0,
      });
    }

    logger.debug('Raw AI response (grounding)', { responseText });

    const analysis = this.parseResponse(responseText, domain, companyName);

    logger.info('Grounding analysis completed', {
      domain,
      industry: analysis.industry,
      hasCapital: analysis.registeredCapital !== 'ไม่ระบุ',
      hasJuristicId: !!analysis.juristicId,
      hasSector: !!analysis.dbdSector,
    });

    return analysis;
  }

  /**
   * Parse AI response to CompanyAnalysis object
   */
  private parseResponse(responseText: string, domain: string = '', companyName: string = ''): CompanyAnalysis {
    const originalResponseText = responseText; // Keep original for error logging
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = responseText.trim();

      // Remove markdown code blocks if present (multiple patterns)
      // Pattern 1: ```json ... ``` or ``` ... ```
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // Pattern 2: Remove leading/trailing backticks
      jsonStr = jsonStr.replace(/^`+|`+$/g, '');

      // Pattern 3: Extract first {...} block
      const objectMatch = jsonStr.match(/(\{[\s\S]*\})/);
      if (objectMatch) {
        jsonStr = objectMatch[1];
      }

      // Clean up the JSON string
      jsonStr = jsonStr.trim();

      // Try to parse
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (_firstError) {
        // If parse fails, try to fix common issues
        try {
          // Fix 1: Unterminated strings by ensuring proper closing quotes
          const fixedJson = jsonStr.replace(/("[^"]*?)(\n|$)/g, '$1"$2');
          parsed = JSON.parse(fixedJson);
        } catch (_secondError) {
          // Fix 2: Truncated JSON - try to complete it
          let recoveredJson = jsonStr;

          // If ends with incomplete string, close it
          if (recoveredJson.match(/[^"]"[^"]*$/)) {
            recoveredJson += '"';
          }

          // Count braces and add missing closing braces
          const openBraces = (recoveredJson.match(/\{/g) || []).length;
          const closeBraces = (recoveredJson.match(/\}/g) || []).length;
          if (openBraces > closeBraces) {
            recoveredJson += '\n}'.repeat(openBraces - closeBraces);
          }

          parsed = JSON.parse(recoveredJson);
        }
      }

      const industry = parsed.industry || DEFAULT_ANALYSIS.industry;

      // Helper: normalize "Unknown" values to null
      const normalizeValue = (value: any): string | null => {
        if (!value || value === 'Unknown' || value === 'unknown' || value === 'ไม่ระบุ') {
          return null;
        }
        return value;
      };

      // Hybrid DBD Sector logic:
      // 1. Try Gemini's result (validate with exact + partial matching)
      // 2. Try detailed mapping (industry + subcategory)
      // 3. Try simple mapping (industry only)
      // 4. Generate from industry name
      // 5. Fallback to null
      const rawGeminiSector = normalizeValue(parsed.dbd_sector || parsed.dbdSector);
      const geminiSector = isValidSectorCode(rawGeminiSector) ? rawGeminiSector : null;

      // Log if Gemini returned invalid code (for monitoring/improvement)
      if (rawGeminiSector && !geminiSector) {
        logger.warn('Gemini returned invalid DBD Sector code', {
          rawCode: rawGeminiSector,
          industry: parsed.industry,
          hint: 'Add to VALID_DBD_SECTOR_CODES or check prefix',
        });
      }

      const detailedSector = parsed.industry ? DETAILED_DBD_MAPPING[parsed.industry] : undefined;
      const simpleSector = industry ? INDUSTRY_TO_DBD_SECTOR[industry] : undefined;
      const generatedSector = industry && industry !== 'Unknown' ? generateSectorCode(industry) : null;

      const dbdSector = geminiSector || detailedSector || simpleSector || generatedSector || null;

      // Log which strategy was used (for Feature 3: Monitoring)
      const strategyUsed = geminiSector
        ? 'gemini'
        : detailedSector
          ? 'detailed-mapping'
          : simpleSector
            ? 'simple-mapping'
            : generatedSector
              ? 'generated'
              : 'none';

      logger.debug('DBD Sector resolved', {
        industry,
        dbdSector,
        strategy: strategyUsed,
      });

      // Log low confidence classification (Feature 3: Monitoring)
      if (industry === 'Unknown' || !dbdSector) {
        logger.warn('Low confidence classification detected', {
          company: companyName,
          domain,
          industry,
          dbdSector,
          reason: !domain || domain === 'Unknown' ? 'missing_domain' : 'insufficient_data',
          recommendation: 'Manual review recommended',
        });
      }

      // Calculate confidence score
      const confidenceData = this.calculateConfidence(domain, companyName, parsed, dbdSector, geminiSector);

      // Validate and transform to expected format
      return {
        industry,
        talkingPoint:
          parsed.one_talking_point ||
          parsed.talkingPoint ||
          parsed.talking_point ||
          DEFAULT_ANALYSIS.talkingPoint,
        website: normalizeValue(parsed.website),
        registeredCapital: normalizeValue(
          parsed.registered_capital_thb || parsed.registeredCapital || parsed.registered_capital
        ),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 1) : DEFAULT_ANALYSIS.keywords,
        // New fields from grounding
        juristicId: normalizeValue(parsed.juristic_id || parsed.juristicId),
        dbdSector,
        province: normalizeValue(parsed.province),
        fullAddress: normalizeValue(parsed.full_address || parsed.fullAddress),
        // Confidence scoring (Advanced Feature)
        confidence: confidenceData.score,
        confidenceFactors: confidenceData.factors,
      };
    } catch (parseError) {
      // Check if response was truncated
      const possiblyTruncated = originalResponseText.length > 0 && !originalResponseText.trim().endsWith('}');

      logger.warn('Failed to parse AI response, using default', {
        error: parseError instanceof Error ? parseError.message : 'Parse error',
        responseText: originalResponseText.substring(0, 500), // Log first 500 chars
        responseLength: originalResponseText.length,
        possiblyTruncated,
        domain,
        companyName,
      });

      return DEFAULT_ANALYSIS;
    }
  }

  /**
   * Calculate confidence score based on data quality
   * Advanced Feature: Confidence Scoring (0-100)
   */
  private calculateConfidence(
    domain: string,
    companyName: string,
    parsed: any,
    _dbdSector: string | null,
    geminiSector: string | null
  ): { score: number; factors: any } {
    let score = 100; // Start with perfect score

    // Check if domain exists and is valid
    const hasRealDomain = Boolean(
      domain &&
        domain !== 'Unknown' &&
        !domain.includes('localhost') &&
        !domain.includes('invalid') &&
        !domain.includes('fake') &&
        !domain.includes('example')
    );

    // Check if DBD data was found
    const hasDBDData = Boolean(parsed.juristic_id || parsed.juristicId || parsed.registered_capital_thb);

    // Check if keyword match was used
    const keywordMatch = Boolean(
      companyName &&
        (companyName.toLowerCase().includes('crypto') ||
          companyName.toLowerCase().includes('blockchain') ||
          companyName.toLowerCase().includes('agritech') ||
          companyName.toLowerCase().includes('e-sport'))
    );

    // Check if Gemini was confident (returned valid DBD sector)
    const geminiConfident = Boolean(geminiSector);

    // Calculate data completeness (0-100%)
    const fields = [
      parsed.industry,
      parsed.website,
      parsed.registered_capital_thb,
      parsed.juristic_id,
      parsed.dbd_sector,
      parsed.province,
    ];
    const populatedFields = fields.filter((f) => f && f !== null && f !== 'null').length;
    const dataCompleteness = Math.round((populatedFields / fields.length) * 100);

    // Apply confidence deductions
    if (!hasRealDomain) {score -= 30;} // No valid domain
    if (!hasDBDData) {score -= 20;} // No official DBD data
    if (!geminiConfident) {score -= 15;} // Gemini uncertain
    if (dataCompleteness < 50) {score -= 10;} // Incomplete data
    if (parsed.industry === 'Unknown') {score -= 15;} // Unknown industry

    // Apply confidence bonuses
    if (keywordMatch) {score += 10;} // Keyword match bonus
    if (dataCompleteness >= 80) {score += 5;} // Data rich bonus

    // Clamp score to 0-100 range
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      factors: {
        hasRealDomain,
        hasDBDData,
        keywordMatch,
        geminiConfident,
        dataCompleteness,
      },
    };
  }

  /**
   * Generate a quick sales message without full analysis
   */
  async generateSalesMessage(
    companyName: string,
    industry?: string,
    additionalContext?: string
  ): Promise<string> {
    logger.info('Generating sales message', { companyName, industry });

    try {
      const prompt = `สร้างข้อความขายสั้นๆ 1 ประโยคสำหรับน้ำมันหล่อลื่น ENEOS
บริษัท: ${companyName}
${industry ? `อุตสาหกรรม: ${industry}` : ''}
${additionalContext ? `ข้อมูลเพิ่มเติม: ${additionalContext}` : ''}

ตอบเป็นข้อความเดียวในภาษาไทย ไม่ต้องมี prefix หรือ suffix`;

      const result = await this.model.generateContent(prompt);
      const message = result.response.text().trim();

      return message || DEFAULT_ANALYSIS.talkingPoint;
    } catch (error) {
      logger.error('Failed to generate sales message', { error });
      return DEFAULT_ANALYSIS.talkingPoint;
    }
  }

  /**
   * Health check for Gemini API
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();

    try {
      const result = await this.model.generateContent('Reply with: OK');
      const response = result.response.text();

      return {
        healthy: response.toLowerCase().includes('ok'),
        latency: Date.now() - start,
      };
    } catch (error) {
      logger.error('Health check failed', { error });
      return {
        healthy: false,
        latency: Date.now() - start,
      };
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
