import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const webhookTime = new Trend('webhook_response_time');

// Test configuration - Webhook should handle burst traffic
export const options = {
  scenarios: {
    // Normal load: steady stream of webhooks
    normal_load: {
      executor: 'constant-arrival-rate',
      rate: 10,              // 10 requests per second
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
    // Spike test: sudden burst (email campaign sent)
    spike_test: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 200,
      stages: [
        { duration: '30s', target: 10 },   // Normal
        { duration: '10s', target: 100 },  // Spike!
        { duration: '30s', target: 100 },  // Sustained spike
        { duration: '20s', target: 10 },   // Back to normal
      ],
      startTime: '1m',  // Start after normal_load
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 95% < 1 second (webhook must be fast)
    http_req_failed: ['rate<0.01'],     // Error rate < 1%
    'webhook_response_time': ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WEBHOOK_SECRET = __ENV.BREVO_WEBHOOK_SECRET || 'test-secret';

// Generate realistic Brevo webhook payload
function generateBrevoPayload() {
  const eventId = randomIntBetween(1000000, 9999999);
  const email = `test.user.${randomString(8)}@example.com`;
  const campaignId = randomIntBetween(100, 999);

  return {
    event: 'click',
    email: email,
    id: eventId,
    date: new Date().toISOString(),
    'message-id': `<${randomString(20)}@brevo.com>`,
    subject: `Test Campaign ${campaignId}`,
    tag: `campaign-${campaignId}`,
    sending_ip: '185.107.232.1',
    ts_event: Math.floor(Date.now() / 1000),
    link: 'https://eneos.co.th/products',
    // Contact attributes
    'X-Mailin-custom': JSON.stringify({
      campaign_id: campaignId,
      campaign_name: `Test Campaign ${campaignId}`,
    }),
  };
}

export default function () {
  const payload = generateBrevoPayload();

  const res = http.post(
    `${BASE_URL}/webhook/brevo`,
    JSON.stringify(payload),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Brevo-Webhook-Secret': WEBHOOK_SECRET,
      },
    }
  );

  webhookTime.add(res.timings.duration);

  const webhookCheck = check(res, {
    'webhook status is 200': (r) => r.status === 200,
    'webhook response time < 1s': (r) => r.timings.duration < 1000,
    // Webhook should respond quickly (async processing)
    'webhook responds within timeout': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!webhookCheck);

  // Small sleep to simulate realistic webhook spacing
  sleep(0.1);
}

export function handleSummary(data) {
  return {
    'test-results/brevo-webhook-load-test.json': JSON.stringify(data, null, 2),
  };
}
