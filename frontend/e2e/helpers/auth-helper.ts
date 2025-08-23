import { Page, BrowserContext } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    await this.page.goto('/login');
    
    // Wait for login form to be visible
    await this.page.waitForSelector('form', { state: 'visible' });
    
    // Fill login form
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    
    // Submit form
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for navigation to dashboard
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Verify login success
    await this.page.waitForSelector('[data-testid="user-menu"]', { 
      state: 'visible',
      timeout: 5000 
    });
  }

  /**
   * Register new user
   */
  async register(email: string, password: string, name: string) {
    await this.page.goto('/register');
    
    // Wait for registration form
    await this.page.waitForSelector('form', { state: 'visible' });
    
    // Fill registration form
    await this.page.fill('[data-testid="name-input"]', name);
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.fill('[data-testid="confirm-password-input"]', password);
    
    // Submit form
    await this.page.click('[data-testid="register-button"]');
    
    // Wait for success message or redirect
    await this.page.waitForSelector('[data-testid="registration-success"]', {
      state: 'visible',
      timeout: 10000
    });
  }

  /**
   * Logout current user
   */
  async logout() {
    // Click user menu
    await this.page.click('[data-testid="user-menu"]');
    
    // Wait for dropdown menu
    await this.page.waitForSelector('[data-testid="logout-button"]', { 
      state: 'visible' 
    });
    
    // Click logout
    await this.page.click('[data-testid="logout-button"]');
    
    // Wait for redirect to login page
    await this.page.waitForURL('/login', { timeout: 10000 });
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="user-menu"]', { 
        state: 'visible',
        timeout: 2000 
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current user info from the UI
   */
  async getCurrentUserInfo() {
    await this.page.click('[data-testid="user-menu"]');
    
    const userName = await this.page.textContent('[data-testid="user-name"]');
    const userEmail = await this.page.textContent('[data-testid="user-email"]');
    
    // Close menu by clicking elsewhere
    await this.page.click('body');
    
    return {
      name: userName?.trim(),
      email: userEmail?.trim()
    };
  }

  /**
   * Login as test user (using pre-created test account)
   */
  async loginAsTestUser() {
    await this.login('e2e-user@example.com', 'E2ETestPass123!');
  }

  /**
   * Login as test admin (using pre-created admin account)
   */
  async loginAsTestAdmin() {
    await this.login('e2e-admin@example.com', 'E2EAdminPass123!');
  }

  /**
   * Setup authenticated context for API calls
   */
  async setupAuthenticatedContext(context: BrowserContext, email: string, password: string) {
    const baseURL = this.page.url().split('/')[0] + '//' + this.page.url().split('/')[2];
    const backendUrl = process.env.E2E_BACKEND_URL || 'http://localhost:8000';

    // Get auth token via API
    const response = await context.request.post(`${backendUrl}/api/auth/login`, {
      data: { email, password }
    });

    if (response.ok()) {
      const data = await response.json();
      const token = data.tokens?.accessToken;

      if (token) {
        // Set authorization header for future requests
        await context.setExtraHTTPHeaders({
          'Authorization': `Bearer ${token}`
        });
        
        return token;
      }
    }

    throw new Error('Failed to setup authenticated context');
  }

  /**
   * Clear authentication
   */
  async clearAuth() {
    // Clear cookies and local storage
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Wait for authentication to complete
   */
  async waitForAuthComplete() {
    // Wait for either login page or dashboard
    await Promise.race([
      this.page.waitForURL('/login'),
      this.page.waitForURL('/dashboard'),
      this.page.waitForSelector('[data-testid="user-menu"]', { 
        state: 'visible',
        timeout: 10000 
      })
    ]);
  }

  /**
   * Handle authentication errors
   */
  async handleAuthError() {
    const errorMessage = await this.page.textContent('[data-testid="error-message"]');
    if (errorMessage) {
      throw new Error(`Authentication error: ${errorMessage}`);
    }
  }

  /**
   * Verify access to protected route
   */
  async verifyProtectedAccess(route: string) {
    await this.page.goto(route);
    
    // Should not be redirected to login if authenticated
    const currentUrl = this.page.url();
    if (currentUrl.includes('/login')) {
      throw new Error(`Access to ${route} was denied - redirected to login`);
    }
    
    // Wait for page content to load
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify redirect to login for unauthenticated access
   */
  async verifyUnauthenticatedRedirect(route: string) {
    await this.page.goto(route);
    
    // Should be redirected to login
    await this.page.waitForURL('/login', { timeout: 5000 });
  }
}