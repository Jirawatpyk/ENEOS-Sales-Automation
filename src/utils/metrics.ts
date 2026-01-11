/**
 * ENEOS Sales Automation - Prometheus Metrics
 * Enterprise-grade performance monitoring
 */

import client from 'prom-client';

// ===========================================
// Initialize Prometheus Registry
// ===========================================

const register = new client.Registry();

// Add default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register });

// ===========================================
// HTTP Request Metrics
// ===========================================

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpActiveRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests',
  registers: [register],
});

// ===========================================
// Business Metrics
// ===========================================

export const leadsProcessed = new client.Counter({
  name: 'leads_processed_total',
  help: 'Total number of leads processed',
  labelNames: ['status', 'source'],
  registers: [register],
});

export const leadsClaimedTotal = new client.Counter({
  name: 'leads_claimed_total',
  help: 'Total number of leads claimed by sales team',
  labelNames: ['status'],
  registers: [register],
});

export const aiAnalysisDuration = new client.Histogram({
  name: 'ai_analysis_duration_seconds',
  help: 'Duration of Gemini AI analysis in seconds',
  buckets: [0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const aiAnalysisTotal = new client.Counter({
  name: 'ai_analysis_total',
  help: 'Total number of AI analysis requests',
  labelNames: ['status'],
  registers: [register],
});

export const lineNotificationTotal = new client.Counter({
  name: 'line_notification_total',
  help: 'Total number of LINE notifications sent',
  labelNames: ['status', 'type'],
  registers: [register],
});

export const duplicateLeadsTotal = new client.Counter({
  name: 'duplicate_leads_total',
  help: 'Total number of duplicate leads detected',
  registers: [register],
});

export const raceConditionsTotal = new client.Counter({
  name: 'race_conditions_total',
  help: 'Total number of race conditions detected',
  registers: [register],
});

// ===========================================
// External Service Metrics
// ===========================================

export const externalServiceDuration = new client.Histogram({
  name: 'external_service_duration_seconds',
  help: 'Duration of external service calls in seconds',
  labelNames: ['service', 'operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const externalServiceErrors = new client.Counter({
  name: 'external_service_errors_total',
  help: 'Total number of external service errors',
  labelNames: ['service', 'error_type'],
  registers: [register],
});

export const circuitBreakerState = new client.Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['service'],
  registers: [register],
});

// ===========================================
// Dead Letter Queue Metrics
// ===========================================

export const dlqSize = new client.Gauge({
  name: 'dead_letter_queue_size',
  help: 'Current size of the dead letter queue',
  labelNames: ['status'],
  registers: [register],
});

export const dlqEventsTotal = new client.Counter({
  name: 'dlq_events_total',
  help: 'Total events added to dead letter queue',
  labelNames: ['source', 'error_type'],
  registers: [register],
});

// ===========================================
// Export Registry
// ===========================================

export { register as metricsRegistry };

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Get metrics content type
 */
export function getMetricsContentType(): string {
  return register.contentType;
}
