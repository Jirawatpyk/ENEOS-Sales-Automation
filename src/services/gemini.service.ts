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

const SYSTEM_PROMPT = `You are a B2B sales assistant for ENEOS Thailand - a leading industrial lubricant company from Japan.

ENEOS Products:
- Industrial lubricants (น้ำมันหล่อลื่นอุตสาหกรรม)
- Hydraulic oils, gear oils, cutting oils
- Automotive lubricants, engine oils
- Specialty greases and metalworking fluids

Target Industries:
- Automotive (ยานยนต์)
- Manufacturing (โรงงานผลิต)
- Logistics (โลจิสติกส์/ขนส่ง)
- Construction (ก่อสร้าง)
- Agriculture (เกษตรกรรม)
- Energy (พลังงาน)
- Food Processing (อาหาร)
- Other

Required fields:
- industry (choose from Target Industries above)
- company_type (e.g., ผู้ผลิต, ผู้จัดจำหน่าย, ผู้ให้บริการ)
- one_talking_point (MUST relate to ENEOS lubricant products for their industry)
- registered_capital_thb
- website
- keywords

Rules:
- Return valid JSON only.
- No markdown. No explanation.
- If uncertain, use "unknown".
- keywords: max 1 item only
- one_talking_point: Write in Thai, must mention how ENEOS products can help their business`;

const createAnalysisPrompt = (domain: string, companyName: string, jobTitle?: string): string => {
  return `Analyze this B2B lead for ENEOS Thailand sales team:

company_name: ${companyName || 'Unknown'}
email_domain: ${domain || 'Unknown'}
${jobTitle ? `contact_job_title: ${jobTitle}` : ''}

Research and return JSON with this schema:
{
  "industry": "Choose from: Automotive, Manufacturing, Logistics, Construction, Agriculture, Energy, Food Processing, Other",
  "company_type": "e.g., ผู้ผลิต, ผู้จัดจำหน่าย, ผู้ให้บริการ, โรงงาน",
  "one_talking_point": "Format: [ข้อมูลบริษัทสั้นๆ] → [สินค้า ENEOS ที่แนะนำ] เช่น 'ผลิตชิ้นส่วนยานยนต์ → แนะนำ Cutting Oil ENEOS สำหรับเครื่อง CNC'",
  "website": "Company website URL if found, otherwise null",
  "registered_capital_thb": "Amount in Thai Baht (e.g. 5,000,000 บาท). If not found, return 'ไม่ระบุ'",
  "keywords": ["One relevant keyword"]
}`;
};

// ===========================================
// Default/Fallback Response
// ===========================================

const DEFAULT_ANALYSIS: CompanyAnalysis = {
  industry: 'ไม่ระบุ',
  companyType: 'ไม่ระบุ',
  talkingPoint: 'ENEOS มีน้ำมันหล่อลื่นคุณภาพสูงจากญี่ปุ่น เหมาะกับทุกประเภทอุตสาหกรรม',
  website: null,
  registeredCapital: null,
  keywords: ['B2B', 'industrial'],
};

// ===========================================
// Main Service Class
// ===========================================

export class GeminiService {
  private model: GenerativeModel;

  constructor() {
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
  }

  /**
   * Analyze company information for sales intelligence
   */
  async analyzeCompany(domain: string, companyName: string, jobTitle?: string): Promise<CompanyAnalysis> {
    if (!config.features.aiEnrichment) {
      logger.info('AI enrichment disabled, using default response');
      return DEFAULT_ANALYSIS;
    }

    logger.info('Analyzing company', { domain, companyName, jobTitle });

    try {
      return await circuitBreaker.execute(async () => {
        return withRetry(
          async () => {
            const prompt = createAnalysisPrompt(domain, companyName, jobTitle);

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

            logger.debug('Raw AI response', { responseText });

            // Parse JSON from response
            const analysis = this.parseResponse(responseText);

            logger.info('Company analysis completed', {
              domain,
              industry: analysis.industry,
            });

            return analysis;
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
   * Parse AI response to CompanyAnalysis object
   */
  private parseResponse(responseText: string): CompanyAnalysis {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = responseText;

      // Remove markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      // Clean up the JSON string
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);

      // Validate and transform to expected format
      return {
        industry: parsed.industry || DEFAULT_ANALYSIS.industry,
        companyType: parsed.company_type || parsed.companyType || DEFAULT_ANALYSIS.companyType,
        talkingPoint:
          parsed.one_talking_point ||
          parsed.talkingPoint ||
          parsed.talking_point ||
          DEFAULT_ANALYSIS.talkingPoint,
        website: parsed.website || null,
        registeredCapital:
          parsed.registered_capital_thb || parsed.registeredCapital || parsed.registered_capital || null,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 1) : DEFAULT_ANALYSIS.keywords,
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
