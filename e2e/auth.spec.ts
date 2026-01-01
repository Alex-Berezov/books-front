import { test, expect } from '@playwright/test';

test.describe('Auth & Admin', () => {
  test('should redirect to login when accessing admin without token', async ({ page }) => {
    await page.goto('/admin/en/dashboard');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/en\/auth\/sign-in/);

    // Check if callbackUrl is present
    const url = new URL(page.url());
    expect(url.searchParams.get('callbackUrl')).toBe('/admin/en/dashboard');
  });
});
