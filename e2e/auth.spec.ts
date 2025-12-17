import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('text=TaskFlow')).toBeVisible();
    await expect(page.locator('text=Googleでログイン')).toBeVisible();
  });

  test('should show test login button when test mode is enabled', async ({ page }) => {
    await page.goto('/login');

    // Test login button should be visible
    await expect(page.locator('[data-testid="test-login"]')).toBeVisible();
    await expect(page.locator('text=テストユーザーでログイン')).toBeVisible();
  });

  test('should login with test user', async ({ page }) => {
    // Capture console messages
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    await page.goto('/login');

    // Click test login button
    await page.click('[data-testid="test-login"]');

    // Wait for navigation (longer timeout for first login)
    try {
      await page.waitForURL('/', { timeout: 60000 });
    } catch (error) {
      console.log('Console messages:', consoleMessages.join('\n'));
      console.log('Current URL:', page.url());
      throw error;
    }

    // Should see dashboard
    await expect(page.locator('text=ダッシュボード')).toBeVisible();
  });

  test('should redirect to login when accessing protected page without auth', async ({ page }) => {
    // Clear any stored auth
    await page.context().clearCookies();

    await page.goto('/projects');

    // Should be redirected to login (or show login prompt)
    await expect(page).toHaveURL(/login/);
  });
});
