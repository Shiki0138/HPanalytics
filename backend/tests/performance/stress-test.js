import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for stress testing
const errorRate = new Rate('stress_error_rate');
const responseTime = new Trend('stress_response_time');
const requestCount = new Counter('stress_request_count');

// Stress test configuration - more aggressive than load test
export const options = {
  stages: [
    // Aggressive ramp up to stress the system
    { duration: '1m', target: 50 },    // Quick ramp to 50 users
    { duration: '2m', target: 200 },   // Stress with 200 users
    { duration: '5m', target: 500 },   // High stress with 500 users
    { duration: '3m', target: 800 },   // Peak stress with 800 users
    { duration: '10m', target: 1000 }, // Maximum stress with 1000 users
    { duration: '5m', target: 500 },   // Scale down
    { duration: '2m', target: 200 },   // Further scale down
    { duration: '1m', target: 0 },     // Cool down
  ],
  thresholds: {
    // More lenient thresholds for stress testing
    http_req_duration: ['p(95)<10000'],        // 95% under 10s (stress conditions)
    http_req_duration: ['p(99)<30000'],        // 99% under 30s (stress conditions)
    http_req_failed: ['rate<0.20'],            // Error rate under 20% (acceptable under stress)
    stress_error_rate: ['rate<0.25'],          // Custom error rate under 25%
    stress_response_time: ['p(95)<15000'],     // 95th percentile under 15s
    stress_request_count: ['count>5000'],      // At least 5000 requests total
  },
  noConnectionReuse: false,
  userAgent: 'K6 Stress Test Agent',
  discardResponseBodies: true, // Save memory during stress test
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Stress test users with heavier load patterns
const STRESS_TEST_USERS = [
  { email: 'stress-user1@example.com', password: 'StressTest123!' },
  { email: 'stress-user2@example.com', password: 'StressTest123!' },
  { email: 'stress-user3@example.com', password: 'StressTest123!' },
  { email: 'stress-user4@example.com', password: 'StressTest123!' },
  { email: 'stress-user5@example.com', password: 'StressTest123!' },
];

export function setup() {
  console.log('💥 Starting K6 stress testing...');
  console.log(`📍 Target URL: ${BASE_URL}`);
  console.log('⚠️  This will apply significant load to the system');
  
  // Create stress test users
  STRESS_TEST_USERS.forEach((user, index) => {
    const registerResponse = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
      email: user.email,
      password: user.password,
      name: `Stress Test User ${index + 1}`,
    }), {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s', // Longer timeout for setup
    });
    
    if (registerResponse.status === 201 || registerResponse.status === 400) {
      console.log(`✅ Setup stress user: ${user.email}`);
    }
  });
  
  return {};
}

export default function() {
  const user = STRESS_TEST_USERS[Math.floor(Math.random() * STRESS_TEST_USERS.length)];
  let authToken = '';

  group('Stress Test - Authentication', () => {
    const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password,
    }), {
      headers: { 'Content-Type': 'application/json' },
      timeout: '10s',
      tags: { name: 'stress_login' }
    });

    const loginSuccess = check(loginResponse, {
      'stress login not 500': (r) => r.status !== 500, // Don't fail on overload
      'stress login response time < 10s': (r) => r.timings.duration < 10000,
    });

    if (loginResponse.status === 200) {
      try {
        const loginData = JSON.parse(loginResponse.body);
        authToken = loginData.tokens.accessToken;
      } catch (e) {
        // Ignore JSON parsing errors under stress
      }
    }

    errorRate.add(!loginSuccess);
    responseTime.add(loginResponse.timings.duration);
    requestCount.add(1);
  });

  if (authToken) {
    // Stress test multiple endpoints simultaneously
    group('Stress Test - Multiple Endpoints', () => {
      const requests = [
        { url: `${BASE_URL}/api/dashboard`, name: 'stress_dashboard' },
        { url: `${BASE_URL}/api/analytics/overview`, name: 'stress_analytics' },
        { url: `${BASE_URL}/api/sites`, name: 'stress_sites' },
        { url: `${BASE_URL}/api/users/profile`, name: 'stress_profile' },
      ];

      // Fire multiple requests concurrently to stress the system
      const responses = http.batch(requests.map(req => ({
        method: 'GET',
        url: req.url,
        params: {
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: '15s',
          tags: { name: req.name }
        }
      })));

      responses.forEach((response, index) => {
        const requestName = requests[index].name;
        
        const success = check(response, {
          [`${requestName} not server error`]: (r) => r.status < 500,
          [`${requestName} response time under 15s`]: (r) => r.timings.duration < 15000,
        });

        errorRate.add(!success);
        responseTime.add(response.timings.duration);
        requestCount.add(1);
      });
    });

    // Heavy data operations to stress database and processing
    group('Stress Test - Heavy Operations', () => {
      // Create multiple sites rapidly
      for (let i = 0; i < 3; i++) {
        const createResponse = http.post(`${BASE_URL}/api/sites`, JSON.stringify({
          name: `Stress Site ${Date.now()}-${i}`,
          domain: `stress-${Date.now()}-${i}.example.com`,
          description: 'Site created during stress testing',
        }), {
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: '20s',
          tags: { name: 'stress_create_site' }
        });

        check(createResponse, {
          'stress create site not timeout': (r) => r.status !== 0,
          'stress create site response time < 20s': (r) => r.timings.duration < 20000,
        });

        requestCount.add(1);
      }

      // Heavy analytics requests
      const analyticsEndpoints = [
        '/api/analytics/detailed',
        '/api/analytics/visitors',
        '/api/analytics/pageviews',
        '/api/analytics/events',
      ];

      analyticsEndpoints.forEach(endpoint => {
        const response = http.get(`${BASE_URL}${endpoint}`, {
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: '30s',
          tags: { name: 'stress_analytics_heavy' }
        });

        check(response, {
          'stress analytics heavy not timeout': (r) => r.status !== 0,
          'stress analytics heavy response time < 30s': (r) => r.timings.duration < 30000,
        });

        requestCount.add(1);
      });
    });
  }

  // Aggressive user simulation - minimal think time
  sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6 seconds (very aggressive)
}

