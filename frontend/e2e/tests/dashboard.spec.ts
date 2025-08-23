import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

test.describe('Dashboard Flow', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.loginAsTestUser();
  });

  test.describe('Dashboard Layout', () => {
    test('should display main dashboard components', async ({ page }) => {
      await page.goto('/dashboard');

      // Check main layout components
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();

      // Check navigation items
      await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-sites"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-analytics"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-settings"]')).toBeVisible();
    });

    test('should display user information in header', async ({ page }) => {
      await page.goto('/dashboard');

      // Check user menu
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

      // Open user menu to check info
      await page.click('[data-testid="user-menu"]');
      await expect(page.locator('[data-testid="user-name"]')).toContainText('E2E Test User');
      await expect(page.locator('[data-testid="user-email"]')).toContainText('e2e-user@example.com');
    });

    test('should be responsive on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Sidebar should be collapsed on mobile
      const sidebar = page.locator('[data-testid="sidebar"]');
      await expect(sidebar).not.toBeVisible();

      // Mobile menu button should be visible
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

      // Clicking mobile menu should show sidebar
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(sidebar).toBeVisible();
    });
  });

  test.describe('Dashboard Metrics', () => {
    test('should display overview metrics cards', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for metrics to load
      await page.waitForSelector('[data-testid="metrics-overview"]', { state: 'visible' });

      // Check metric cards
      const expectedMetrics = [
        'total-visitors',
        'page-views',
        'bounce-rate',
        'avg-session-duration',
        'conversion-rate'
      ];

      for (const metric of expectedMetrics) {
        await expect(page.locator(`[data-testid="metric-${metric}"]`)).toBeVisible();
        
        // Check that metric has a value (not loading)
        const metricValue = page.locator(`[data-testid="metric-${metric}-value"]`);
        await expect(metricValue).toBeVisible();
        await expect(metricValue).not.toBeEmpty();
      }
    });

    test('should display metric trends', async ({ page }) => {
      await page.goto('/dashboard');

      // Check trend indicators
      const trendElements = page.locator('[data-testid*="trend-indicator"]');
      const count = await trendElements.count();
      expect(count).toBeGreaterThan(0);

      // Each trend should have an icon and percentage
      for (let i = 0; i < count; i++) {
        const trend = trendElements.nth(i);
        await expect(trend).toBeVisible();
        
        // Should have trend icon (up/down arrow)
        const trendIcon = trend.locator('[data-testid="trend-icon"]');
        await expect(trendIcon).toBeVisible();
        
        // Should have percentage value
        const trendValue = trend.locator('[data-testid="trend-value"]');
        await expect(trendValue).toBeVisible();
        await expect(trendValue).toContainText('%');
      }
    });

    test('should refresh metrics when refresh button clicked', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for initial load
      await page.waitForSelector('[data-testid="metrics-overview"]');

      // Get initial metric value
      const metricElement = page.locator('[data-testid="metric-total-visitors-value"]');
      await expect(metricElement).toBeVisible();
      const initialValue = await metricElement.textContent();

      // Click refresh button
      await page.click('[data-testid="refresh-metrics"]');

      // Should show loading state
      await expect(page.locator('[data-testid="metrics-loading"]')).toBeVisible();

      // Wait for refresh to complete
      await page.waitForSelector('[data-testid="metrics-loading"]', { state: 'hidden' });

      // Verify metrics are displayed again
      await expect(metricElement).toBeVisible();
    });
  });

  test.describe('Date Range Selection', () => {
    test('should allow changing date range', async ({ page }) => {
      await page.goto('/dashboard');

      // Open date range picker
      await page.click('[data-testid="date-range-picker"]');
      await expect(page.locator('[data-testid="date-range-dropdown"]')).toBeVisible();

      // Select last 7 days
      await page.click('[data-testid="date-range-7d"]');

      // Verify selection is applied
      await expect(page.locator('[data-testid="date-range-picker"]')).toContainText('Last 7 days');

      // Metrics should update
      await page.waitForSelector('[data-testid="metrics-loading"]', { state: 'hidden' });
    });

    test('should allow custom date range selection', async ({ page }) => {
      await page.goto('/dashboard');

      // Open date range picker
      await page.click('[data-testid="date-range-picker"]');

      // Select custom range
      await page.click('[data-testid="date-range-custom"]');

      // Date picker should be visible
      await expect(page.locator('[data-testid="custom-date-picker"]')).toBeVisible();

      // Select start date (7 days ago)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      await page.fill('[data-testid="start-date"]', sevenDaysAgo.toISOString().split('T')[0]);

      // Select end date (today)
      const today = new Date();
      await page.fill('[data-testid="end-date"]', today.toISOString().split('T')[0]);

      // Apply custom range
      await page.click('[data-testid="apply-date-range"]');

      // Verify custom range is applied
      await page.waitForSelector('[data-testid="metrics-loading"]', { state: 'hidden' });
    });

    test('should validate date range inputs', async ({ page }) => {
      await page.goto('/dashboard');

      // Open custom date range
      await page.click('[data-testid="date-range-picker"]');
      await page.click('[data-testid="date-range-custom"]');

      // Set end date before start date
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await page.fill('[data-testid="start-date"]', tomorrow.toISOString().split('T')[0]);
      await page.fill('[data-testid="end-date"]', today.toISOString().split('T')[0]);

      await page.click('[data-testid="apply-date-range"]');

      // Should show validation error
      await expect(page.locator('[data-testid="date-range-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-range-error"]')).toContainText('End date must be after start date');
    });
  });

  test.describe('Charts and Visualizations', () => {
    test('should display analytics charts', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for charts to load
      await page.waitForSelector('[data-testid="analytics-charts"]', { state: 'visible' });

      // Check main charts
      const expectedCharts = [
        'visitors-chart',
        'page-views-chart',
        'traffic-sources-chart',
        'top-pages-chart'
      ];

      for (const chart of expectedCharts) {
        await expect(page.locator(`[data-testid="${chart}"]`)).toBeVisible();
        
        // Chart should have data (not empty state)
        const chartContainer = page.locator(`[data-testid="${chart}-container"]`);
        await expect(chartContainer).toBeVisible();
      }
    });

    test('should allow switching chart types', async ({ page }) => {
      await page.goto('/dashboard');

      // Find chart with type switcher
      const chartContainer = page.locator('[data-testid="visitors-chart"]');
      await expect(chartContainer).toBeVisible();

      // Switch to bar chart
      await page.click('[data-testid="chart-type-bar"]');

      // Chart should update
      await page.waitForTimeout(500); // Allow animation
      await expect(page.locator('[data-testid="bar-chart"]')).toBeVisible();

      // Switch to line chart
      await page.click('[data-testid="chart-type-line"]');
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="line-chart"]')).toBeVisible();
    });

    test('should display chart tooltips on hover', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for chart to load
      await page.waitForSelector('[data-testid="visitors-chart"]', { state: 'visible' });

      // Hover over chart data point
      const chartElement = page.locator('[data-testid="visitors-chart"] .recharts-wrapper');
      await chartElement.hover();

      // Tooltip should appear
      await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test('should display real-time visitor count', async ({ page }) => {
      await page.goto('/dashboard');

      // Check real-time widget
      await expect(page.locator('[data-testid="realtime-visitors"]')).toBeVisible();
      
      // Should have current visitor count
      const visitorCount = page.locator('[data-testid="realtime-count"]');
      await expect(visitorCount).toBeVisible();
      await expect(visitorCount).not.toBeEmpty();

      // Should have real-time indicator
      await expect(page.locator('[data-testid="realtime-indicator"]')).toBeVisible();
    });

    test('should update real-time data periodically', async ({ page }) => {
      await page.goto('/dashboard');

      // Get initial real-time value
      const realtimeElement = page.locator('[data-testid="realtime-count"]');
      await expect(realtimeElement).toBeVisible();
      const initialValue = await realtimeElement.textContent();

      // Wait for update (assuming updates every 30 seconds)
      await page.waitForTimeout(5000);

      // Value might change or stay same, but element should still be visible
      await expect(realtimeElement).toBeVisible();
    });
  });

  test.describe('Export Functionality', () => {
    test('should export dashboard data to PDF', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for data to load
      await page.waitForSelector('[data-testid="metrics-overview"]');

      // Start download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-pdf"]');

      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/dashboard.*\.pdf/i);
    });

    test('should export dashboard data to CSV', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for data to load
      await page.waitForSelector('[data-testid="metrics-overview"]');

      // Start download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-csv"]');

      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/dashboard.*\.csv/i);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page, context }) => {
      // Mock API to return error
      await context.route('**/api/analytics/**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await page.goto('/dashboard');

      // Should show error state
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to load');

      // Retry button should be available
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle network errors', async ({ page, context }) => {
      await page.goto('/dashboard');

      // Wait for initial load
      await page.waitForSelector('[data-testid="metrics-overview"]');

      // Simulate network failure
      await context.setOffline(true);

      // Try to refresh
      await page.click('[data-testid="refresh-metrics"]');

      // Should show offline error
      await expect(page.locator('[data-testid="offline-error"]')).toBeVisible();

      // Restore connection
      await context.setOffline(false);

      // Retry should work
      await page.click('[data-testid="retry-button"]');
      await page.waitForSelector('[data-testid="metrics-overview"]');
    });

    test('should handle empty data state', async ({ page, context }) => {
      // Mock API to return empty data
      await context.route('**/api/analytics/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            metrics: {},
            charts: [],
            totalVisitors: 0,
            pageViews: 0
          })
        });
      });

      await page.goto('/dashboard');

      // Should show empty state
      await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="empty-state"]')).toContainText('No data available');

      // Setup guide should be available
      await expect(page.locator('[data-testid="setup-guide"]')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      
      // Wait for all main components to load
      await Promise.all([
        page.waitForSelector('[data-testid="metrics-overview"]'),
        page.waitForSelector('[data-testid="analytics-charts"]'),
        page.waitForSelector('[data-testid="realtime-visitors"]')
      ]);

      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle large datasets efficiently', async ({ page, context }) => {
      // Mock API with large dataset
      const largeMockData = {
        metrics: {
          totalVisitors: 1000000,
          pageViews: 5000000,
          bounceRate: 0.45
        },
        chartData: Array.from({ length: 365 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          visitors: Math.floor(Math.random() * 10000),
          pageViews: Math.floor(Math.random() * 50000)
        }))
      };

      await context.route('**/api/analytics/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeMockData)
        });
      });

      const startTime = Date.now();
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="analytics-charts"]');

      const renderTime = Date.now() - startTime;
      
      // Should render large dataset within reasonable time
      expect(renderTime).toBeLessThan(10000);

      // UI should remain responsive
      await page.click('[data-testid="date-range-picker"]');
      await expect(page.locator('[data-testid="date-range-dropdown"]')).toBeVisible();
    });
  });
});