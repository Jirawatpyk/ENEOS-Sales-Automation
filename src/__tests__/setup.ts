/**
 * Vitest Test Setup
 * Global setup for all tests
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// ===========================================
// Environment Variables for Tests
// ===========================================

process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Mock environment variables
process.env.BREVO_WEBHOOK_SECRET = 'test_brevo_secret';
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@test.iam.gserviceaccount.com';
process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----\n';
process.env.GOOGLE_SHEET_ID = 'test_sheet_id';
process.env.GEMINI_API_KEY = 'test_gemini_key';
process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test_line_token';
process.env.LINE_CHANNEL_SECRET = 'test_line_secret';
process.env.LINE_GROUP_ID = 'test_group_id';

// ===========================================
// Global Hooks
// ===========================================

beforeAll(() => {
  // Setup before all tests
});

afterAll(() => {
  // Cleanup after all tests
});

afterEach(() => {
  // Reset all mocks after each test
  vi.clearAllMocks();
});

// ===========================================
// Global Mocks
// ===========================================

// Mock console to reduce noise
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'debug').mockImplementation(() => {});
