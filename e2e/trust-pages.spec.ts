import { test, expect } from '@playwright/test';

/**
 * Страницы доверия в настоящем браузере (`F01-4`, `product.md` §2-5, §9): переход из подвала,
 * заголовок каждой страницы, письмо с темой на «Контактах», разметка организации на `/about`.
 * Ответ о регионе подставляется: без Cloudflare страна неизвестна, и плашка закрыла бы подвал.
 */

test.beforeEach(async ({ page }) => {
  await page.route('**/api/consent-region', (route) =>
    route.fulfill({
      json: { consentRequired: false },
      headers: { 'cache-control': 'private, no-store' },
    })
  );
});

test.describe('Trust pages', () => {
  test('footer group "About the project" leads to the three pages', async ({ page }) => {
    await page.goto('/en/catalog');
    const group = page.getByRole('navigation', { name: 'About the project' });

    for (const [name, path, heading] of [
      ['About Us', '/en/about', 'About Bibliaris'],
      ['Editorial Policy', '/en/editorial-policy', 'Editorial Policy'],
      ['Contact', '/en/contact', 'Contact'],
    ] as const) {
      await group.getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await page.goBack();
    }
  });

  test('contact page: corrections letter has a subject, other blocks write to the address', async ({
    page,
  }) => {
    await page.goto('/ru/contact');
    const mailtos = await page
      .locator('a[href^="mailto:"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));

    expect(mailtos).toHaveLength(4);
    expect(mailtos.filter((href) => href?.includes('?subject='))).toEqual([
      `mailto:support@bibliaris.com?subject=${encodeURIComponent('Ошибка в тексте книги или пересказе')}`,
    ]);
  });

  for (const path of ['/en', '/en/about']) {
    test(`${path} carries Organization and WebSite markup`, async ({ page }) => {
      await page.goto(path);
      const types = await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent ?? '{}')['@type']));

      expect(types).toEqual(expect.arrayContaining(['Organization', 'WebSite']));
    });
  }
});
