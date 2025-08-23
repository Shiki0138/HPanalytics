module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/login',
        'http://localhost:3000/register',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/settings',
      ],
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'ready on',
      startServerTimeout: 60000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        skipAudits: [
          'screenshot-thumbnails',
          'final-screenshot',
        ],
        throttling: {
          rttMs: 40,
          throughputKbps: 11024,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 11024,
          uploadThroughputKbps: 1024,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        
        // Performance metrics
        'audits:first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'audits:largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'audits:first-meaningful-paint': ['warn', { maxNumericValue: 2000 }],
        'audits:speed-index': ['warn', { maxNumericValue: 3000 }],
        'audits:interactive': ['warn', { maxNumericValue: 3500 }],
        'audits:total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'audits:cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        
        // Best practices
        'audits:uses-https': 'error',
        'audits:uses-http2': 'warn',
        'audits:no-vulnerable-libraries': 'error',
        'audits:csp-xss': 'warn',
        
        // Accessibility
        'audits:color-contrast': 'error',
        'audits:html-has-lang': 'error',
        'audits:html-lang-valid': 'error',
        'audits:meta-description': 'warn',
        'audits:document-title': 'error',
        
        // Performance optimizations
        'audits:unused-css-rules': 'warn',
        'audits:unused-javascript': 'warn',
        'audits:modern-image-formats': 'warn',
        'audits:efficient-animated-content': 'warn',
        'audits:preload-lcp-image': 'warn',
        'audits:render-blocking-resources': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
    server: {
      port: 9001,
      storage: './lighthouse-reports',
    },
  },
};