export function teardown(data) {
  console.log('🧹 K6 stress test teardown...');
  console.log('💥 Stress test completed');
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs.count;
  const failedRequests = data.metrics.http_req_failed.count;
  const errorRate = (failedRequests / totalRequests * 100).toFixed(2);
  const avgResponseTime = Math.round(data.metrics.http_req_duration.avg);
  const p95ResponseTime = Math.round(data.metrics.http_req_duration['p(95)']);
  const p99ResponseTime = Math.round(data.metrics.http_req_duration['p(99)']);

  console.log('💥 Stress Test Summary:');
  console.log(`   🔥 Peak VUs: ${data.metrics.vus_max.max}`);
  console.log(`   📊 Total Requests: ${totalRequests}`);
  console.log(`   ❌ Failed Requests: ${failedRequests} (${errorRate}%)`);
  console.log(`   ⏱️  Average Response Time: ${avgResponseTime}ms`);
  console.log(`   📈 95th Percentile: ${p95ResponseTime}ms`);
  console.log(`   📈 99th Percentile: ${p99ResponseTime}ms`);

  // Determine stress test results
  let stressTestStatus = '✅ PASSED';
  if (errorRate > 25) {
    stressTestStatus = '❌ FAILED - High error rate';
  } else if (p95ResponseTime > 15000) {
    stressTestStatus = '⚠️  WARNING - High response times';
  } else if (errorRate > 10) {
    stressTestStatus = '⚠️  WARNING - Elevated error rate';
  }

  console.log(`   🎯 Stress Test Result: ${stressTestStatus}`);

  return {
    'stress-test-report.json': JSON.stringify(data, null, 2),
    'stress-test-summary.html': generateStressTestReport(data),
  };
}

