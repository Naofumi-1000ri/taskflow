import { test, expect } from '@playwright/test';

test.describe('Authentication Smoke', () => {
  test('shows the login page for unauthenticated users', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('TaskFlow')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Googleでログイン' })).toBeVisible();
    await expect(page.getByTestId('test-login')).toHaveCount(0);
  });

  test('redirects protected routes to login when unauthenticated', async ({ page }) => {
    await page.goto('/projects');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('TaskFlow')).toBeVisible();
  });
});
