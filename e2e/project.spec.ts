import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should display projects page', async ({ page }) => {
    await page.goto('/projects');

    // Wait for page to fully load (Firestore may be slow)
    await page.waitForLoadState('networkidle');

    // Wait for either the projects list or the "新規プロジェクト" button
    await expect(page.getByRole('button', { name: '新規プロジェクト' })).toBeVisible({ timeout: 60000 });
  });

  test('should open create project modal', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '新規プロジェクト' }).click();

    // Modal should be visible (check for dialog heading specifically)
    await expect(page.getByRole('heading', { name: '新規プロジェクト' })).toBeVisible();
    await expect(page.locator('input[placeholder*="Webサイト"]')).toBeVisible();
  });

  // Skip project creation test - Firestore connectivity issues cause hanging
  test.skip('should create a new project', async ({ page }) => {
    const projectName = `E2Eテストプロジェクト_${Date.now()}`;

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Click create button
    await page.getByRole('button', { name: '新規プロジェクト' }).click();

    // Fill in project name
    await page.fill('input[placeholder*="Webサイト"]', projectName);

    // Submit
    await page.locator('[role="dialog"] button:has-text("作成")').click();

    // Wait for modal to close and project to appear
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 60000 });
    await expect(page.locator(`text=${projectName}`)).toBeVisible({ timeout: 30000 });
  });

  test('should navigate to project board', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('button', { name: '新規プロジェクト' })).toBeVisible({ timeout: 60000 });
    await page.waitForTimeout(3000);

    // Check for project cards in main content area
    const projectCards = page.locator('main a[href*="/board"] h3');
    const count = await projectCards.count();

    if (count === 0) {
      console.log('No accessible projects found - skipping navigation test');
      test.skip();
      return;
    }

    // Click on first project
    await projectCards.first().click();

    // Should navigate to board
    await expect(page).toHaveURL(/\/projects\/.*\/board/, { timeout: 30000 });
  });

  test('should archive and restore a project', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: '新規プロジェクト' })).toBeVisible({ timeout: 60000 });
    await page.waitForTimeout(3000);

    const projectCards = page.locator('main [data-testid="project-card"]');
    const count = await projectCards.count();

    if (count === 0) {
      console.log('No accessible projects found - skipping archive test');
      test.skip();
      return;
    }

    // Remember the name of the project we archive
    const firstCard = projectCards.first();
    const projectName = (await firstCard.locator('h3').innerText()).trim();

    // Accept the confirm() dialog for archiving
    page.once('dialog', (dialog) => dialog.accept());

    // Open the card's dropdown menu and click アーカイブ
    await firstCard.hover();
    await firstCard.getByRole('button').click();
    await page.getByRole('menuitem', { name: 'アーカイブ' }).click();

    // Archived section toggle should appear
    const toggle = page.getByTestId('toggle-archived-projects');
    await expect(toggle).toBeVisible({ timeout: 30000 });

    // Expand archived section and verify the project is there
    await toggle.click();
    const archivedSection = page.getByTestId('archived-projects-section');
    await expect(archivedSection.getByText(projectName)).toBeVisible({ timeout: 30000 });

    // Restore the project
    const archivedCard = archivedSection
      .locator('[data-testid="project-card"]')
      .filter({ hasText: projectName })
      .first();
    await archivedCard.hover();
    await archivedCard.getByRole('button').click();
    await page.getByRole('menuitem', { name: '復元' }).click();

    // The project should be back in the active list
    await expect(
      page.locator('main [data-testid="project-card"]').filter({ hasText: projectName }).first()
    ).toBeVisible({ timeout: 30000 });
  });

  test('should navigate to project settings', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await expect(page.getByRole('button', { name: '新規プロジェクト' })).toBeVisible({ timeout: 60000 });
    await page.waitForTimeout(3000);

    // Check for project cards in main content area
    const projectCards = page.locator('main a[href*="/board"] h3');
    const count = await projectCards.count();

    if (count === 0) {
      console.log('No accessible projects found - skipping settings test');
      test.skip();
      return;
    }

    // Click on first project
    await projectCards.first().click();

    // Wait for board to load, then click settings
    await page.waitForLoadState('networkidle');
    await page.click('a:has-text("設定")');

    // Should show settings page
    await expect(page).toHaveURL(/\/projects\/.*\/settings/, { timeout: 30000 });
  });
});
