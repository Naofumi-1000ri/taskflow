import { test, expect } from '@playwright/test';

test.describe('Demo Login Button', () => {
  test('is visible on the login page when configured', async ({ page }) => {
    await page.goto('/login');

    const demoButton = page.getByTestId('demo-login');
    await expect(demoButton).toBeVisible();
    await expect(demoButton).toContainText('デモを試す');
    await expect(
      page.getByText('サンプルプロジェクトで機能を体験できます')
    ).toBeVisible();
  });

  test('does not crash the page when clicked with smoke firebase config', async ({ page }) => {
    // The smoke environment uses placeholder Firebase credentials, so the actual
    // sign-in call is expected to fail at the network/auth layer. We just want to
    // ensure the click handler stays defensive and the user remains on /login.
    await page.goto('/login');

    await page.getByTestId('demo-login').click();
    await page.waitForTimeout(1500);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('demo-login')).toBeVisible();
  });
});
