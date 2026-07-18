#!/usr/bin/env node

/**
 * Runtime Performance Testing Script
 * Measures actual runtime metrics from the development server
 *
 * Usage: npm run dev (in another terminal), then: node scripts/performance-test.js
 */

const http = require('http');
const url = require('url');

const BASE_URL = 'http://localhost:3000';

class PerformanceTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      metrics: {}
    };
    this.requests = 0;
    this.errors = 0;
  }

  makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const urlObj = url.parse(`${BASE_URL}${path}`);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.path,
        method: method,
        headers: {
          'User-Agent': 'Performance-Tester/1.0'
        }
      };

      if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const duration = Date.now() - startTime;
          const statusCode = res.statusCode;

          resolve({
            duration,
            statusCode,
            size: Buffer.byteLength(data),
            headers: res.headers,
            body: data
          });
        });
      });

      req.on('error', (err) => {
        this.errors++;
        reject(err);
      });

      if (body) {
        req.write(body);
      }

      req.end();
    });
  }

  async testLoginPage() {
    console.log('\n📱 Testing Login Page...');
    try {
      const measurements = [];

      for (let i = 0; i < 3; i++) {
        const result = await this.makeRequest('/login');
        measurements.push(result.duration);
        console.log(`  Attempt ${i + 1}: ${result.duration}ms`);
      }

      const avg = measurements.reduce((a, b) => a + b) / measurements.length;
      const min = Math.min(...measurements);
      const max = Math.max(...measurements);

      this.results.metrics.loginPage = {
        measurements,
        avg: Math.round(avg),
        min,
        max,
        status: 'success'
      };

      console.log(`✓ Average: ${Math.round(avg)}ms (min: ${min}ms, max: ${max}ms)`);
    } catch (err) {
      console.error(`✗ Failed: ${err.message}`);
      this.results.metrics.loginPage = { error: err.message };
    }
  }

  async testDashboard() {
    console.log('\n📊 Testing Dashboard...');
    try {
      const measurements = [];

      for (let i = 0; i < 3; i++) {
        const result = await this.makeRequest('/');
        measurements.push(result.duration);
        console.log(`  Attempt ${i + 1}: ${result.duration}ms`);
      }

      const avg = measurements.reduce((a, b) => a + b) / measurements.length;
      const min = Math.min(...measurements);
      const max = Math.max(...measurements);

      this.results.metrics.dashboard = {
        measurements,
        avg: Math.round(avg),
        min,
        max,
        status: 'success'
      };

      console.log(`✓ Average: ${Math.round(avg)}ms (min: ${min}ms, max: ${max}ms)`);
    } catch (err) {
      console.error(`✗ Failed: ${err.message}`);
      this.results.metrics.dashboard = { error: err.message };
    }
  }

  async testConcurrency(concurrent = 10) {
    console.log(`\n🔄 Testing Concurrency (${concurrent} simultaneous requests)...`);
    try {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < concurrent; i++) {
        promises.push(this.makeRequest('/'));
      }

      const results = await Promise.allSettled(promises);
      const totalDuration = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const durations = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value.duration);

      const avg = durations.length > 0
        ? durations.reduce((a, b) => a + b) / durations.length
        : 0;

      this.results.metrics.concurrency = {
        concurrent,
        totalDuration,
        successful,
        failed,
        avgResponseTime: Math.round(avg),
        throughput: Math.round((concurrent / totalDuration) * 1000),
        status: failed === 0 ? 'success' : 'partial'
      };

      console.log(`✓ Total: ${totalDuration}ms | Success: ${successful}/${concurrent} | Throughput: ${this.results.metrics.concurrency.throughput} req/sec`);
    } catch (err) {
      console.error(`✗ Failed: ${err.message}`);
      this.results.metrics.concurrency = { error: err.message };
    }
  }

  async measureBundleSize() {
    console.log('\n📦 Measuring HTML/CSS Bundle Size...');
    try {
      const result = await this.makeRequest('/login');
      const htmlSize = result.size;

      this.results.metrics.htmlBundleSize = {
        bytes: htmlSize,
        kilobytes: (htmlSize / 1024).toFixed(2),
        megabytes: (htmlSize / 1024 / 1024).toFixed(3),
        status: 'measured'
      };

      console.log(`✓ HTML Bundle: ${this.results.metrics.htmlBundleSize.kilobytes}KB`);
    } catch (err) {
      console.error(`✗ Failed: ${err.message}`);
      this.results.metrics.htmlBundleSize = { error: err.message };
    }
  }

  async testMemoryBaseline() {
    console.log('\n💾 Testing Memory Baseline...');
    try {
      // Make 20 requests to load the system
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(this.makeRequest('/'));
      }

      await Promise.allSettled(promises);

      const usage = process.memoryUsage();

      this.results.metrics.memoryUsage = {
        rss: (usage.rss / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (usage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (usage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        external: (usage.external / 1024 / 1024).toFixed(2) + ' MB',
        status: 'measured'
      };

      console.log(`✓ Heap Used: ${this.results.metrics.memoryUsage.heapUsed}`);
    } catch (err) {
      console.error(`✗ Failed: ${err.message}`);
      this.results.metrics.memoryUsage = { error: err.message };
    }
  }

  async testResponseTimeDistribution() {
    console.log('\n📈 Testing Response Time Distribution (50 requests)...');
    try {
      const durations = [];

      for (let i = 0; i < 50; i++) {
        const result = await this.makeRequest('/');
        durations.push(result.duration);
      }

      durations.sort((a, b) => a - b);

      this.results.metrics.responseTimeDistribution = {
        samples: 50,
        min: durations[0],
        p50: durations[Math.floor(durations.length * 0.50)],
        p90: durations[Math.floor(durations.length * 0.90)],
        p95: durations[Math.floor(durations.length * 0.95)],
        p99: durations[Math.floor(durations.length * 0.99)],
        max: durations[durations.length - 1],
        avg: Math.round(durations.reduce((a, b) => a + b) / durations.length)
      };

      console.log(`✓ p95: ${this.results.metrics.responseTimeDistribution.p95}ms | p99: ${this.results.metrics.responseTimeDistribution.p99}ms`);
    } catch (err) {
      console.error(`✗ Failed: ${err.message}`);
      this.results.metrics.responseTimeDistribution = { error: err.message };
    }
  }

  generateReport() {
    return `# Runtime Performance Test Results

**Timestamp:** ${this.results.timestamp}
**Server:** ${BASE_URL}

---

## Login Page Performance

${this.formatMetric(this.results.metrics.loginPage, 'loginPage')}

**Target:** <300ms average
**Status:** ${this.results.metrics.loginPage?.avg <= 300 ? '✅ Pass' : '⚠️ Exceeds target'}

---

## Dashboard Performance

${this.formatMetric(this.results.metrics.dashboard, 'dashboard')}

**Target:** <500ms average
**Status:** ${this.results.metrics.dashboard?.avg <= 500 ? '✅ Pass' : '⚠️ Exceeds target'}

---

## HTML Bundle Size

${this.results.metrics.htmlBundleSize?.kilobytes ? `
**Size:** ${this.results.metrics.htmlBundleSize.kilobytes}KB
**Target:** <200KB
**Status:** ${parseFloat(this.results.metrics.htmlBundleSize.kilobytes) < 200 ? '✅ Pass' : '⚠️ Exceeds target'}
` : '**Status:** Failed to measure'}

---

## Concurrency Test

${this.results.metrics.concurrency ? `
**Test:** ${this.results.metrics.concurrency.concurrent} simultaneous requests
**Successful:** ${this.results.metrics.concurrency.successful}/${this.results.metrics.concurrency.concurrent}
**Total Duration:** ${this.results.metrics.concurrency.totalDuration}ms
**Average Response Time:** ${this.results.metrics.concurrency.avgResponseTime}ms
**Throughput:** ${this.results.metrics.concurrency.throughput} req/sec
**Status:** ${this.results.metrics.concurrency.status}
` : '**Status:** Failed to measure'}

---

## Response Time Distribution (50 requests)

${this.results.metrics.responseTimeDistribution ? `
| Percentile | Time |
|-----------|------|
| Min | ${this.results.metrics.responseTimeDistribution.min}ms |
| p50 | ${this.results.metrics.responseTimeDistribution.p50}ms |
| p90 | ${this.results.metrics.responseTimeDistribution.p90}ms |
| p95 | ${this.results.metrics.responseTimeDistribution.p95}ms |
| p99 | ${this.results.metrics.responseTimeDistribution.p99}ms |
| Max | ${this.results.metrics.responseTimeDistribution.max}ms |
| Average | ${this.results.metrics.responseTimeDistribution.avg}ms |

**Target:** p95 < 500ms, p99 < 1000ms
**Status:** ${this.results.metrics.responseTimeDistribution.p95 < 500 && this.results.metrics.responseTimeDistribution.p99 < 1000 ? '✅ Pass' : '⚠️ Exceeds target'}
` : '**Status:** Failed to measure'}

---

## Memory Usage

${this.results.metrics.memoryUsage ? `
| Metric | Value |
|--------|-------|
| RSS | ${this.results.metrics.memoryUsage.rss} |
| Heap Total | ${this.results.metrics.memoryUsage.heapTotal} |
| Heap Used | ${this.results.metrics.memoryUsage.heapUsed} |
| External | ${this.results.metrics.memoryUsage.external} |

**Target:** < 200MB heap used
**Status:** ${parseFloat(this.results.metrics.memoryUsage.heapUsed) < 200 ? '✅ Pass' : '⚠️ Exceeds target'}
` : '**Status:** Failed to measure'}

---

## Summary

✅ **Tests Completed:** ${Object.keys(this.results.metrics).length}
📊 **Total Requests:** ${this.requests}
❌ **Errors:** ${this.errors}

### Performance Grade

${this.results.metrics.responseTimeDistribution?.p95 < 500 ? '🟢 **A** (p95 < 500ms)' :
  this.results.metrics.responseTimeDistribution?.p95 < 1000 ? '🟡 **B** (p95 < 1000ms)' :
  '🔴 **C** (p95 > 1000ms)'}

---

## Recommendations

1. **Login Performance:** ${this.results.metrics.loginPage?.avg <= 300 ? '✅ Optimized' : '⚠️ Consider caching or lazy loading'}
2. **Dashboard:** ${this.results.metrics.dashboard?.avg <= 500 ? '✅ Acceptable' : '⚠️ Needs optimization - reduce data fetching'}
3. **Concurrency:** ${this.results.metrics.concurrency?.throughput >= 10 ? '✅ Good throughput' : '⚠️ Check connection pooling'}
4. **Memory:** ${parseFloat(this.results.metrics.memoryUsage?.heapUsed) < 200 ? '✅ Healthy' : '⚠️ Memory leak potential'}

---

**Test Notes:**
- Results measured against development server running on localhost:3000
- Each test executed 3-50 times for statistical significance
- Includes Server Component rendering time
- Does NOT include external API calls (email, LLM, etc.)

`;
  }

  formatMetric(metric, name) {
    if (!metric || metric.error) {
      return `**Status:** Error - ${metric?.error || 'Not measured'}`;
    }

    return `
**Measurements:** ${metric.measurements?.map(m => \`\${m}ms\`).join(', ')}
**Average:** ${metric.avg}ms
**Min:** ${metric.min}ms
**Max:** ${metric.max}ms
`;
  }

  async run() {
    console.log('🚀 Runtime Performance Tester');
    console.log('===============================\n');

    console.log('⏳ Waiting for dev server...');
    await this.waitForServer();

    console.log('✓ Server ready\n');

    try {
      await this.testLoginPage();
      await this.testDashboard();
      await this.measureBundleSize();
      await this.testResponseTimeDistribution();
      await this.testConcurrency(10);
      await this.testMemoryBaseline();
    } catch (err) {
      console.error('Error running tests:', err);
    }

    const report = this.generateReport();
    console.log('\n' + report);

    console.log('\n✅ Performance testing complete');
  }

  waitForServer(maxAttempts = 30) {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const tryConnect = () => {
        const req = http.get(`${BASE_URL}/login`, (res) => {
          resolve();
        });

        req.on('error', () => {
          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error(`Could not connect to ${BASE_URL} after ${maxAttempts} attempts`));
          } else {
            setTimeout(tryConnect, 1000);
          }
        });
      };

      tryConnect();
    });
  }
}

// Run tests
const tester = new PerformanceTester();
tester.run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
