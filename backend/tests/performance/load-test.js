import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 10 },   // Warm up with 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '10m', target: 100 }, // Peak load with 100 users
    { duration: '5m', target: 50 },   // Scale down
    { duration: '2m', target: 0 },    // Cool down
  ],
  thresholds: {
    // Performance thresholds
    http_req_duration: ['p(95)<2000'],        // 95% of requests under 2s
    http_req_duration: ['p(99)<5000'],        // 99% of requests under 5s
    http_req_failed: ['rate<0.05'],           // Error rate under 5%
    error_rate: ['rate<0.05'],                // Custom error rate under 5%
    response_time: ['p(95)<2000'],            // 95th percentile under 2s
    request_count: ['count>1000'],            // At least 1000 requests total
    
    // Checks for specific endpoints
    'http_req_duration{name:login}': ['p(95)<1000'],
    'http_req_duration{name:dashboard}': ['p(95)<3000'],
    'http_req_duration{name:analytics}': ['p(95)<5000'],
  },
  noConnectionReuse: false,
  userAgent: 'K6 Performance Test Agent',
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Test data
const TEST_USERS = [
  { email: 'perf-user1@example.com', password: 'PerfTest123!' },
  { email: 'perf-user2@example.com', password: 'PerfTest123!' },
  { email: 'perf-user3@example.com', password: 'PerfTest123!' },
];

let authToken = '';

export function setup() {
  console.log('🚀 Starting K6 performance tests...');
  console.log(`📍 Target URL: ${BASE_URL}`);
  
  // Create test users for load testing
  const setupResults = {};
  
  TEST_USERS.forEach((user, index) => {
    const registerResponse = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
      email: user.email,
      password: user.password,
      name: `Performance Test User ${index + 1}`,
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'setup' }
    });
    
    if (registerResponse.status === 201 || registerResponse.status === 400) {
      console.log(`✅ Setup user: ${user.email}`);
    } else {
      console.warn(`⚠️  Failed to setup user: ${user.email} - Status: ${registerResponse.status}`);
    }
  });
  
  return setupResults;
}

export default function() {
  // Random user selection for each VU iteration
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
  
  group('User Authentication Flow', () => {
    // Login
    group('Login', () => {
      const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        email: user.email,
        password: user.password,
      }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'login' }
      });

      const loginSuccess = check(loginResponse, {
        'login status is 200': (r) => r.status === 200,
        'login response time < 1s': (r) => r.timings.duration < 1000,
        'login returns access token': (r) => {
          try {
            return JSON.parse(r.body).tokens?.accessToken !== undefined;
          } catch {
            return false;
          }
        },
      });

      if (loginSuccess && loginResponse.status === 200) {
        try {
          const loginData = JSON.parse(loginResponse.body);
          authToken = loginData.tokens.accessToken;
        } catch (e) {
          console.error('Failed to parse login response');
        }
      }

      errorRate.add(!loginSuccess);
      responseTime.add(loginResponse.timings.duration);
      requestCount.add(1);
    });

    if (!authToken) {
      console.error('❌ Failed to authenticate, skipping authenticated tests');
      return;
    }

    // Dashboard access
    group('Dashboard Access', () => {
      const dashboardResponse = http.get(`${BASE_URL}/api/dashboard`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        tags: { name: 'dashboard' }
      });

      const dashboardSuccess = check(dashboardResponse, {
        'dashboard status is 200': (r) => r.status === 200,
        'dashboard response time < 3s': (r) => r.timings.duration < 3000,
        'dashboard returns data': (r) => r.body.length > 0,
      });

      errorRate.add(!dashboardSuccess);
      responseTime.add(dashboardResponse.timings.duration);
      requestCount.add(1);
    });

    // Analytics API load test
    group('Analytics API', () => {
      const analyticsResponse = http.get(`${BASE_URL}/api/analytics/overview`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        tags: { name: 'analytics' }
      });

      const analyticsSuccess = check(analyticsResponse, {
        'analytics status is 200': (r) => r.status === 200,
        'analytics response time < 5s': (r) => r.timings.duration < 5000,
        'analytics returns metrics': (r) => {
          try {
            const data = JSON.parse(r.body);
            return data.metrics !== undefined;
          } catch {
            return false;
          }
        },
      });

      errorRate.add(!analyticsSuccess);
      responseTime.add(analyticsResponse.timings.duration);
      requestCount.add(1);
    });

    // Sites API
    group('Sites API', () => {
      const sitesResponse = http.get(`${BASE_URL}/api/sites`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        tags: { name: 'sites' }
      });

      check(sitesResponse, {
        'sites status is 200': (r) => r.status === 200,
        'sites response time < 2s': (r) => r.timings.duration < 2000,
      });

      requestCount.add(1);
    });

    // User profile
    group('User Profile', () => {
      const profileResponse = http.get(`${BASE_URL}/api/users/profile`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        tags: { name: 'profile' }
      });

      check(profileResponse, {
        'profile status is 200': (r) => r.status === 200,
        'profile response time < 1s': (r) => r.timings.duration < 1000,
      });

      requestCount.add(1);
    });
  });

  // Simulate read/write operations
  group('Data Operations', () => {
    if (Math.random() < 0.3) { // 30% chance to create a new site
      group('Create Site', () => {
        const createSiteResponse = http.post(`${BASE_URL}/api/sites`, JSON.stringify({
          name: `Load Test Site ${Date.now()}`,
          domain: `loadtest-${Date.now()}.example.com`,
          description: 'Site created during load testing',
        }), {
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          tags: { name: 'create_site' }
        });

        check(createSiteResponse, {
          'create site status is 201': (r) => r.status === 201,
          'create site response time < 2s': (r) => r.timings.duration < 2000,
        });

        requestCount.add(1);
      });
    }
  });

  // Simulate different user behaviors
  const userBehavior = Math.random();
  if (userBehavior < 0.2) {
    // Heavy analytics user (20%)
    group('Heavy Analytics Usage', () => {
      for (let i = 0; i < 3; i++) {
        const analyticsResponse = http.get(`${BASE_URL}/api/analytics/detailed`, {
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          tags: { name: 'heavy_analytics' }
        });

        check(analyticsResponse, {
          'heavy analytics response time < 10s': (r) => r.timings.duration < 10000,
        });

        requestCount.add(1);
        sleep(1); // 1 second between requests
      }
    });
  } else if (userBehavior < 0.5) {
    // Dashboard browser (30%)
    group('Dashboard Browsing', () => {
      const endpoints = [
        '/api/analytics/visitors',
        '/api/analytics/pageviews',
        '/api/analytics/events',
      ];

      endpoints.forEach(endpoint => {
        const response = http.get(`${BASE_URL}${endpoint}`, {
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          tags: { name: 'dashboard_browsing' }
        });

        check(response, {
          'dashboard browsing response time < 3s': (r) => r.timings.duration < 3000,
        });

        requestCount.add(1);
      });
    });
  }

  // Random sleep to simulate user think time
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

