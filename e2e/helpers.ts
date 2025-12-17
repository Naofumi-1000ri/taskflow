import { Page, expect } from '@playwright/test';

/**
 * Login with test user
 */
export async function loginAsTestUser(page: Page) {
  // Enable console logging for debugging
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  await page.goto('/login');

  // Check if already logged in
  const currentUrl = page.url();
  if (!currentUrl.includes('/login')) {
    return;
  }

  // Wait for test login button to be ready
  await page.waitForSelector('[data-testid="test-login"]', { timeout: 10000 });

  // Click test login button
  await page.click('[data-testid="test-login"]');

  // Wait a bit for login process to start
  await page.waitForTimeout(2000);

  // Try to wait for redirect with longer timeout
  try {
    await page.waitForURL('/', { timeout: 60000 });
  } catch (error) {
    // Log console messages for debugging
    console.log('Console messages during login:', consoleMessages.join('\n'));
    console.log('Current URL:', page.url());
    throw error;
  }

  // Verify logged in
  await expect(page.locator('text=ダッシュボード')).toBeVisible();
}

/**
 * Create a new project
 */
export async function createProject(page: Page, name: string) {
  await page.goto('/projects');

  // Click create project button
  await page.click('text=新規プロジェクト');

  // Fill in project name
  await page.fill('input[placeholder*="Webサイト"]', name);

  // Submit - use dialog-specific selector
  await page.locator('[role="dialog"] button:has-text("作成")').click();

  // Wait for dialog to close and project to be created
  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
  await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate to project board
 */
export async function goToProjectBoard(page: Page, projectName: string) {
  await page.goto('/projects');

  // Click on project
  await page.click(`text=${projectName}`);

  // Click on board tab if not already there
  const boardTab = page.locator('a:has-text("ボード")');
  if (await boardTab.isVisible()) {
    await boardTab.click();
  }

  // Wait for board to load
  await expect(page.locator('[data-testid="board-view"]')).toBeVisible({ timeout: 10000 });
}

/**
 * Create a new list in the board
 */
export async function createList(page: Page, name: string) {
  // Click add list button
  await page.click('button:has-text("リストを追加")');

  // Fill in list name
  await page.fill('input[placeholder*="リスト名"]', name);

  // Submit
  await page.click('button:has-text("追加")');

  // Wait for list to appear
  await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5000 });
}

/**
 * Create a new task in a list
 */
export async function createTask(page: Page, listName: string, taskTitle: string) {
  // Find the list
  const list = page.locator(`[data-testid="board-list"]`).filter({ hasText: listName });

  // Click add task button in that list
  await list.locator('button:has-text("タスクを追加")').click();

  // Fill in task title
  await page.fill('input[placeholder*="タスク"]', taskTitle);

  // Press Enter or click add
  await page.keyboard.press('Enter');

  // Wait for task to appear
  await expect(list.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 5000 });
}
