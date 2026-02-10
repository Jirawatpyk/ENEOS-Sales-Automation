/**
 * ENEOS Sales Automation - Main Application
 * Enterprise-grade Express server with all middleware and routes
 */

import express, { Express } from 'express';
import { Server } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { initSentry, flushSentry, captureException } from './utils/sentry.js';
import { redisService } from './services/redis.service.js';

// ===========================================
// Initialize Sentry (MUST be first)
// ===========================================
initSentry();
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import {
  requestIdMiddleware,
  timeoutMiddleware,
  responseTimeMiddleware,
} from './middleware/request-context.js';
import webhookRoutes from './routes/webhook.routes.js';
import lineRoutes from './routes/line.routes.js';
import adminRoutes from './routes/admin.routes.js';
import statusRoutes from './routes/status.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import { checkSupabaseHealth } from './lib/supabase.js';
import { geminiService } from './services/gemini.service.js';
import { lineService } from './services/line.service.js';
import { getStats } from './services/deduplication.service.js';
import { deadLetterQueue } from './services/dead-letter-queue.service.js';
import { HealthCheckResponse } from './types/index.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { metricsMiddleware } from './middleware/metrics.middleware.js';
import { getMetrics, getMetricsContentType, getMetricsSummary } from './utils/metrics.js';

// ===========================================
// Create Express Application
// ===========================================

const app: Express = express();

// ===========================================
// Security Middleware
// ===========================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for webhooks
}));

