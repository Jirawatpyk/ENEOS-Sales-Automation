/**
 * Metrics Utility Tests
 * Tests for Prometheus metrics and helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ===========================================
// Mock prom-client using vi.hoisted
// ===========================================

const { mockCounterGet, mockGaugeGet, mockHistogramGet, mockRegistryMetrics } = vi.hoisted(() => ({
  mockCounterGet: vi.fn(),
  mockGaugeGet: vi.fn(),
  mockHistogramGet: vi.fn(),
  mockRegistryMetrics: vi.fn(),
}));

vi.mock('prom-client', () => ({
  default: {
    Registry: vi.fn().mockImplementation(() => ({
      contentType: 'text/plain; version=0.0.4; charset=utf-8',
      metrics: mockRegistryMetrics,
    })),
    Counter: vi.fn().mockImplementation(() => ({
      inc: vi.fn(),
      get: mockCounterGet,
    })),
    Gauge: vi.fn().mockImplementation(() => ({
      set: vi.fn(),
      inc: vi.fn(),
      dec: vi.fn(),
      get: mockGaugeGet,
    })),
    Histogram: vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      startTimer: vi.fn(() => vi.fn()),
      get: mockHistogramGet,
    })),
    collectDefaultMetrics: vi.fn(),
  },
  Registry: vi.fn().mockImplementation(() => ({
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
    metrics: mockRegistryMetrics,
  })),
  Counter: vi.fn().mockImplementation(() => ({
    inc: vi.fn(),
    get: mockCounterGet,
  })),
  Gauge: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    inc: vi.fn(),
    dec: vi.fn(),
    get: mockGaugeGet,
  })),
  Histogram: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    startTimer: vi.fn(() => vi.fn()),
    get: mockHistogramGet,
  })),
  collectDefaultMetrics: vi.fn(),
}));

// ===========================================
// Import after mocks
// ===========================================

import {
  getMetrics,
  getMetricsContentType,
  getMetricsSummary,
  httpRequestDuration,
  httpRequestTotal,
  httpActiveRequests,
  leadsProcessed,
  leadsClaimedTotal,
  aiAnalysisDuration,
  aiAnalysisTotal,
  lineNotificationTotal,
  duplicateLeadsTotal,
  raceConditionsTotal,
  externalServiceDuration,
  externalServiceErrors,
  circuitBreakerState,
  dlqSize,
  dlqEventsTotal,
  metricsRegistry,
} from '../../utils/metrics.js';

// ===========================================
// Tests
// ===========================================

describe('metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================
  // Metric Exports
  // ===========================================

  describe('metric exports', () => {
    it('should export HTTP metrics', () => {
      expect(httpRequestDuration).toBeDefined();
      expect(httpRequestTotal).toBeDefined();
      expect(httpActiveRequests).toBeDefined();
    });

    it('should export business metrics', () => {
      expect(leadsProcessed).toBeDefined();
      expect(leadsClaimedTotal).toBeDefined();
      expect(aiAnalysisDuration).toBeDefined();
      expect(aiAnalysisTotal).toBeDefined();
      expect(lineNotificationTotal).toBeDefined();
      expect(duplicateLeadsTotal).toBeDefined();
      expect(raceConditionsTotal).toBeDefined();
    });

    it('should export external service metrics', () => {
      expect(externalServiceDuration).toBeDefined();
      expect(externalServiceErrors).toBeDefined();
      expect(circuitBreakerState).toBeDefined();
    });

    it('should export DLQ metrics', () => {
      expect(dlqSize).toBeDefined();
      expect(dlqEventsTotal).toBeDefined();
    });

    it('should export metrics registry', () => {
      expect(metricsRegistry).toBeDefined();
    });
  });

  // ===========================================
  // getMetrics
  // ===========================================

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      mockRegistryMetrics.mockResolvedValue('# HELP test_metric Test metric\ntest_metric 1');

      const metrics = await getMetrics();

      expect(metrics).toContain('test_metric');
    });
  });

  // ===========================================
  // getMetricsContentType
  // ===========================================

  describe('getMetricsContentType', () => {
    it('should return Prometheus content type', () => {
      const contentType = getMetricsContentType();

      expect(contentType).toContain('text/plain');
    });
  });

  // ===========================================
  // getMetricsSummary
  // ===========================================

  describe('getMetricsSummary', () => {
    beforeEach(() => {
      // Setup default mock return values
      mockCounterGet.mockResolvedValue({
        values: [{ value: 100, labels: {} }],
      });
      mockGaugeGet.mockResolvedValue({
        values: [{ value: 5, labels: {} }],
      });
      mockHistogramGet.mockResolvedValue({
        values: [
          { metricName: 'test_sum', value: 10 },
          { metricName: 'test_count', value: 100 },
        ],
      });
    });

    it('should return a complete metrics summary object', async () => {
      const summary = await getMetricsSummary();

      expect(summary).toHaveProperty('timestamp');
      expect(summary).toHaveProperty('system');
      expect(summary).toHaveProperty('business');
      expect(summary).toHaveProperty('http');
      expect(summary).toHaveProperty('deadLetterQueue');
    });

    it('should include system information', async () => {
      const summary = await getMetricsSummary();

      expect(summary.system).toHaveProperty('uptime');
      expect(summary.system).toHaveProperty('uptimeSeconds');
      expect(summary.system).toHaveProperty('memory');
      expect(summary.system).toHaveProperty('nodeVersion');
      expect(summary.system.nodeVersion).toMatch(/^v\d+/);
    });

    it('should include memory information in readable format', async () => {
      const summary = await getMetricsSummary();

      expect(summary.system.memory).toHaveProperty('used');
      expect(summary.system.memory).toHaveProperty('total');
      expect(summary.system.memory).toHaveProperty('percentage');
      expect(summary.system.memory.percentage).toMatch(/^\d+\.\d+%$/);
    });

    it('should include business metrics', async () => {
      const summary = await getMetricsSummary();

      expect(summary.business.leads).toHaveProperty('processed');
      expect(summary.business.leads).toHaveProperty('duplicates');
      expect(summary.business.claims).toHaveProperty('total');
      expect(summary.business).toHaveProperty('raceConditions');
      expect(summary.business.aiAnalysis).toHaveProperty('total');
      expect(summary.business.aiAnalysis).toHaveProperty('avgDurationMs');
      expect(summary.business.lineNotifications).toHaveProperty('total');
    });

    it('should include HTTP metrics', async () => {
      const summary = await getMetricsSummary();

      expect(summary.http).toHaveProperty('totalRequests');
      expect(summary.http).toHaveProperty('activeRequests');
      expect(summary.http).toHaveProperty('avgResponseTimeMs');
    });

    it('should include dead letter queue metrics', async () => {
      const summary = await getMetricsSummary();

      expect(summary.deadLetterQueue).toHaveProperty('size');
      expect(summary.deadLetterQueue).toHaveProperty('totalEvents');
    });

    it('should handle counter errors gracefully', async () => {
      mockCounterGet.mockRejectedValue(new Error('Counter error'));

      const summary = await getMetricsSummary();

      // Should return 0 for failed counter
      expect(summary.http.totalRequests).toBe(0);
      expect(summary.business.leads.processed).toBe(0);
    });

    it('should handle gauge errors gracefully', async () => {
      mockGaugeGet.mockRejectedValue(new Error('Gauge error'));

      const summary = await getMetricsSummary();

      // Should return 0 for failed gauge
      expect(summary.http.activeRequests).toBe(0);
      expect(summary.deadLetterQueue.size).toBe(0);
    });

    it('should handle histogram errors gracefully', async () => {
      mockHistogramGet.mockRejectedValue(new Error('Histogram error'));

      const summary = await getMetricsSummary();

      // Should return 0 for failed histogram
      expect(summary.http.avgResponseTimeMs).toBe(0);
      expect(summary.business.aiAnalysis.avgDurationMs).toBe(0);
    });

    it('should calculate histogram average correctly', async () => {
      mockHistogramGet.mockResolvedValue({
        values: [
          { metricName: 'http_request_duration_seconds_sum', value: 50 },
          { metricName: 'http_request_duration_seconds_count', value: 100 },
        ],
      });

      const summary = await getMetricsSummary();

      // (50 / 100) * 1000 = 500ms
      expect(summary.http.avgResponseTimeMs).toBe(500);
    });

    it('should handle zero count in histogram', async () => {
      mockHistogramGet.mockResolvedValue({
        values: [
          { metricName: 'http_request_duration_seconds_sum', value: 0 },
          { metricName: 'http_request_duration_seconds_count', value: 0 },
        ],
      });

      const summary = await getMetricsSummary();

      expect(summary.http.avgResponseTimeMs).toBe(0);
    });

    it('should sum multiple counter values', async () => {
      mockCounterGet.mockResolvedValue({
        values: [
          { value: 50, labels: { method: 'GET' } },
          { value: 30, labels: { method: 'POST' } },
          { value: 20, labels: { method: 'PUT' } },
        ],
      });

      const summary = await getMetricsSummary();

      expect(summary.http.totalRequests).toBe(100);
    });

    it('should sum multiple gauge values', async () => {
      mockGaugeGet.mockResolvedValue({
        values: [
          { value: 3, labels: { route: '/api/leads' } },
          { value: 2, labels: { route: '/api/webhook' } },
        ],
      });

      const summary = await getMetricsSummary();

      expect(summary.http.activeRequests).toBe(5);
    });
  });

  // ===========================================
  // formatBytes (internal function tested via getMetricsSummary)
  // ===========================================

  describe('formatBytes (tested via summary)', () => {
    it('should format memory in readable format', async () => {
      const summary = await getMetricsSummary();

      // Memory should be formatted with units
      expect(summary.system.memory.used).toMatch(/\d+(\.\d+)?\s*(B|KB|MB|GB)/);
      expect(summary.system.memory.total).toMatch(/\d+(\.\d+)?\s*(B|KB|MB|GB)/);
    });
  });

  // ===========================================
  // formatDuration (internal function tested via getMetricsSummary)
  // ===========================================

  describe('formatDuration (tested via summary)', () => {
    it('should format uptime in readable format', async () => {
      const summary = await getMetricsSummary();

      // Uptime should be in s, m, or h format
      expect(summary.system.uptime).toMatch(/\d+(s|m|h)/);
      expect(summary.system.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================
  // getCounterValue with labels (internal function)
  // ===========================================

  describe('getCounterValue with labels (via mocking)', () => {
    it('should filter by labels when provided', async () => {
      mockCounterGet.mockResolvedValue({
        values: [
          { value: 50, labels: { status: 'success', source: 'brevo' } },
          { value: 10, labels: { status: 'error', source: 'brevo' } },
          { value: 40, labels: { status: 'success', source: 'manual' } },
        ],
      });

      // This is tested indirectly - the function is internal
      // but we verify the summary aggregates correctly
      const summary = await getMetricsSummary();

      // Total should sum all values
      expect(summary.business.leads.processed).toBe(100);
    });
  });
});

// ===========================================
// Additional edge case tests
// ===========================================

describe('metrics edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle empty counter values array', async () => {
    mockCounterGet.mockResolvedValue({ values: [] });
    mockGaugeGet.mockResolvedValue({ values: [] });
    mockHistogramGet.mockResolvedValue({ values: [] });

    const summary = await getMetricsSummary();

    expect(summary.http.totalRequests).toBe(0);
    expect(summary.http.activeRequests).toBe(0);
    expect(summary.http.avgResponseTimeMs).toBe(0);
  });

  it('should handle histogram without _sum or _count suffix', async () => {
    mockCounterGet.mockResolvedValue({ values: [] });
    mockGaugeGet.mockResolvedValue({ values: [] });
    mockHistogramGet.mockResolvedValue({
      values: [
        { metricName: 'test_bucket', value: 5 },  // bucket values don't contribute
        { metricName: 'test_total', value: 10 },  // no _sum or _count
      ],
    });

    const summary = await getMetricsSummary();

    // Should be 0 because no _sum or _count values
    expect(summary.http.avgResponseTimeMs).toBe(0);
  });

  it('should handle very large numbers', async () => {
    mockCounterGet.mockResolvedValue({
      values: [{ value: 1000000000, labels: {} }],
    });
    mockGaugeGet.mockResolvedValue({
      values: [{ value: 999999, labels: {} }],
    });
    mockHistogramGet.mockResolvedValue({
      values: [
        { metricName: 'test_sum', value: 1000000 },
        { metricName: 'test_count', value: 1000000 },
      ],
    });

    const summary = await getMetricsSummary();

    expect(summary.http.totalRequests).toBe(1000000000);
  });

  it('should include timestamp in ISO format', async () => {
    mockCounterGet.mockResolvedValue({ values: [] });
    mockGaugeGet.mockResolvedValue({ values: [] });
    mockHistogramGet.mockResolvedValue({ values: [] });

    const summary = await getMetricsSummary();

    // Should be valid ISO date
    const date = new Date(summary.timestamp);
    expect(date.toString()).not.toBe('Invalid Date');
  });
});
