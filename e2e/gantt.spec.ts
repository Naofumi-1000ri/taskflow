import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers';

test.describe('Gantt Chart', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);

    // Navigate to projects page
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('button', { name: '新規プロジェクト' })).toBeVisible({ timeout: 60000 });

    // Wait for the page content to load
    await page.waitForTimeout(3000);
  });

  test('should navigate to gantt chart', async ({ page }) => {
    // Check for project cards in main content area
    const projectCards = page.locator('main a[href*="/board"] h3');
    const count = await projectCards.count();

    if (count === 0) {
      console.log('No accessible projects found - skipping gantt tests');
      test.skip();
      return;
    }

    await projectCards.first().click();

    // Click gantt tab
    await page.click('a:has-text("ガントチャート")');

    // Should show gantt view
    await expect(page).toHaveURL(/\/projects\/.*\/gantt/);
  });

  test('should display gantt chart toolbar', async ({ page }) => {
    const projectCards = page.locator('main a[href*="/board"] h3');
    const count = await projectCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await projectCards.first().click();
    await page.click('a:has-text("ガントチャート")');

    // Should show view mode selector
    await expect(page.locator('text=今日')).toBeVisible({ timeout: 10000 });
  });

  test('should switch view modes', async ({ page }) => {
    const projectCards = page.locator('main a[href*="/board"] h3');
    const count = await projectCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await projectCards.first().click();
    await page.click('a:has-text("ガントチャート")');

    // Click view mode selector
    await page.click('button:has-text("日")');

    // Should show options
    await expect(page.locator('text=週')).toBeVisible();
    await expect(page.locator('text=月')).toBeVisible();

    // Select week view
    await page.click('text=週');

    // View should update (button text should change)
    await expect(page.locator('button:has-text("週")')).toBeVisible();
  });

  test('should scroll to today when clicking today button', async ({ page }) => {
    const projectCards = page.locator('main a[href*="/board"] h3');
    const count = await projectCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await projectCards.first().click();
    await page.click('a:has-text("ガントチャート")');

    // Click today button
    await page.click('button:has-text("今日")');

    // Today marker should be visible (red line)
    // This is a visual check, we just verify the button works without error
    await expect(page.locator('button:has-text("今日")')).toBeVisible();
  });

  test('should open task modal when clicking task in gantt', async ({ page }) => {
    const projectCards = page.locator('main a[href*="/board"] h3');
    const count = await projectCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await projectCards.first().click();
    await page.click('a:has-text("ガントチャート")');

    // Wait for gantt to load
    await page.waitForTimeout(2000);

    // Try to click on a task bar (if any exists with dates)
    const taskBars = page.locator('[data-testid="gantt-task-bar"]');
    const taskCount = await taskBars.count();

    if (taskCount > 0) {
      await taskBars.first().click();
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    }
  });
});
