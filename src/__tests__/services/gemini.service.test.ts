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
});
