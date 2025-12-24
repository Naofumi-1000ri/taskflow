import { test, expect } from '@playwright/test';
import { loginAsTestUser, createProject, createList, createTask } from './helpers';

test.describe('Calendar Popover', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should display due date calendar without cutoff', async ({ page }) => {
    const projectName = `Calendar Test ${Date.now()}`;

    // Create a test project (auto-navigates to board)
    await createProject(page, projectName);

    // Wait for board to load
    await expect(page.locator('[data-testid="board-view"]')).toBeVisible({ timeout: 10000 });

    // Create a list
    await createList(page, 'テストリスト');

    // Create a task
    await createTask(page, 'テストリスト', 'カレンダーテスト');

    // Click on the task to open detail modal
    await page.click('text=カレンダーテスト');

    // Wait for modal to open
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Click on due date button
    await page.click('text=期限を設定');

    // Wait for calendar popover to appear
    await expect(page.locator('[data-slot="popover-content"]')).toBeVisible({ timeout: 5000 });

    // Take a screenshot to verify calendar is not cut off
    await page.screenshot({ path: 'test-results/calendar-screenshot.png' });

    // Check that all dates are visible (specifically check for date 28 which would be at the bottom)
    const calendar = page.locator('[data-slot="popover-content"]');

    // The calendar should be fully visible in viewport
    const calendarBox = await calendar.boundingBox();
    expect(calendarBox).not.toBeNull();

    if (calendarBox) {
      const viewportSize = page.viewportSize();
      if (viewportSize) {
        // Calendar bottom should be within viewport
        expect(calendarBox.y + calendarBox.height).toBeLessThanOrEqual(viewportSize.height);
      }
    }

    // Try to click on a date in the later part of the month (e.g., 25th)
    await page.locator('[role="gridcell"]:has-text("25")').first().click();

    // Verify the date was selected
    await expect(page.locator('text=期限: ')).toBeVisible({ timeout: 3000 });
  });
});
