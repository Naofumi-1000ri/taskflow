import { test, expect } from '@playwright/test';

test.describe('Authenticated Smoke', () => {
  test('allows the mock user to access settings', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'AI設定を開く' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'APIキー管理を開く' })).toBeVisible();
  });
});
