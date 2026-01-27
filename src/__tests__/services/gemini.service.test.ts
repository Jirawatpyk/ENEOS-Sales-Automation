/**
 * Gemini AI Service Tests
 * Tests for AI company analysis operations
 * Note: Due to module-level instance creation, these tests focus on
 * error handling and default values which don't require complex mock chains
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock config
vi.mock('../../config/index.js', () => ({
  config: {
    gemini: {
      apiKey: 'test-api-key',
      model: 'gemini-1.5-flash',
    },
    features: {
      aiEnrichment: true,
    },
  },
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  geminiLogger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Use vi.hoisted to define mocks before vi.mock hoisting
const { mockChatResponse, mockChat, mockModel, mockCircuitBreaker, mockWithRetry } = vi.hoisted(() => {
  const mockChatResponse = {
    response: {
      text: vi.fn(),
    },
  };

  const mockChat = {
    sendMessage: vi.fn().mockResolvedValue(mockChatResponse),
  };

  const mockModel = {
    startChat: vi.fn().mockReturnValue(mockChat),
    generateContent: vi.fn(),
  };

  const mockCircuitBreaker = {
    execute: vi.fn((fn: () => Promise<unknown>) => fn()),
  };

  const mockWithRetry = vi.fn((fn: () => Promise<unknown>) => fn());

  return { mockChatResponse, mockChat, mockModel, mockCircuitBreaker, mockWithRetry };
});

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue(mockModel),
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  },
  HarmBlockThreshold: {
    BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
  },
}));

// Mock retry utility with proper execution
vi.mock('../../utils/retry.js', () => ({
  withRetry: mockWithRetry,
  CircuitBreaker: vi.fn().mockImplementation(() => mockCircuitBreaker),
}));

// Import after mocks
import { GeminiService } from '../../services/gemini.service.js';

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GeminiService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================
  // analyzeCompany - Focus on error handling
  // ===========================================

  describe('analyzeCompany', () => {
    it('should return default analysis on parse error', async () => {
      // When the response can't be parsed, defaults should be returned
      mockChatResponse.response.text.mockReturnValue('Invalid JSON response');

      const result = await service.analyzeCompany('example.com', 'Example Corp');

      expect(result.industry).toBe('Unknown');
      expect(result.talkingPoint).toBeDefined();
    });

    it('should return graceful fallback on API error', async () => {
      mockChat.sendMessage.mockRejectedValue(new Error('API Error'));

      const result = await service.analyzeCompany('example.com', 'Test Company');

      // Should return fallback with company name in talking point
      expect(result.industry).toBe('Unknown');
      expect(result.talkingPoint).toContain('Test Company');
    });

    it('should return CompanyAnalysis type', async () => {
      const result = await service.analyzeCompany('test.com', 'Test Corp');

      // Verify the result has all required fields
      expect(result).toHaveProperty('industry');
      expect(result).toHaveProperty('talkingPoint');
      expect(result).toHaveProperty('website');
      expect(result).toHaveProperty('registeredCapital');
      expect(result).toHaveProperty('keywords');
    });

    it('should handle empty company name', async () => {
      const result = await service.analyzeCompany('test.com', '');

      // Should still return a valid response
      expect(result).toBeDefined();
      expect(result.industry).toBeDefined();
    });

    it('should handle empty domain', async () => {
      const result = await service.analyzeCompany('', 'Test Corp');

      // Should still return a valid response
      expect(result).toBeDefined();
      expect(result.industry).toBeDefined();
    });
  });

  // ===========================================
  // Test Group 4: API Failure Scenarios
  // ===========================================

  describe('Test Group 4: API Failure Scenarios', () => {
    describe('4.1 Network Timeout', () => {
      it('should fallback to defaults on timeout error', async () => {
        const timeoutError = new Error('Request timeout');
        timeoutError.name = 'ETIMEDOUT';
        mockChat.sendMessage.mockRejectedValue(timeoutError);

        const result = await service.analyzeCompany('timeout.com', 'Timeout Test Co');

        expect(result.industry).toBe('Unknown');
        expect(result.talkingPoint).toContain('Timeout Test Co');
      });

      it('should fallback on connection timeout', async () => {
        const connError = new Error('ECONNREFUSED');
        mockChat.sendMessage.mockRejectedValue(connError);

        const result = await service.analyzeCompany('offline.com', 'Offline Test');

        expect(result.industry).toBe('Unknown');
        expect(result.talkingPoint).toBeDefined();
      });
    });

    describe('4.2 Rate Limit Exceeded', () => {
      it('should fallback on 429 rate limit error', async () => {
        const rateLimitError: any = new Error('429 Too Many Requests');
        rateLimitError.status = 429;
        rateLimitError.code = 'RATE_LIMIT';
        mockChat.sendMessage.mockRejectedValue(rateLimitError);

        const result = await service.analyzeCompany('rate-limit.com', 'Rate Test');

        expect(result.industry).toBe('Unknown');
        expect(result.talkingPoint).toContain('Rate Test');
      });

      it('should fallback on quota exceeded', async () => {
        const quotaError: any = new Error('Quota exceeded');
        quotaError.code = 'QUOTA_EXCEEDED';
        mockChat.sendMessage.mockRejectedValue(quotaError);

        const result = await service.analyzeCompany('quota.com', 'Quota Test');

        expect(result.industry).toBe('Unknown');
      });
    });

    describe('4.3 Invalid API Key', () => {
      it('should fallback on 401 authentication error', async () => {
        const authError: any = new Error('Invalid API key');
        authError.status = 401;
        authError.code = 'UNAUTHENTICATED';
        mockChat.sendMessage.mockRejectedValue(authError);

        const result = await service.analyzeCompany('auth-fail.com', 'Auth Test');

        expect(result.industry).toBe('Unknown');
        expect(result.talkingPoint).toContain('Auth Test');
      });

      it('should fallback on 403 forbidden error', async () => {
        const forbiddenError: any = new Error('Forbidden');
        forbiddenError.status = 403;
        mockChat.sendMessage.mockRejectedValue(forbiddenError);

        const result = await service.analyzeCompany('forbidden.com', 'Forbidden Test');

        expect(result.industry).toBe('Unknown');
      });
    });

    describe('4.4 Malformed JSON Response', () => {
      it('should handle JSON parse errors gracefully', async () => {
        // Return invalid JSON that can't be parsed
        mockChatResponse.response.text.mockReturnValue('{ "industry": "Invalid JSON...');

        const result = await service.analyzeCompany('json-error.com', 'JSON Error Test');

        expect(result.industry).toBe('Unknown');
        expect(result.talkingPoint).toBeDefined();
      });

      it('should handle incomplete JSON responses', async () => {
        mockChatResponse.response.text.mockReturnValue('{"industry": "Manufacturing"');

        const result = await service.analyzeCompany('incomplete.com', 'Incomplete Test');

        expect(result).toBeDefined();
        expect(result.industry).toBe('Unknown');
      });

      it('should handle empty response', async () => {
        mockChatResponse.response.text.mockReturnValue('');

        const result = await service.analyzeCompany('empty.com', 'Empty Test');

        expect(result.industry).toBe('Unknown');
      });
    });

    describe('4.5 Circuit Breaker Behavior', () => {
      it('should handle service unavailable errors', async () => {
        const unavailableError: any = new Error('Service unavailable');
        unavailableError.code = 'UNAVAILABLE';
        unavailableError.status = 503;
        mockChat.sendMessage.mockRejectedValue(unavailableError);

        const result = await service.analyzeCompany('unavailable.com', 'Unavailable Test');

        expect(result.industry).toBe('Unknown');
        expect(result.talkingPoint).toContain('Unavailable Test');
      });

      it('should handle internal server errors', async () => {
        const serverError: any = new Error('Internal server error');
        serverError.status = 500;
        mockChat.sendMessage.mockRejectedValue(serverError);

        const result = await service.analyzeCompany('server-error.com', 'Server Error Test');

        expect(result.industry).toBe('Unknown');
      });
    });

    describe('4.6 General Error Resilience', () => {
      it('should never throw unhandled errors', async () => {
        const unexpectedError = new Error('Completely unexpected error');
        mockChat.sendMessage.mockRejectedValue(unexpectedError);

        // Should NOT throw - must handle gracefully
        await expect(
          service.analyzeCompany('unexpected.com', 'Unexpected Test')
        ).resolves.toBeDefined();
      });

      it('should always return valid CompanyAnalysis structure', async () => {
        const anyError = new Error('Any kind of error');
        mockChat.sendMessage.mockRejectedValue(anyError);

        const result = await service.analyzeCompany('any-error.com', 'Any Error Test');

        // Verify all required fields exist
        expect(result).toHaveProperty('industry');
        expect(result).toHaveProperty('talkingPoint');
        expect(result).toHaveProperty('website');
        expect(result).toHaveProperty('registeredCapital');
        expect(result).toHaveProperty('keywords');
        expect(typeof result.industry).toBe('string');
        expect(typeof result.talkingPoint).toBe('string');
      });

      it('should preserve company name in fallback talking point', async () => {
        const error = new Error('Test error');
        mockChat.sendMessage.mockRejectedValue(error);

        const result = await service.analyzeCompany('error.com', 'ABC Manufacturing Ltd');

        expect(result.talkingPoint).toContain('ABC Manufacturing Ltd');
      });

      it('should handle null/undefined errors', async () => {
        mockChat.sendMessage.mockRejectedValue(null);

        const result = await service.analyzeCompany('null-error.com', 'Null Error Test');

        expect(result.industry).toBe('Unknown');
        expect(result.talkingPoint).toBeDefined();
      });
    });
  });

  // ===========================================
  // generateSalesMessage - Focus on error handling
  // ===========================================

  describe('generateSalesMessage', () => {
    it('should return default message on error', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('API Error'));

      const result = await service.generateSalesMessage('Test Corp');

      // Should return ENEOS default message
      expect(result).toContain('ENEOS');
    });

    it('should return string type', async () => {
      const result = await service.generateSalesMessage('Test Corp');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty company name', async () => {
      const result = await service.generateSalesMessage('');

      // Should still return a valid message
      expect(typeof result).toBe('string');
    });
  });

  // ===========================================
  // healthCheck - Focus on error handling
  // ===========================================

  describe('healthCheck', () => {
    it('should return unhealthy when API fails', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('API Error'));

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return HealthCheckResult type', async () => {
      const result = await service.healthCheck();

      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('latency');
      expect(typeof result.healthy).toBe('boolean');
      expect(typeof result.latency).toBe('number');
    });

    it('should track latency on health check', async () => {
      const result = await service.healthCheck();

      // Latency should be a non-negative number
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================
  // DBD Sector Code Generation Tests
  // ===========================================

  describe('generateSectorCode', () => {
    it('should generate code from multi-word industries (initials)', async () => {
      const { generateSectorCode } = await import('../../services/gemini.service.js');

      expect(generateSectorCode('Food Beverage')).toBe('FB');
      expect(generateSectorCode('Transportation Logistics')).toBe('TL');
      expect(generateSectorCode('Real Estate Management')).toBe('REM');
    });

    it('should generate code from single-word industries (first 4 chars)', async () => {
      const { generateSectorCode } = await import('../../services/gemini.service.js');

      expect(generateSectorCode('Healthcare')).toBe('HEAL');
      expect(generateSectorCode('Manufacturing')).toBe('MANU');
      expect(generateSectorCode('Technology')).toBe('TECH');
      expect(generateSectorCode('Retail')).toBe('RETA');
    });

    it('should handle "Food & Beverage" with ampersand', async () => {
      const { generateSectorCode } = await import('../../services/gemini.service.js');

      expect(generateSectorCode('Food & Beverage')).toBe('FB');
      expect(generateSectorCode('Transportation & Logistics')).toBe('TL');
    });

    it('should handle short words correctly', async () => {
      const { generateSectorCode } = await import('../../services/gemini.service.js');

      expect(generateSectorCode('IT')).toBe('IT');
      expect(generateSectorCode('AI')).toBe('AI');
      expect(generateSectorCode('Oil')).toBe('OIL');
    });

    it('should handle Unknown or empty input', async () => {
      const { generateSectorCode } = await import('../../services/gemini.service.js');

      expect(generateSectorCode('Unknown')).toBe('OTHER');
      expect(generateSectorCode('')).toBe('OTHER');
      expect(generateSectorCode('   ')).toBe('OTHER');
    });

    it('should uppercase all output', async () => {
      const { generateSectorCode } = await import('../../services/gemini.service.js');

      expect(generateSectorCode('construction')).toBe('CONS');
      expect(generateSectorCode('food beverage')).toBe('FB');
    });

    it('should limit to 4 characters for multi-word', async () => {
      const { generateSectorCode } = await import('../../services/gemini.service.js');

      // 5 words → take first 4 letters only
      expect(generateSectorCode('Very Long Industry Name Here')).toBe('VLIN');
    });
  });

  // ===========================================
  // DBD Sector Code Validation Tests
  // ===========================================

  describe('isValidSectorCode', () => {
    it('should accept exact match codes', async () => {
      const { isValidSectorCode } = await import('../../services/gemini.service.js');

      expect(isValidSectorCode('MFG-A')).toBe(true);
      expect(isValidSectorCode('F&B-M')).toBe(true);
      expect(isValidSectorCode('TRANS-F')).toBe(true);
      expect(isValidSectorCode('MFG-CM')).toBe(true); // Newly added
    });

    it('should accept partial match with valid prefix', async () => {
      const { isValidSectorCode } = await import('../../services/gemini.service.js');

      // Gemini creates new sub-categories
      expect(isValidSectorCode('MFG-XYZ')).toBe(true); // Manufacturing - XYZ
      expect(isValidSectorCode('TRANS-NEW')).toBe(true); // Transport - NEW
      expect(isValidSectorCode('CON-TEST')).toBe(true); // Construction - TEST
    });

    it('should reject invalid prefix', async () => {
      const { isValidSectorCode } = await import('../../services/gemini.service.js');

      expect(isValidSectorCode('INVALID-A')).toBe(false);
      expect(isValidSectorCode('XXX-M')).toBe(false);
      expect(isValidSectorCode('RANDOM-CODE')).toBe(false);
    });

    it('should reject codes without dash', async () => {
      const { isValidSectorCode } = await import('../../services/gemini.service.js');

      expect(isValidSectorCode('MFG')).toBe(false);
      expect(isValidSectorCode('MANUFACTURING')).toBe(false);
    });

    it('should reject null or empty', async () => {
      const { isValidSectorCode } = await import('../../services/gemini.service.js');

      expect(isValidSectorCode(null)).toBe(false);
      expect(isValidSectorCode('')).toBe(false);
    });

    it('should handle F&B prefix with ampersand', async () => {
      const { isValidSectorCode } = await import('../../services/gemini.service.js');

      expect(isValidSectorCode('F&B-M')).toBe(true);
      expect(isValidSectorCode('F&B-NEW')).toBe(true);
    });

    it('should accept CONG for conglomerate companies', async () => {
      const { isValidSectorCode } = await import('../../services/gemini.service.js');

      // Conglomerate accepted without suffix (diversity is the defining characteristic)
      expect(isValidSectorCode('CONG')).toBe(true); // Conglomerate (exact match)
      expect(isValidSectorCode('CONG-DIV')).toBe(true); // Also accepts with suffix if Gemini adds one
    });
  });
});
