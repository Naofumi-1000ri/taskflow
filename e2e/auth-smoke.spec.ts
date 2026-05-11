import { test, expect } from '@playwright/test';

test.describe('Authentication Smoke', () => {
  test('shows the login page for unauthenticated users', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('TaskFlow')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Googleでログイン' })).toBeVisible();
    await expect(page.getByTestId('test-login')).toHaveCount(0);
  });

  test('shows the demo login button when NEXT_PUBLIC_DEMO_PASSWORD is set', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByTestId('demo-login')).toBeVisible();
    await expect(page.getByText('デモを試す（ログイン不要）')).toBeVisible();
  });

  test('redirects protected routes to login when unauthenticated', async ({ page }) => {
    await page.goto('/projects');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('TaskFlow')).toBeVisible();
  });
});
