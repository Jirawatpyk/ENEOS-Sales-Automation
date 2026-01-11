/**
 * ENEOS Sales Automation - Sentry Integration
 * Centralized error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';
import { config } from '../config/index.js';

// ===========================================
// Sentry Initialization
// ===========================================

/**
 * Initialize Sentry error tracking
 * Call this early in application startup
 */
export function initSentry(): void {
  if (!config.sentry.enabled || !config.sentry.dsn) {
    // eslint-disable-next-line no-console -- Startup info before logger available
    console.log('Sentry is disabled (no DSN configured)');
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    release: process.env.npm_package_version || '1.0.0',

    // Performance monitoring
    tracesSampleRate: config.isProd ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Only capture errors in production by default
    enabled: config.sentry.enabled,

    // Integrations
    integrations: [
      // HTTP integration for tracing outgoing requests
      Sentry.httpIntegration(),
      // Express integration
      Sentry.expressIntegration(),
    ],

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['x-line-signature'];
        delete event.request.headers['cookie'];
      }

      // Remove sensitive data from extras
      if (event.extra) {
        const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'privateKey'];
        for (const key of sensitiveKeys) {
          if (key in event.extra) {
            event.extra[key] = '[REDACTED]';
          }
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Rate limiting errors
      'Too many requests',
      // Network errors that we can't do much about
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
    ],
  });

  // eslint-disable-next-line no-console -- Startup info before logger available
  console.log(`Sentry initialized (environment: ${config.sentry.environment})`);
}

// ===========================================
// Error Capture Utilities
// ===========================================

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: { id?: string; email?: string; name?: string };
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  }
): string | undefined {
  if (!config.sentry.enabled) {
    return undefined;
  }

  return Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    user: context?.user,
    level: context?.level || 'error',
  });
}

/**
 * Capture a message (non-exception)
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): string | undefined {
  if (!config.sentry.enabled) {
    return undefined;
  }

  return Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
  });
}

// ===========================================
// Context Management
// ===========================================

/**
 * Set user context for subsequent events
 */
export function setUser(user: { id?: string; email?: string; name?: string } | null): void {
  if (!config.sentry.enabled) {return;}
  Sentry.setUser(user);
}

/**
 * Set custom tags for subsequent events
 */
export function setTags(tags: Record<string, string>): void {
  if (!config.sentry.enabled) {return;}
  Sentry.setTags(tags);
}

/**
 * Set extra context data
 */
export function setExtra(key: string, value: unknown): void {
  if (!config.sentry.enabled) {return;}
  Sentry.setExtra(key, value);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  category?: string;
  message?: string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, unknown>;
}): void {
  if (!config.sentry.enabled) {return;}
  Sentry.addBreadcrumb(breadcrumb);
}

// ===========================================
// Transaction/Span Management
// ===========================================

/**
 * Start a new transaction for performance monitoring
 */
export function startTransaction(name: string, op: string): ReturnType<typeof Sentry.startSpan> | null {
  if (!config.sentry.enabled) {return null;}

  return Sentry.startSpan({ name, op }, (span) => span);
}

/**
 * Wrap an async function with Sentry transaction
 */
export async function withTransaction<T>(
  name: string,
  op: string,
  callback: () => Promise<T>
): Promise<T> {
  if (!config.sentry.enabled) {
    return callback();
  }

  return Sentry.startSpan({ name, op }, async () => {
    return callback();
  });
}

// ===========================================
// Express Middleware
// ===========================================

// Note: Sentry v8+ automatically instruments Express via the expressIntegration()
// No need for manual middleware handlers - just initialize Sentry before Express app

// ===========================================
// Shutdown
// ===========================================

/**
 * Flush pending events before shutdown
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  if (!config.sentry.enabled) {return true;}
  return Sentry.flush(timeout);
}

// ===========================================
// Export Sentry instance for advanced usage
// ===========================================

export { Sentry };
