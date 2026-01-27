/**
 * Background Processing Performance Benchmark
 * Measures response time, throughput, and resource usage
 *
 * Usage:
 *   npm run build
 *   node dist/scripts/benchmark-background-processing.js
 */

import { performance } from 'perf_hooks';

interface BenchmarkResult {
  totalRequests: number;
  duration: number;
  throughput: number;
  responseTimes: {
    min: number;
    max: number;
    mean: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errors: number;
  successRate: number;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate statistics from response times
 */
function calculateStats(times: number[]): BenchmarkResult['responseTimes'] {
  if (times.length === 0) {
    return { min: 0, max: 0, mean: 0, p50: 0, p95: 0, p99: 0 };
  }

  const sorted = [...times].sort((a, b) => a - b);
  const sum = times.reduce((acc, t) => acc + t, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / times.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

/**
 * Simulate webhook request
 */
async function simulateWebhookRequest(
  baseUrl: string,
  requestNumber: number
): Promise<{ success: boolean; responseTime: number }> {
  const startTime = performance.now();

  try {
    const response = await fetch(`${baseUrl}/webhook/brevo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'click',
        email: `benchmark${requestNumber}@test.com`,
        FIRSTNAME: 'Benchmark',
        LASTNAME: `User${requestNumber}`,
        PHONE: '0812345678',
        COMPANY: `Test Corp ${requestNumber}`,
        campaign_id: 99999,
        campaign_name: 'Benchmark Test',
        subject: 'Performance Test',
        'message-id': `benchmark-${requestNumber}`,
        date: new Date().toISOString(),
      }),
    });

    const responseTime = performance.now() - startTime;
    return { success: response.ok, responseTime };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    return { success: false, responseTime };
  }
}

/**
 * Run benchmark with specified concurrency
 */
async function runBenchmark(
  baseUrl: string,
  totalRequests: number,
  concurrency: number
): Promise<BenchmarkResult> {
  console.log(`\n🚀 Running benchmark: ${totalRequests} requests with concurrency ${concurrency}`);

  const startTime = performance.now();
  const responseTimes: number[] = [];
  let errors = 0;
  let completed = 0;

  // Process requests in batches
  for (let i = 0; i < totalRequests; i += concurrency) {
    const batch = Math.min(concurrency, totalRequests - i);
    const promises = Array.from({ length: batch }, (_, j) =>
      simulateWebhookRequest(baseUrl, i + j)
    );

    const results = await Promise.all(promises);

    results.forEach(result => {
      responseTimes.push(result.responseTime);
      if (!result.success) errors++;
      completed++;

      // Progress indicator
      if (completed % 10 === 0 || completed === totalRequests) {
        process.stdout.write(`\r  Progress: ${completed}/${totalRequests} requests completed`);
      }
    });
  }

  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000; // Convert to seconds

  console.log('\n'); // New line after progress indicator

  return {
    totalRequests,
    duration,
    throughput: totalRequests / duration,
    responseTimes: calculateStats(responseTimes),
    errors,
    successRate: ((totalRequests - errors) / totalRequests) * 100,
  };
}

/**
 * Print benchmark results in a formatted table
 */
function printResults(label: string, result: BenchmarkResult): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${label}`);
  console.log(`${'='.repeat(60)}`);

  console.log(`\n⚡ Performance Metrics:`);
  console.log(`  Total Requests:     ${result.totalRequests}`);
  console.log(`  Duration:           ${result.duration.toFixed(2)}s`);
  console.log(`  Throughput:         ${result.throughput.toFixed(2)} req/s`);
  console.log(`  Success Rate:       ${result.successRate.toFixed(2)}%`);
  console.log(`  Errors:             ${result.errors}`);

  console.log(`\n⏱️  Response Times (ms):`);
  console.log(`  Min:                ${result.responseTimes.min.toFixed(2)}ms`);
  console.log(`  Max:                ${result.responseTimes.max.toFixed(2)}ms`);
  console.log(`  Mean:               ${result.responseTimes.mean.toFixed(2)}ms`);
  console.log(`  P50 (Median):       ${result.responseTimes.p50.toFixed(2)}ms`);
  console.log(`  P95:                ${result.responseTimes.p95.toFixed(2)}ms`);
  console.log(`  P99:                ${result.responseTimes.p99.toFixed(2)}ms`);
}

/**
 * Main benchmark function
 */
async function main(): Promise<void> {
  const baseUrl = process.env.BENCHMARK_URL || 'http://localhost:3000';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔥 Background Processing Performance Benchmark`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\nTarget URL: ${baseUrl}`);
  console.log(`\nNote: This benchmark tests webhook response time only.`);
  console.log(`Background processing completes asynchronously.`);

  // Test 1: Low load (10 requests, concurrency 1)
  const test1 = await runBenchmark(baseUrl, 10, 1);
  printResults('Test 1: Low Load (10 requests, sequential)', test1);

  // Test 2: Medium load (50 requests, concurrency 5)
  const test2 = await runBenchmark(baseUrl, 50, 5);
  printResults('Test 2: Medium Load (50 requests, concurrency 5)', test2);

  // Test 3: High load (100 requests, concurrency 10)
  const test3 = await runBenchmark(baseUrl, 100, 10);
  printResults('Test 3: High Load (100 requests, concurrency 10)', test3);

  // Test 4: Stress test (200 requests, concurrency 20)
  const test4 = await runBenchmark(baseUrl, 200, 20);
  printResults('Test 4: Stress Test (200 requests, concurrency 20)', test4);

  // Summary comparison
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📈 Summary Comparison`);
  console.log(`${'='.repeat(60)}`);

  const tests = [
    { label: 'Test 1 (Sequential)', result: test1 },
    { label: 'Test 2 (Medium)', result: test2 },
    { label: 'Test 3 (High)', result: test3 },
    { label: 'Test 4 (Stress)', result: test4 },
  ];

  console.log(`\nThroughput (req/s):`);
  tests.forEach(t => {
    console.log(`  ${t.label.padEnd(25)} ${t.result.throughput.toFixed(2)} req/s`);
  });

  console.log(`\nP95 Response Time (ms):`);
  tests.forEach(t => {
    console.log(`  ${t.label.padEnd(25)} ${t.result.responseTimes.p95.toFixed(2)}ms`);
  });

  console.log(`\nSuccess Rate (%):`);
  tests.forEach(t => {
    console.log(`  ${t.label.padEnd(25)} ${t.result.successRate.toFixed(2)}%`);
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Benchmark complete!`);
  console.log(`${'='.repeat(60)}\n`);
}

// Run benchmark
main().catch(error => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});
