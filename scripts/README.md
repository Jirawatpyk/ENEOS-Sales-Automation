# Performance Benchmarks

## Background Processing Benchmark

Performance benchmark สำหรับวัดประสิทธิภาพของ Background Processing feature (v1.1.0)

### Quick Start

```bash
# รัน server ก่อน (terminal 1)
npm run dev

# รัน benchmark (terminal 2)
npm run benchmark:dev
```

หรือใช้กับ production build:

```bash
# Build และรัน benchmark
npm run benchmark

# รัน benchmark กับ custom URL
BENCHMARK_URL=https://your-api.com npm run benchmark
```

### What It Measures

Benchmark นี้วัด **Webhook Response Time** เท่านั้น (ไม่ใช่ background processing time):

| Metric | Description |
|--------|-------------|
| **Throughput** | Requests per second (req/s) |
| **Response Times** | Min, Max, Mean, P50, P95, P99 |
| **Success Rate** | % of successful 200 OK responses |
| **Errors** | Number of failed requests |

### Test Scenarios

Benchmark รัน 4 scenarios อัตโนมัติ:

1. **Test 1: Low Load (Sequential)**
   - 10 requests, concurrency 1
   - วัด baseline performance

2. **Test 2: Medium Load**
   - 50 requests, concurrency 5
   - วัด typical production load

3. **Test 3: High Load**
   - 100 requests, concurrency 10
   - วัด high-traffic scenarios

4. **Test 4: Stress Test**
   - 200 requests, concurrency 20
   - วัด maximum capacity

### Expected Results

#### With Background Processing (v1.1.0)

```
Response Time:
- P50: ~50-200ms
- P95: ~200-500ms
- P99: ~500-1000ms

Throughput:
- Sequential: ~5-10 req/s
- Medium Load: ~10-20 req/s
- High Load: ~15-30 req/s
- Stress Test: ~20-40 req/s
```

#### Before Background Processing (Synchronous)

```
Response Time:
- P50: ~8,000-12,000ms (8-12s)
- P95: ~12,000-16,000ms (12-16s)
- P99: ~16,000-20,000ms (16-20s)

Throughput:
- ~0.1-0.2 req/s (very low)
```

### Performance Improvements

| Metric | Before (Sync) | After (Async) | Improvement |
|--------|---------------|---------------|-------------|
| P95 Response Time | 16,000ms | 500ms | **32x faster** |
| Throughput | 0.15 req/s | 30 req/s | **200x higher** |

### Interpreting Results

#### Good Performance
- ✅ P95 < 1000ms (1 second)
- ✅ Throughput > 20 req/s at high load
- ✅ Success Rate > 99%

#### Needs Investigation
- ⚠️ P95 > 2000ms (2 seconds)
- ⚠️ Success Rate < 95%
- ⚠️ Throughput degradation under load

#### Critical Issues
- ❌ P95 > 5000ms (5 seconds)
- ❌ Success Rate < 90%
- ❌ Errors increasing with load

### Troubleshooting

**High Response Times:**
- Check CPU/memory usage during benchmark
- Verify no external API calls in webhook handler
- Ensure background processor is running

**Low Throughput:**
- Check rate limiting configuration
- Monitor event loop lag
- Review middleware overhead

**Errors:**
- Check logs: `docker logs eneos-sales-automation`
- Verify database connections
- Check memory availability

### Advanced Usage

#### Custom Test Parameters

แก้ไข `scripts/benchmark-background-processing.ts`:

```typescript
// Example: Add custom test
const customTest = await runBenchmark(baseUrl, 500, 50);
printResults('Custom: 500 requests, concurrency 50', customTest);
```

#### Memory Profiling

รัน benchmark พร้อม memory profiling:

```bash
node --expose-gc --max-old-space-size=4096 dist/scripts/benchmark-background-processing.js
```

#### Production Benchmark

**⚠️ WARNING:** ห้ามรัน benchmark บน production โดยไม่ได้รับอนุญาต

```bash
# ใช้ staging environment
BENCHMARK_URL=https://staging-api.eneos.co.th npm run benchmark

# หรือใช้ production (ระวัง!)
BENCHMARK_URL=https://api.eneos.co.th npm run benchmark
```

### Continuous Benchmarking

เพิ่ม benchmark เข้า CI/CD pipeline:

```yaml
# .github/workflows/benchmark.yml
- name: Run Performance Benchmark
  run: |
    npm run dev &
    sleep 10
    npm run benchmark:dev
    kill %1
```

### Comparison with k6

Benchmark นี้แตกต่างจาก k6 load tests:

| Feature | benchmark.ts | k6 |
|---------|-------------|-----|
| **Purpose** | Quick performance check | Production load testing |
| **Setup** | Zero config | Requires k6 installation |
| **Output** | Human-readable | Metrics-focused |
| **Use Case** | Development, CI | Staging, Production QA |

ใช้ `benchmark.ts` สำหรับ development และ `k6` สำหรับ production load testing.

## Related Scripts

- `npm run test:load` - k6 load tests (all endpoints)
- `npm run test:load:webhook` - k6 webhook load test
- `npm run health` - Health check endpoint

## References

- [Background Processing Architecture](../docs/ARCHITECTURE.md#background-processing-with-status-tracking)
- [Performance Comparison](../CHANGELOG.md#110---2026-01-27)
- [Load Testing Guide](../tests/load/README.md)
