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
process.env.GEMINI_API_KEY = 'test_gemini_key';
process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test_line_token';
process.env.LINE_CHANNEL_SECRET = 'test_line_secret';
process.env.LINE_GROUP_ID = 'test_group_id';

// Supabase
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_supabase_service_role_key';

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
