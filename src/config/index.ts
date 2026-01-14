/**
 * ENEOS Sales Automation - Configuration Module
 * Centralized configuration with validation
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ===========================================
// Environment Schema Validation
// ===========================================

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Brevo
  BREVO_WEBHOOK_SECRET: z.string().min(1, 'BREVO_WEBHOOK_SECRET is required'),

  // Google
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email('Invalid service account email'),
  GOOGLE_PRIVATE_KEY: z.string().min(1, 'GOOGLE_PRIVATE_KEY is required'),
  GOOGLE_SHEET_ID: z.string().min(1, 'GOOGLE_SHEET_ID is required'),
  LEADS_SHEET_NAME: z.string().default('Leads'),
  DEDUP_SHEET_NAME: z.string().default('Deduplication_Log'),
  SALES_TEAM_SHEET_NAME: z.string().default('Sales_Team'),

  // Gemini
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),

  // LINE
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1, 'LINE_CHANNEL_ACCESS_TOKEN is required'),
  LINE_CHANNEL_SECRET: z.string().min(1, 'LINE_CHANNEL_SECRET is required'),
  LINE_GROUP_ID: z.string().min(1, 'LINE_GROUP_ID is required'),

  // Security
  CORS_ORIGINS: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),

  // Feature Flags
  ENABLE_AI_ENRICHMENT: z.string().default('true').transform((v) => v === 'true'),
  ENABLE_DEDUPLICATION: z.string().default('true').transform((v) => v === 'true'),
  ENABLE_LINE_NOTIFICATIONS: z.string().default('true').transform((v) => v === 'true'),

  // Development Security Options (use with caution!)
  SKIP_LINE_SIGNATURE_VERIFICATION: z.string().default('false').transform((v) => v === 'true'),

  // Redis (optional - falls back to in-memory if not configured)
  REDIS_URL: z.string().optional(),
  REDIS_ENABLED: z.string().default('false').transform((v) => v === 'true'),

  // Sentry (optional - error tracking)
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
});

// ===========================================
// Parse and Validate Environment
// ===========================================

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // eslint-disable-next-line no-console -- Logger not available during config init
    console.error('Environment validation failed:');
    result.error.issues.forEach((issue) => {
      // eslint-disable-next-line no-console -- Logger not available during config init
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  const data = result.data;

  // ===========================================
  // Production Security Validations
  // ===========================================

  if (data.NODE_ENV === 'production') {
    // CRITICAL: Prevent security bypass in production
    if (data.SKIP_LINE_SIGNATURE_VERIFICATION) {
      // eslint-disable-next-line no-console -- Critical security error before logger init
      console.error('CRITICAL SECURITY ERROR: SKIP_LINE_SIGNATURE_VERIFICATION cannot be true in production!');
      process.exit(1);
    }

    // Warn about insecure CORS settings
    if (data.CORS_ORIGINS === '*') {
      // eslint-disable-next-line no-console -- Security warning before logger init
      console.warn('WARNING: CORS_ORIGINS is set to "*" in production. This is insecure!');
      // eslint-disable-next-line no-console -- Security warning before logger init
      console.warn('         Set CORS_ORIGINS to your specific domains (comma-separated).');
    }
  }

  return data;
};

const env = parseEnv();

// ===========================================
// Exported Configuration Object
// ===========================================

export const config = {
  // Server
  env: env.NODE_ENV,
  port: env.PORT,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  logLevel: env.LOG_LEVEL,

  // Brevo
  brevo: {
    webhookSecret: env.BREVO_WEBHOOK_SECRET,
  },

  // Google
  google: {
    serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    sheetId: env.GOOGLE_SHEET_ID,
    sheets: {
      leads: env.LEADS_SHEET_NAME,
      dedup: env.DEDUP_SHEET_NAME,
      salesTeam: env.SALES_TEAM_SHEET_NAME,
    },
  },

  // Gemini AI
  gemini: {
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
  },

  // LINE
  line: {
    channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: env.LINE_CHANNEL_SECRET,
    groupId: env.LINE_GROUP_ID,
  },

  // Security
  security: {
    corsOrigins: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX_REQUESTS,
    },
  },

  // Feature Flags
  features: {
    aiEnrichment: env.ENABLE_AI_ENRICHMENT,
    deduplication: env.ENABLE_DEDUPLICATION,
    lineNotifications: env.ENABLE_LINE_NOTIFICATIONS,
  },

  // Development/Testing Options
  dev: {
    skipLineSignatureVerification: env.SKIP_LINE_SIGNATURE_VERIFICATION,
  },

  // Redis
  redis: {
    enabled: env.REDIS_ENABLED,
    url: env.REDIS_URL || 'redis://localhost:6379',
  },

  // Sentry (Error Tracking)
  sentry: {
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    enabled: !!env.SENTRY_DSN,
  },
} as const;

export type Config = typeof config;
