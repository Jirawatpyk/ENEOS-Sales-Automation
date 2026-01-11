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

// ===========================================
// Human-Readable Metrics Summary
// ===========================================

interface MetricsSummary {
  timestamp: string;
  system: {
    uptime: string;
    uptimeSeconds: number;
    memory: {
      used: string;
      total: string;
      percentage: string;
    };
    nodeVersion: string;
  };
  business: {
    leads: {
      processed: number;
      duplicates: number;
    };
    claims: {
      total: number;
    };
    raceConditions: number;
    aiAnalysis: {
      total: number;
      avgDurationMs: number;
    };
    lineNotifications: {
      total: number;
    };
  };
  http: {
    totalRequests: number;
    activeRequests: number;
    avgResponseTimeMs: number;
  };
  deadLetterQueue: {
    size: number;
    totalEvents: number;
  };
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {return `${bytes} B`;}
  if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`;}
  if (bytes < 1024 * 1024 * 1024) {return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;}
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format seconds to human readable duration
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {return `${Math.floor(seconds)}s`;}
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Get counter value safely
 */
async function getCounterValue(counter: client.Counter<string>, labels?: Record<string, string>): Promise<number> {
  try {
    const metrics = await counter.get();
    if (labels) {
      const metric = metrics.values.find(v =>
        Object.entries(labels).every(([key, val]) => v.labels[key] === val)
      );
      return metric?.value || 0;
    }
    return metrics.values.reduce((sum, v) => sum + v.value, 0);
  } catch {
    return 0;
  }
}

/**
 * Get gauge value safely
 */
async function getGaugeValue(gauge: client.Gauge<string>): Promise<number> {
  try {
    const metrics = await gauge.get();
    return metrics.values.reduce((sum, v) => sum + v.value, 0);
  } catch {
    return 0;
  }
}

/**
 * Get histogram average safely
 */
async function getHistogramAvg(histogram: client.Histogram<string>): Promise<number> {
  try {
    const metrics = await histogram.get();
    let totalSum = 0;
    let totalCount = 0;
    for (const v of metrics.values) {
      if (v.metricName?.endsWith('_sum')) {
        totalSum += v.value;
      } else if (v.metricName?.endsWith('_count')) {
        totalCount += v.value;
      }
    }
    return totalCount > 0 ? (totalSum / totalCount) * 1000 : 0; // Convert to ms
  } catch {
    return 0;
  }
}

/**
 * Get human-readable metrics summary
 */
export async function getMetricsSummary(): Promise<MetricsSummary> {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  // Get metric values
  const [
    totalRequests,
    activeRequests,
    avgResponseTime,
    leadsTotal,
    duplicatesTotal,
    claimsTotal,
    raceCondTotal,
    aiTotal,
    aiAvgDuration,
    lineTotal,
    dlqSizeVal,
    dlqEventsVal,
  ] = await Promise.all([
    getCounterValue(httpRequestTotal),
    getGaugeValue(httpActiveRequests),
    getHistogramAvg(httpRequestDuration),
    getCounterValue(leadsProcessed),
    getCounterValue(duplicateLeadsTotal),
    getCounterValue(leadsClaimedTotal),
    getCounterValue(raceConditionsTotal),
    getCounterValue(aiAnalysisTotal),
    getHistogramAvg(aiAnalysisDuration),
    getCounterValue(lineNotificationTotal),
    getGaugeValue(dlqSize),
    getCounterValue(dlqEventsTotal),
  ]);

  return {
    timestamp: new Date().toISOString(),
    system: {
      uptime: formatDuration(uptime),
      uptimeSeconds: Math.floor(uptime),
      memory: {
        used: formatBytes(memUsage.heapUsed),
        total: formatBytes(memUsage.heapTotal),
        percentage: `${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1)}%`,
      },
      nodeVersion: process.version,
    },
    business: {
      leads: {
        processed: leadsTotal,
        duplicates: duplicatesTotal,
      },
      claims: {
        total: claimsTotal,
      },
      raceConditions: raceCondTotal,
      aiAnalysis: {
        total: aiTotal,
        avgDurationMs: Math.round(aiAvgDuration),
      },
      lineNotifications: {
        total: lineTotal,
      },
    },
    http: {
      totalRequests: totalRequests,
      activeRequests: activeRequests,
      avgResponseTimeMs: Math.round(avgResponseTime),
    },
    deadLetterQueue: {
      size: dlqSizeVal,
      totalEvents: dlqEventsVal,
    },
  };
}
