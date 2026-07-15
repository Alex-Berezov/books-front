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

  test('should redirect to login when accessing private summary route without token', async ({
    page,
  }) => {
    await page.goto('/en/summary/some-book/00000000-0000-0000-0000-000000000000');

    // Should redirect to sign-in (edge middleware protects /:lang/summary/*)
    await expect(page).toHaveURL(/\/en\/auth\/sign-in/);

    const url = new URL(page.url());
    expect(url.searchParams.get('callbackUrl')).toBe(
      '/en/summary/some-book/00000000-0000-0000-0000-000000000000'
    );
  });
});
