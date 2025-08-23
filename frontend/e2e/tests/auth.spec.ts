import { test, expect, Page } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

test.describe('Authentication Flow', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    // Clear any existing authentication
    await authHelper.clearAuth();
  });

  test.describe('User Registration', () => {
    test('should register a new user successfully', async ({ page }) => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      
      await page.goto('/register');

      // Fill registration form
      await page.fill('[data-testid="name-input"]', 'Test User');
      await page.fill('[data-testid="email-input"]', uniqueEmail);
      await page.fill('[data-testid="password-input"]', 'TestPass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'TestPass123!');

      // Submit form
      await page.click('[data-testid="register-button"]');

      // Verify success
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
      
      // Check success message
      const successMessage = await page.textContent('[data-testid="success-message"]');
      expect(successMessage).toContain('successfully');
    });

    test('should show validation errors for invalid data', async ({ page }) => {
      await page.goto('/register');

      // Try to submit with empty form
      await page.click('[data-testid="register-button"]');

      // Check for validation errors
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto('/register');

      // Fill form with weak password
      await page.fill('[data-testid="name-input"]', 'Test User');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'weak');
      await page.fill('[data-testid="confirm-password-input"]', 'weak');

      await page.click('[data-testid="register-button"]');

      // Check for password strength error
      const errorMessage = await page.textContent('[data-testid="password-error"]');
      expect(errorMessage).toContain('Password must');
    });

    test('should validate password confirmation', async ({ page }) => {
      await page.goto('/register');

      // Fill form with mismatched passwords
      await page.fill('[data-testid="name-input"]', 'Test User');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentPass123!');

      await page.click('[data-testid="register-button"]');

      // Check for confirmation error
      const errorMessage = await page.textContent('[data-testid="confirm-password-error"]');
      expect(errorMessage).toContain('match');
    });

    test('should prevent duplicate email registration', async ({ page }) => {
      await page.goto('/register');

      // Try to register with existing test user email
      await page.fill('[data-testid="name-input"]', 'Duplicate User');
      await page.fill('[data-testid="email-input"]', 'e2e-user@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPass123!');
      await page.fill('[data-testid="confirm-password-input"]', 'TestPass123!');

      await page.click('[data-testid="register-button"]');

      // Check for error message
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).toContain('already exists');
    });
  });

  test.describe('User Login', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      await authHelper.loginAsTestUser();

      // Verify we're redirected to dashboard
      expect(page.url()).toContain('/dashboard');
      
      // Verify user menu is visible
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // Verify user info
      const userInfo = await authHelper.getCurrentUserInfo();
      expect(userInfo.email).toBe('e2e-user@example.com');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Try login with invalid credentials
      await page.fill('[data-testid="email-input"]', 'invalid@example.com');
      await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
      await page.click('[data-testid="login-button"]');

      // Check for error message
      const errorMessage = await page.textContent('[data-testid="error-message"]');
      expect(errorMessage).toContain('Invalid');
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login');

      // Try to submit empty form
      await page.click('[data-testid="login-button"]');

      // Check for validation errors
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });

    test('should remember me functionality work', async ({ page, context }) => {
      await page.goto('/login');

      // Login with remember me checked
      await page.fill('[data-testid="email-input"]', 'e2e-user@example.com');
      await page.fill('[data-testid="password-input"]', 'E2ETestPass123!');
      await page.check('[data-testid="remember-me"]');
      await page.click('[data-testid="login-button"]');

      // Wait for dashboard
      await page.waitForURL('/dashboard');

      // Close current page and open new one to test persistence
      const newPage = await context.newPage();
      await newPage.goto('/dashboard');

      // Should still be logged in
      await expect(newPage.locator('[data-testid="user-menu"]')).toBeVisible();
      
      await newPage.close();
    });
  });

  test.describe('User Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each logout test
      await authHelper.loginAsTestUser();
    });

    test('should logout successfully', async ({ page }) => {
      // Logout
      await authHelper.logout();

      // Verify redirect to login page
      expect(page.url()).toContain('/login');

      // Try to access protected page
      await page.goto('/dashboard');
      
      // Should be redirected back to login
      await page.waitForURL('/login');
    });

    test('should clear authentication state after logout', async ({ page }) => {
      await authHelper.logout();

      // Check that authentication tokens are cleared
      const localStorage = await page.evaluate(() => JSON.stringify(localStorage));
      const sessionStorage = await page.evaluate(() => JSON.stringify(sessionStorage));

      expect(localStorage).not.toContain('access_token');
      expect(localStorage).not.toContain('refresh_token');
      expect(sessionStorage).not.toContain('access_token');
      expect(sessionStorage).not.toContain('refresh_token');
    });
  });

  test.describe('Password Reset', () => {
    test('should initiate password reset', async ({ page }) => {
      await page.goto('/forgot-password');

      // Fill email
      await page.fill('[data-testid="email-input"]', 'e2e-user@example.com');
      await page.click('[data-testid="reset-button"]');

      // Check for success message
      const successMessage = await page.textContent('[data-testid="success-message"]');
      expect(successMessage).toContain('reset email sent');
    });

    test('should handle non-existent email gracefully', async ({ page }) => {
      await page.goto('/forgot-password');

      // Fill non-existent email
      await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
      await page.click('[data-testid="reset-button"]');

      // Should still show success message (for security)
      const successMessage = await page.textContent('[data-testid="success-message"]');
      expect(successMessage).toContain('reset email sent');
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/forgot-password');

      // Fill invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="reset-button"]');

      // Check for validation error
      const errorMessage = await page.textContent('[data-testid="email-error"]');
      expect(errorMessage).toContain('valid email');
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login for unauthenticated access', async ({ page }) => {
      const protectedRoutes = ['/dashboard', '/settings', '/sites'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await page.waitForURL('/login');
        expect(page.url()).toContain('/login');
      }
    });

    test('should allow access to protected routes when authenticated', async ({ page }) => {
      await authHelper.loginAsTestUser();

      const protectedRoutes = ['/dashboard', '/settings', '/sites'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        // Should not be redirected to login
        expect(page.url()).not.toContain('/login');
        // Wait for page to load
        await page.waitForLoadState('networkidle');
      }
    });

    test('should handle token expiration gracefully', async ({ page, context }) => {
      await authHelper.loginAsTestUser();

      // Simulate expired token by clearing storage
      await page.evaluate(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      });

      // Try to access protected route
      await page.goto('/dashboard');

      // Should be redirected to login
      await page.waitForURL('/login');
    });
  });

  test.describe('Admin Access', () => {
    test('should allow admin access to admin routes', async ({ page }) => {
      await authHelper.loginAsTestAdmin();

      // Try to access admin route
      await page.goto('/admin');

      // Should not be redirected
      expect(page.url()).toContain('/admin');
      
      // Wait for admin content to load
      await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    });

    test('should deny regular user access to admin routes', async ({ page }) => {
      await authHelper.loginAsTestUser();

      // Try to access admin route
      await page.goto('/admin');

      // Should show access denied or redirect
      const currentUrl = page.url();
      if (!currentUrl.includes('/admin')) {
        // Redirected away from admin
        expect(currentUrl).toContain('/dashboard');
      } else {
        // Stayed on admin but should show error
        await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
      }
    });
  });

  test.describe('Session Management', () => {
    test('should handle multiple tabs correctly', async ({ context }) => {
      // Login in first tab
      const page1 = await context.newPage();
      const authHelper1 = new AuthHelper(page1);
      await authHelper1.loginAsTestUser();

      // Open second tab and check authentication
      const page2 = await context.newPage();
      await page2.goto('/dashboard');
      
      // Should be automatically authenticated
      await expect(page2.locator('[data-testid="user-menu"]')).toBeVisible();

      // Logout from first tab
      await authHelper1.logout();

      // Refresh second tab - should be logged out
      await page2.reload();
      await page2.waitForURL('/login');

      await page1.close();
      await page2.close();
    });

    test('should handle concurrent sessions', async ({ browser }) => {
      // Create two different browser contexts (different users)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const authHelper1 = new AuthHelper(page1);
      const authHelper2 = new AuthHelper(page2);

      // Login with different users
      await authHelper1.loginAsTestUser();
      await authHelper2.loginAsTestAdmin();

      // Both should be authenticated
      await expect(page1.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page2.locator('[data-testid="user-menu"]')).toBeVisible();

      // Verify different user info
      const user1Info = await authHelper1.getCurrentUserInfo();
      const user2Info = await authHelper2.getCurrentUserInfo();

      expect(user1Info.email).toBe('e2e-user@example.com');
      expect(user2Info.email).toBe('e2e-admin@example.com');

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Security Features', () => {
    test('should handle CSP headers correctly', async ({ page }) => {
      await page.goto('/login');

      // Check that CSP headers don't break functionality
      await page.fill('[data-testid="email-input"]', 'e2e-user@example.com');
      await page.fill('[data-testid="password-input"]', 'E2ETestPass123!');
      await page.click('[data-testid="login-button"]');

      // Should still work despite CSP
      await page.waitForURL('/dashboard');
    });

    test('should prevent XSS attacks in forms', async ({ page }) => {
      await page.goto('/login');

      // Try to inject script
      const xssPayload = '<script>alert("xss")</script>';
      await page.fill('[data-testid="email-input"]', xssPayload);

      // Submit form
      await page.click('[data-testid="login-button"]');

      // Script should not execute (no alert dialog)
      const dialogs = [];
      page.on('dialog', dialog => {
        dialogs.push(dialog);
        dialog.dismiss();
      });

      await page.waitForTimeout(1000);
      expect(dialogs.length).toBe(0);
    });

    test('should have secure cookie settings', async ({ page, context }) => {
      await authHelper.loginAsTestUser();

      // Check cookies
      const cookies = await context.cookies();
      const authCookies = cookies.filter(cookie => 
        cookie.name.includes('token') || cookie.name.includes('session')
      );

      // Verify security settings
      authCookies.forEach(cookie => {
        expect(cookie.httpOnly).toBe(true);
        expect(cookie.secure).toBe(true);
        expect(cookie.sameSite).toBe('Strict');
      });
    });
  });
});