function generateStressTestReport(data) {
  const totalRequests = data.metrics.http_reqs.count;
  const failedRequests = data.metrics.http_req_failed.count;
  const errorRate = (failedRequests / totalRequests * 100).toFixed(2);
  const avgResponseTime = Math.round(data.metrics.http_req_duration.avg);
  const p95ResponseTime = Math.round(data.metrics.http_req_duration['p(95)']);
  const maxVUs = data.metrics.vus_max.max;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K6 Stress Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f8f9fa; }
        .header { background: linear-gradient(135deg, #ff6b6b, #ff8e8e); color: white; padding: 30px; border-radius: 12px; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; border: 1px solid #ddd; padding: 20px; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .metric-title { font-weight: bold; color: #333; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; }
        .metric-value { font-size: 32px; font-weight: bold; }
        .passed { color: #28a745; } .failed { color: #dc3545; } .warning { color: #ffc107; }
        .stress-indicator { font-size: 48px; text-align: center; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border-radius: 8px; overflow: hidden; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>💥 K6 Stress Test Report</h1>
        <p><strong>Maximum Load:</strong> ${maxVUs} concurrent users</p>
        <p><strong>Test Duration:</strong> ${Math.round(data.state.testRunDurationMs / 1000)}s</p>
        <p><strong>Test Type:</strong> High-intensity stress testing</p>
    </div>

    <div class="alert">
        <strong>⚠️ Stress Test Notice:</strong> This test applies extreme load to identify system breaking points. 
        Higher error rates and response times are expected under stress conditions.
    </div>

    <div class="stress-indicator">
        ${errorRate > 25 ? '🔴' : errorRate > 10 ? '🟡' : '🟢'}
    </div>

    <div class="metrics">
        <div class="metric-card">
            <div class="metric-title">🔥 Peak Concurrent Users</div>
            <div class="metric-value warning">${maxVUs}</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">📊 Total Requests</div>
            <div class="metric-value">${totalRequests}</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">❌ Error Rate</div>
            <div class="metric-value ${errorRate > 25 ? 'failed' : errorRate > 10 ? 'warning' : 'passed'}">${errorRate}%</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">⏱️ Average Response Time</div>
            <div class="metric-value ${avgResponseTime > 5000 ? 'warning' : 'passed'}">${avgResponseTime}ms</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">📈 95th Percentile</div>
            <div class="metric-value ${p95ResponseTime > 15000 ? 'failed' : p95ResponseTime > 5000 ? 'warning' : 'passed'}">${p95ResponseTime}ms</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">🚀 Request Rate</div>
            <div class="metric-value passed">${Math.round(data.metrics.http_reqs.rate * 10) / 10}/s</div>
        </div>
    </div>

    <h2>🎯 Stress Test Results</h2>
    <table>
        <tr><th>Metric</th><th>Value</th><th>Threshold</th><th>Status</th></tr>
        <tr>
            <td>Error Rate</td>
            <td>${errorRate}%</td>
            <td>&lt; 25%</td>
            <td class="${errorRate > 25 ? 'failed' : 'passed'}">
                ${errorRate > 25 ? '❌ EXCEEDED' : '✅ WITHIN LIMITS'}
            </td>
        </tr>
        <tr>
            <td>95th Percentile Response Time</td>
            <td>${p95ResponseTime}ms</td>
            <td>&lt; 15s</td>
            <td class="${p95ResponseTime > 15000 ? 'failed' : 'passed'}">
                ${p95ResponseTime > 15000 ? '❌ EXCEEDED' : '✅ WITHIN LIMITS'}
            </td>
        </tr>
        <tr>
            <td>Peak Concurrent Users</td>
            <td>${maxVUs}</td>
            <td>1000</td>
            <td class="passed">✅ ACHIEVED</td>
        </tr>
        <tr>
            <td>Total Requests</td>
            <td>${totalRequests}</td>
            <td>&gt; 5000</td>
            <td class="${totalRequests > 5000 ? 'passed' : 'failed'}">
                ${totalRequests > 5000 ? '✅ ACHIEVED' : '❌ BELOW TARGET'}
            </td>
        </tr>
    </table>

    <h2>📋 Stress Test Assessment</h2>
    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 5px solid ${errorRate > 25 ? '#dc3545' : errorRate > 10 ? '#ffc107' : '#28a745'};">
        <h3>System Behavior Under Stress:</h3>
        <ul>
            <li><strong>Load Capacity:</strong> System handled up to ${maxVUs} concurrent users</li>
            <li><strong>Failure Rate:</strong> ${errorRate}% of requests failed under peak load</li>
            <li><strong>Performance Degradation:</strong> ${p95ResponseTime > 5000 ? 'Significant' : 'Acceptable'} response time increase</li>
            <li><strong>System Stability:</strong> ${errorRate < 50 ? 'System remained operational' : 'System experienced significant stress'}</li>
        </ul>
        
        <h3>Recommendations:</h3>
        <ul>
            ${errorRate > 25 ? '<li>🔴 <strong>Critical:</strong> High error rate indicates system overload. Consider scaling resources.</li>' : ''}
            ${p95ResponseTime > 10000 ? '<li>🟡 <strong>Warning:</strong> High response times suggest performance bottlenecks.</li>' : ''}
            ${errorRate < 10 && p95ResponseTime < 5000 ? '<li>🟢 <strong>Good:</strong> System handled stress well. Consider testing higher loads.</li>' : ''}
            <li>📊 Monitor resource utilization during peak load periods</li>
            <li>🔧 Consider implementing circuit breakers and rate limiting</li>
        </ul>
    </div>

    <footer style="margin-top: 40px; padding: 20px; background: #343a40; color: white; border-radius: 8px;">
        <p><strong>💥 Stress Test Completed</strong></p>
        <p>This stress test pushed the system beyond normal operating conditions to identify breaking points and assess resilience.</p>
        <p>Generated by K6 Stress Testing Suite - ${new Date().toISOString()}</p>
    </footer>
</body>
</html>`;
}