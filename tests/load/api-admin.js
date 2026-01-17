import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const dashboardTime = new Trend('dashboard_response_time');
const leadsTime = new Trend('leads_response_time');
const performanceTime = new Trend('performance_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // Ramp up to 5 users
    { duration: '1m', target: 5 },     // Stay at 5 users
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 20 },    // Stay at 20 users
    { duration: '30s', target: 0 },    // Ramp down
  ],

  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% < 2 seconds (admin APIs can be slower)
    http_req_failed: ['rate<0.05'],     // Error rate < 5%
    'dashboard_response_time': ['p(95)<2000'],
    'leads_response_time': ['p(95)<2000'],
    'performance_response_time': ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Mock auth token (in real scenario, get this from auth flow)
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'mock-token-for-load-test';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};

export default function () {
  group('Admin Dashboard API', () => {
    // Test /api/admin/dashboard
    const dashboardRes = http.get(`${BASE_URL}/api/admin/dashboard`, { headers });
    dashboardTime.add(dashboardRes.timings.duration);

    const dashboardCheck = check(dashboardRes, {
      'dashboard status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'dashboard response time < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(!dashboardCheck);
  });

  sleep(0.5);

  group('Leads API', () => {
    // Test /api/admin/leads with pagination
    const leadsRes = http.get(`${BASE_URL}/api/admin/leads?page=1&limit=20`, { headers });
    leadsTime.add(leadsRes.timings.duration);

    const leadsCheck = check(leadsRes, {
      'leads status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'leads response time < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(!leadsCheck);
  });

  sleep(0.5);

  group('Sales Performance API', () => {
    // Test /api/admin/sales-performance
    const perfRes = http.get(`${BASE_URL}/api/admin/sales-performance`, { headers });
    performanceTime.add(perfRes.timings.duration);

    const perfCheck = check(perfRes, {
      'performance status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'performance response time < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(!perfCheck);
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'test-results/admin-api-load-test.json': JSON.stringify(data, null, 2),
  };
}
