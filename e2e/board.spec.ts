import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers';

test.describe('Board/Kanban', () => {
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

  test('should display board view when project exists', async ({ page }) => {
    // Check for project cards in main content area (not sidebar)
    // A project card has an h3 inside a link to /board
    const projectCards = page.locator('main a[href*="/board"] h3');
    const count = await projectCards.count();

    if (count === 0) {
      console.log('No accessible projects found - skipping board tests');
      console.log('To run these tests, create a project manually in the Firebase Console');
      test.skip();
      return;
    }

    // Click on the first project
    await projectCards.first().click();

    // Should show board URL
    await expect(page).toHaveURL(/\/projects\/.*\/board/, { timeout: 10000 });

    // Board view should be visible
    await expect(page.locator('text=リストを追加')).toBeVisible({ timeout: 10000 });
  });

  test('should show add list button', async ({ page }) => {
    const projectCards = page.locator('main a[href*="/board"] h3');
    const count = await projectCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await projectCards.first().click();
    await expect(page.locator('text=リストを追加')).toBeVisible({ timeout: 10000 });
  });

  test('should create a new list', async ({ page }) => {
    const projectCards = page.locator('main a[href*="/board"] h3');
    const count = await projectCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    const listName = `テストリスト_${Date.now()}`;

    await projectCards.first().click();

    // Wait for board to load
    await expect(page.locator('text=リストを追加')).toBeVisible({ timeout: 10000 });

    // Click add list button
    await page.click('text=リストを追加');

    // Fill in list name
    await page.fill('input[placeholder*="リスト名"]', listName);

    // Submit
    await page.click('button:has-text("追加")');

    // List should appear
    await expect(page.locator(`text=${listName}`)).toBeVisible({ timeout: 10000 });
  });

  test('should create a new task in list', async ({ page }) => {
    const projectCards = page.locator('main a[href*="/board"] h3');
    const count = await projectCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    const taskTitle = `テストタスク_${Date.now()}`;

    await projectCards.first().click();

    // Wait for board to load
    await expect(page.locator('text=リストを追加')).toBeVisible({ timeout: 10000 });

    // Check if any list exists by looking for "タスクを追加" buttons
    const addTaskButtons = page.locator('button:has-text("タスクを追加")');
    const listCount = await addTaskButtons.count();

    if (listCount === 0) {
      await page.click('text=リストを追加');
      await page.fill('input[placeholder*="リスト名"]', 'テストリスト');
      await page.click('button:has-text("追加")');
      await expect(page.locator('button:has-text("タスクを追加")')).toBeVisible({ timeout: 10000 });
    }

    // Click add task button in first list
    await page.locator('button:has-text("タスクを追加")').first().click();

    // Fill in task title
    await page.fill('input[placeholder*="タスク"]', taskTitle);

    // Press Enter
    await page.keyboard.press('Enter');

    // Task should appear
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 10000 });
  });

  test('should open task detail modal when clicking task', async ({ page }) => {
    const projectCards = page.locator('main a[href*="/board"] h3');
    const count = await projectCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await projectCards.first().click();

    // Wait for board to load
    await expect(page.locator('text=リストを追加')).toBeVisible({ timeout: 10000 });

    // Create list and task if needed
    const addTaskButtons = page.locator('button:has-text("タスクを追加")');
    const listCount = await addTaskButtons.count();

    if (listCount === 0) {
      await page.click('text=リストを追加');
      await page.fill('input[placeholder*="リスト名"]', 'テストリスト');
      await page.click('button:has-text("追加")');
      await expect(page.locator('button:has-text("タスクを追加")')).toBeVisible({ timeout: 10000 });
    }

    // Look for existing tasks or create one
    const taskCards = page.locator('[data-rbd-draggable-id]');
    const taskCount = await taskCards.count();

    if (taskCount === 0) {
      await page.locator('button:has-text("タスクを追加")').first().click();
      await page.fill('input[placeholder*="タスク"]', 'テストタスク');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }

    // Click on first task
    await page.locator('[data-rbd-draggable-id]').first().click();

    // Modal should open
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
  });

  test('should show task tabs in detail modal', async ({ page }) => {
    const projectCards = page.locator('main a[href*="/board"] h3');
    const count = await projectCards.count();

    if (count === 0) {
      test.skip();
      return;
    }

    await projectCards.first().click();

    // Wait for board to load
    await expect(page.locator('text=リストを追加')).toBeVisible({ timeout: 10000 });

    // Create list and task if needed
    const addTaskButtons = page.locator('button:has-text("タスクを追加")');
    const listCount = await addTaskButtons.count();

    if (listCount === 0) {
      await page.click('text=リストを追加');
      await page.fill('input[placeholder*="リスト名"]', 'テストリスト');
      await page.click('button:has-text("追加")');
      await expect(page.locator('button:has-text("タスクを追加")')).toBeVisible({ timeout: 10000 });
    }

    const taskCards = page.locator('[data-rbd-draggable-id]');
    const taskCount = await taskCards.count();

    if (taskCount === 0) {
      await page.locator('button:has-text("タスクを追加")').first().click();
      await page.fill('input[placeholder*="タスク"]', 'テストタスク');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }

    await page.locator('[data-rbd-draggable-id]').first().click();

    // Check tabs are visible
    await expect(page.locator('text=詳細')).toBeVisible();
    await expect(page.locator('text=チェックリスト')).toBeVisible();
    await expect(page.locator('text=コメント')).toBeVisible();
    await expect(page.locator('text=添付')).toBeVisible();
  });
});
