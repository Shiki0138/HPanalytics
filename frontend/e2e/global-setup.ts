import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...');

  // Create a browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');
    
    // Check frontend
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:3000', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Check backend health
    const backendUrl = process.env.E2E_BACKEND_URL || 'http://localhost:8000';
    try {
      const response = await page.request.get(`${backendUrl}/api/health`);
      if (!response.ok()) {
        throw new Error(`Backend health check failed: ${response.status()}`);
      }
      console.log('✅ Backend is ready');
    } catch (error) {
      console.warn('⚠️  Backend health check failed, continuing anyway');
    }

    // Setup test data
    await setupTestData(page);

    console.log('✅ E2E test setup completed successfully');

  } catch (error) {
    console.error('❌ E2E test setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function setupTestData(page: any) {
  console.log('📝 Setting up test data...');

  const backendUrl = process.env.E2E_BACKEND_URL || 'http://localhost:8000';

  // Create test users
  const testUsers = [
    {
      email: 'e2e-user@example.com',
      password: 'E2ETestPass123!',
      name: 'E2E Test User',
      role: 'USER'
    },
    {
      email: 'e2e-admin@example.com',
      password: 'E2EAdminPass123!',
      name: 'E2E Test Admin',
      role: 'ADMIN'
    }
  ];

  for (const user of testUsers) {
    try {
      const response = await page.request.post(`${backendUrl}/api/auth/register`, {
        data: user
      });
      
      if (response.ok()) {
        console.log(`✅ Created test user: ${user.email}`);
      } else if (response.status() === 400) {
        // User might already exist, try to login to verify
        const loginResponse = await page.request.post(`${backendUrl}/api/auth/login`, {
          data: { email: user.email, password: user.password }
        });
        
        if (loginResponse.ok()) {
          console.log(`✅ Test user already exists: ${user.email}`);
        } else {
          console.warn(`⚠️  Could not create or verify user: ${user.email}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to setup user ${user.email}:`, error);
    }
  }

  // Setup test sites for the test user
  try {
    // First login as test user to get auth token
    const loginResponse = await page.request.post(`${backendUrl}/api/auth/login`, {
      data: {
        email: 'e2e-user@example.com',
        password: 'E2ETestPass123!'
      }
    });

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      const authToken = loginData.tokens?.accessToken;

      if (authToken) {
        // Create test site
        const siteResponse = await page.request.post(`${backendUrl}/api/sites`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          data: {
            name: 'E2E Test Site',
            domain: 'e2e-test.example.com',
            description: 'Site created for E2E testing'
          }
        });

        if (siteResponse.ok()) {
          console.log('✅ Created test site');
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Failed to setup test site:', error);
  }

  console.log('✅ Test data setup completed');
}

export default globalSetup;