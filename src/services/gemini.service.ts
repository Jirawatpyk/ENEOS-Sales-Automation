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
- dbd_sector (DBD Sector code เช่น F&B-M, MFG-A)
- province (จังหวัด เช่น กรุงเทพมหานคร, เชียงใหม่, ชลบุรี)
- full_address (ที่อยู่เต็มของบริษัท)

Rules:
- Search for REAL official data from reliable sources (dbd.go.th, company website)
- Return valid JSON only. No markdown. No explanation.
- If data found from official sources, use it. Otherwise use "Unknown".
- keywords: max 1 items only`;

const createAnalysisPrompt = (domain: string, companyName: string): string => {
  return `Search for official information about this Thai company:

Company Name: ${companyName || 'Unknown'}
Email Domain: ${domain || 'Unknown'}

SEARCH INSTRUCTIONS:
1. Search Google for: "${companyName} ทะเบียนนิติบุคคล site:dbd.go.th" OR "${companyName} registered capital"
2. Find official website if available
3. Look for DBD sector classification
4. Extract juristic ID (13-digit number starting with 01xxxxx)
5. Find registered address and province (จังหวัด)

Return JSON with this exact schema (use "Unknown" or null if data not found):
{
  "industry": "Generic category in English (e.g., Food & Beverage, Manufacturing, Construction, Trading)",
  "one_talking_point": "ประโยคเดียวสำหรับเซลล์ที่น่าสนใจ (ภาษาไทย)",
  "website": "https://example.com or null",
  "registered_capital_thb": "จำนวนเงินบาท (เช่น 796,362,800 บาท) หรือ 'ไม่ระบุ'",
  "keywords": ["keyword1"],
  "juristic_id": "เลขทะเบียน 13 หลัก or null",
  "dbd_sector": "รหัส sector เช่น F&B-M or null",
  "province": "จังหวัด เช่น กรุงเทพมหานคร or null",
  "full_address": "ที่อยู่เต็มของบริษัท or null"
}`;
};

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
        maxOutputTokens: 2048, // Increased for complete JSON response
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

    const analysis = this.parseResponse(responseText);

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

    const analysis = this.parseResponse(responseText);

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
  private parseResponse(responseText: string): CompanyAnalysis {
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

      const parsed = JSON.parse(jsonStr);

      // Validate and transform to expected format
      return {
        industry: parsed.industry || DEFAULT_ANALYSIS.industry,
        talkingPoint:
          parsed.one_talking_point ||
          parsed.talkingPoint ||
          parsed.talking_point ||
          DEFAULT_ANALYSIS.talkingPoint,
        website: parsed.website || null,
        registeredCapital:
          parsed.registered_capital_thb || parsed.registeredCapital || parsed.registered_capital || null,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 1) : DEFAULT_ANALYSIS.keywords,
        // New fields from grounding
        juristicId: parsed.juristic_id || parsed.juristicId || null,
        dbdSector: parsed.dbd_sector || parsed.dbdSector || null,
        province: parsed.province || null,
        fullAddress: parsed.full_address || parsed.fullAddress || null,
      };
    } catch (parseError) {
      logger.warn('Failed to parse AI response, using default', {
        error: parseError instanceof Error ? parseError.message : 'Parse error',
      });
      return DEFAULT_ANALYSIS;
    }
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