export function teardown(data) {
  console.log('🧹 K6 performance test teardown...');
  console.log('📊 Performance test completed successfully');
}

export function handleSummary(data) {
  console.log('📈 Performance Test Summary:');
  console.log(`   Total Requests: ${data.metrics.http_reqs.count}`);
  console.log(`   Failed Requests: ${data.metrics.http_req_failed.count}`);
  console.log(`   Average Response Time: ${data.metrics.http_req_duration.avg}ms`);
  console.log(`   95th Percentile: ${data.metrics.http_req_duration['p(95)']}ms`);
  console.log(`   99th Percentile: ${data.metrics.http_req_duration['p(99)']}ms`);
  
  return {
    'performance-report.json': JSON.stringify(data, null, 2),
    'performance-summary.html': generateHTMLReport(data),
  };
}

function generateHTMLReport(data) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K6 Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-title { font-weight: bold; color: #333; margin-bottom: 10px; }
        .metric-value { font-size: 24px; color: #2196F3; }
        .passed { color: #4CAF50; } .failed { color: #f44336; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 K6 Performance Test Report</h1>
        <p><strong>Test Duration:</strong> ${Math.round(data.state.testRunDurationMs / 1000)}s</p>
        <p><strong>Total VUs:</strong> ${data.metrics.vus_max.max}</p>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
    </div>

    <div class="metrics">
        <div class="metric-card">
            <div class="metric-title">Total Requests</div>
            <div class="metric-value">${data.metrics.http_reqs.count}</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">Failed Requests</div>
            <div class="metric-value ${data.metrics.http_req_failed.count > 0 ? 'failed' : 'passed'}">${data.metrics.http_req_failed.count}</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">Average Response Time</div>
            <div class="metric-value">${Math.round(data.metrics.http_req_duration.avg)}ms</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">95th Percentile</div>
            <div class="metric-value">${Math.round(data.metrics.http_req_duration['p(95)'])}ms</div>
        </div>
    </div>

    <h2>📊 Detailed Metrics</h2>
    <table>
        <tr><th>Metric</th><th>Average</th><th>Min</th><th>Max</th><th>95th %ile</th><th>Status</th></tr>
        <tr>
            <td>HTTP Request Duration</td>
            <td>${Math.round(data.metrics.http_req_duration.avg)}ms</td>
            <td>${Math.round(data.metrics.http_req_duration.min)}ms</td>
            <td>${Math.round(data.metrics.http_req_duration.max)}ms</td>
            <td>${Math.round(data.metrics.http_req_duration['p(95)'])}ms</td>
            <td class="${data.metrics.http_req_duration['p(95)'] < 2000 ? 'passed' : 'failed'}">
                ${data.metrics.http_req_duration['p(95)'] < 2000 ? '✅ PASS' : '❌ FAIL'}
            </td>
        </tr>
        <tr>
            <td>Request Rate</td>
            <td>${Math.round(data.metrics.http_reqs.rate * 10) / 10}/s</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td class="passed">✅ INFO</td>
        </tr>
    </table>

    <h2>🎯 Threshold Results</h2>
    <table>
        <tr><th>Threshold</th><th>Result</th><th>Status</th></tr>
        ${Object.entries(data.thresholds || {}).map(([name, result]) => `
            <tr>
                <td>${name}</td>
                <td>${result.ok ? result.ok : 'N/A'}</td>
                <td class="${result.ok ? 'passed' : 'failed'}">
                    ${result.ok ? '✅ PASS' : '❌ FAIL'}
                </td>
            </tr>
        `).join('')}
    </table>

    <footer style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <p><strong>Performance Test Completed</strong></p>
        <p>Generated by K6 Performance Testing Suite</p>
    </footer>
</body>
</html>`;
}