// CORS configuration
const corsOrigins = config.security.corsOrigins;
app.use(cors({
  origin: corsOrigins.includes('*') ? '*' : corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Line-Signature'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// ===========================================
// Request Context (ID + Timing)
// ===========================================

app.use(requestIdMiddleware);
app.use(responseTimeMiddleware);
app.use(metricsMiddleware);

// ===========================================
// Request Timeout (30 seconds default)
// ===========================================

app.use(timeoutMiddleware({
  timeoutMs: 30000,
  excludePaths: ['/health', '/ready'], // Don't timeout health checks
}));

// ===========================================
// Body Parsing
// ===========================================

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ===========================================
// Request Logging
// ===========================================

app.use(requestLogger);

// ===========================================
// Routes
// ===========================================

// ===========================================
// Health Check Cache (Enterprise-grade)
// ===========================================
interface HealthCacheEntry {
  data: HealthCheckResponse;
  expiry: number;
  lastCheck: number;
}

const HEALTH_CACHE_TTL_MS = 30000; // 30 seconds
let healthCache: HealthCacheEntry | null = null;

async function supabaseHealthCheck(): Promise<{ healthy: boolean; latency: number }> {
  const start = Date.now();
  const healthy = await checkSupabaseHealth();
  return { healthy, latency: Date.now() - start };
}

async function getHealthCheckWithCache(): Promise<HealthCheckResponse> {
  const now = Date.now();

  // Return cached data if still valid
  if (healthCache && now < healthCache.expiry) {
    return {
      ...healthCache.data,
      cached: true,
      cacheAge: now - healthCache.lastCheck,
    } as HealthCheckResponse;
  }

  // Fetch fresh health data
  const [supabaseHealth, geminiHealth, lineHealth] = await Promise.all([
    supabaseHealthCheck(),
    geminiService.healthCheck(),
    lineService.healthCheck(),
  ]);

  const allHealthy = supabaseHealth.healthy && geminiHealth.healthy && lineHealth.healthy;
  const anyDegraded = !supabaseHealth.healthy || !geminiHealth.healthy || !lineHealth.healthy;

  const response: HealthCheckResponse = {
    status: allHealthy ? 'healthy' : anyDegraded ? 'degraded' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      supabase: {
        status: supabaseHealth.healthy ? 'up' : 'down',
        latency: supabaseHealth.latency,
      },
      geminiAI: {
        status: geminiHealth.healthy ? 'up' : 'down',
        latency: geminiHealth.latency,
      },
      lineAPI: {
        status: lineHealth.healthy ? 'up' : 'down',
        latency: lineHealth.latency,
      },
    },
  };

  // Update cache
  healthCache = {
    data: response,
    expiry: now + HEALTH_CACHE_TTL_MS,
    lastCheck: now,
  };

  return response;
}

// Health check endpoint (with caching)
app.get('/health', async (_req, res) => {
  try {
    const response = await getHealthCheckWithCache();
    const isHealthy = response.status === 'healthy';
    res.status(isHealthy ? 200 : 503).json(response);
  } catch (_error) {
    // If health check fails completely, return error but don't crash
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Force refresh health (bypass cache) - useful for monitoring
app.get('/health/refresh', async (_req, res) => {
  healthCache = null; // Clear cache
  const [supabaseHealth, geminiHealth, lineHealth] = await Promise.all([
    supabaseHealthCheck(),
    geminiService.healthCheck(),
    lineService.healthCheck(),
  ]);

  const allHealthy = supabaseHealth.healthy && geminiHealth.healthy && lineHealth.healthy;

  const response: HealthCheckResponse = {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      supabase: {
        status: supabaseHealth.healthy ? 'up' : 'down',
        latency: supabaseHealth.latency,
      },
      geminiAI: {
        status: geminiHealth.healthy ? 'up' : 'down',
        latency: geminiHealth.latency,
      },
      lineAPI: {
        status: lineHealth.healthy ? 'up' : 'down',
        latency: lineHealth.latency,
      },
    },
  };

  // Update cache with fresh data
  healthCache = {
    data: response,
    expiry: Date.now() + HEALTH_CACHE_TTL_MS,
    lastCheck: Date.now(),
  };

  res.status(allHealthy ? 200 : 503).json({ ...response, refreshed: true });
});

// Readiness check (simpler)
app.get('/ready', (_req, res) => {
  res.status(200).json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

// Liveness check (minimal - just checks if process is alive)
app.get('/live', (_req, res) => {
  res.status(200).json({
    alive: true,
    uptime: process.uptime(),
  });
});

// API info
app.get('/', (_req, res) => {
  res.json({
    name: 'ENEOS Sales Automation API',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    endpoints: {
      health: '/health',
      ready: '/ready',
      brevoWebhook: '/webhook/brevo',
      brevoCampaignWebhook: '/webhook/brevo/campaign',
      lineWebhook: '/webhook/line',
      adminDashboard: '/api/admin/dashboard',
      adminLeads: '/api/admin/leads',
      adminSalesPerformance: '/api/admin/sales-performance',
    },
  });
});

// API Documentation (Swagger UI)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ENEOS Sales Automation API',
}));

// OpenAPI JSON spec endpoint
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Prometheus Metrics endpoint (raw format for monitoring tools)
app.get('/metrics', async (_req, res) => {
  try {
    res.setHeader('Content-Type', getMetricsContentType());
    res.send(await getMetrics());
  } catch (_error) {
    res.status(500).send('Error collecting metrics');
  }
});

// Human-readable Metrics Summary (easy to read JSON format)
app.get('/metrics/summary', async (_req, res) => {
  try {
    const summary = await getMetricsSummary();
    res.json(summary);
  } catch (_error) {
    res.status(500).json({ error: 'Error collecting metrics summary' });
  }
});

// ===========================================
// Webhook Routes
// ===========================================
// Note: Routes are mounted in order of specificity
// - /webhook/brevo/campaign - Campaign events (Brevo email metrics)
// - /webhook/line - LINE bot webhooks
// - /webhook - General webhooks (Brevo lead webhooks at /webhook/brevo)
//
// Campaign routes are mounted separately to avoid path conflicts
// and allow independent rate limiting in the future
// ===========================================
app.use('/webhook/brevo/campaign', campaignRoutes);
app.use('/webhook/line', lineRoutes);
app.use('/webhook', webhookRoutes);

// Admin Dashboard API routes
app.use('/api/admin', adminRoutes);

// Status API routes
app.use('/api/leads/status', statusRoutes);

// Stats endpoint (development only)
if (config.isDev) {
  app.get('/stats', (_req, res) => {
    res.json({
      deduplication: getStats(),
      deadLetterQueue: deadLetterQueue.getStats(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });

  // DLQ management endpoints
  app.get('/dlq', (_req, res) => {
    res.json({
      success: true,
      data: deadLetterQueue.getAll(100), // Get last 100 events
      stats: deadLetterQueue.getStats(),
    });
  });

  app.delete('/dlq/:id', (req, res) => {
    const removed = deadLetterQueue.remove(req.params.id);
    res.json({ success: removed });
  });

  app.delete('/dlq', (_req, res) => {
    const count = deadLetterQueue.clear();
    res.json({ success: true, clearedCount: count });
  });
}

// ===========================================
// Error Handling
// ===========================================

app.use(notFoundHandler);
app.use(errorHandler);

// ===========================================
// Server Reference (for graceful shutdown)
// ===========================================

 
let server: Server;

// ===========================================
// Graceful Shutdown
// ===========================================

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      logger.error('Error during server close', { error: err.message });
      process.exit(1);
    }

    logger.info('HTTP server closed, no longer accepting connections');

    // Cleanup services
    try {
      // Flush Sentry events
      await flushSentry(2000);
      logger.info('Sentry events flushed');

      // Disconnect Redis
      await redisService.disconnect();
      logger.info('Redis disconnected');
    } catch (cleanupError) {
      logger.error('Error during cleanup', {
        error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
      });
    }

    // Give ongoing requests time to complete
    setTimeout(() => {
      logger.info('Shutdown complete');
      process.exit(0);
    }, 2000);
  });

  // Force exit after 15 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 15000);
}

// Register process crash handlers only in non-test environments.
// In test mode, Vitest manages the process lifecycle — these handlers
// would kill the worker on any unhandled error, causing spurious EPIPE crashes.
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    captureException(error, { tags: { type: 'uncaught_exception' } });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    if (reason instanceof Error) {
      captureException(reason, { tags: { type: 'unhandled_rejection' } });
    }
    process.exit(1);
  });
}

// ===========================================
// Start Server
// ===========================================

const PORT = config.port;

// Skip server.listen in test mode — supertest creates its own server.
// This prevents EADDRINUSE when multiple test workers import app.ts.
if (process.env.NODE_ENV === 'test') {
  server = null as unknown as ReturnType<typeof app.listen>;
} else {
  server = app.listen(PORT, () => {
  logger.info(`ENEOS Sales Automation API started`, {
    port: PORT,
    environment: config.env,
    nodeVersion: process.version,
    features: {
      aiEnrichment: config.features.aiEnrichment,
      deduplication: config.features.deduplication,
      lineNotifications: config.features.lineNotifications,
    },
  });

  // Log endpoints
  logger.info('Available endpoints:', {
    health: `http://localhost:${PORT}/health`,
    ready: `http://localhost:${PORT}/ready`,
    live: `http://localhost:${PORT}/live`,
    brevoWebhook: `http://localhost:${PORT}/webhook/brevo`,
    lineWebhook: `http://localhost:${PORT}/webhook/line`,
  });
  });
}

export default app;
export { server };
