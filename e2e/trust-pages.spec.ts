import { test, expect, type Page } from '@playwright/test';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { countGoogle } from './google';

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
  // Без плашки GA грузится (сборка e2e идёт с тестовым ID): в сеть раннер не ходит.
  await countGoogle(page);
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

  test('legal notice opens from the footer legal group and from the contact page (F01-6)', async ({
    page,
  }) => {
    await page.goto('/en/catalog');
    await page
      .getByRole('navigation', { name: 'Legal' })
      .getByRole('link', { name: 'Legal Notice', exact: true })
      .click();
    await expect(page).toHaveURL(/\/en\/legal-notice$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Legal Notice' })).toBeVisible();

    await page.goto('/ru/contact');
    await page.getByRole('link', { name: '«Сведения об операторе»' }).click();
    await expect(page).toHaveURL(/\/ru\/legal-notice$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Сведения об операторе' })
    ).toBeVisible();
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

/**
 * Приёмка F01 (`product.md` §14 п. 1-2, пачка F01-7): восемь страниц на пяти языках. Английский
 * на чужом языке ищется сверкой с отрисованной `/en/<page>`, а не с модулем `en`: модули
 * `content/legal` под `server-only` (решение арбитра 14.10.2026, `decisions-log.md`, `F01 | F01-7`).
 * Порог 40 символов и сравнение целых блоков — как в `__tests__/content/legal/parity.test.ts`.
 */
const TRUST_PAGES = [
  'about',
  'contact',
  'editorial-policy',
  'cookies',
  'privacy',
  'terms',
  'legal-notice',
  'deletion',
] as const;

const MIN_UNTRANSLATED_LENGTH = 40;

const longTextBlocks = async (page: Page): Promise<Set<string>> => {
  const texts = await page
    .locator('#main-content')
    .locator('h1, h2, h3, p, li, th, td')
    .allTextContents();
  return new Set(
    texts
      .map((text) => text.replace(/\s+/g, ' ').trim())
      .filter((text) => text.length > MIN_UNTRANSLATED_LENGTH)
  );
};

const footerHrefs = (page: Page, group: string) =>
  page
    .getByRole('navigation', { name: group, exact: true })
    .getByRole('link')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));

test.describe('Trust pages in five languages (F01-7)', () => {
  for (const slug of TRUST_PAGES) {
    for (const lang of SUPPORTED_LANGS) {
      test(`/${lang}/${slug}: 200, one h1, footer links, no English blocks`, async ({ page }) => {
        // Английский образец берётся отдельным заходом на `/en`, а не первым языком цикла:
        // проверка не зависит от порядка `SUPPORTED_LANGS`.
        let english = new Set<string>();
        if (lang !== 'en') {
          await page.goto(`/en/${slug}`);
          english = await longTextBlocks(page);
          expect(english.size, `/en/${slug} has no text blocks to compare with`).toBeGreaterThan(0);
        }

        const response = await page.goto(`/${lang}/${slug}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator('h1')).toHaveCount(1);

        const { footer } = getDictionary(lang);
        expect(await footerHrefs(page, footer.groupAbout)).toEqual([
          `/${lang}/about`,
          `/${lang}/editorial-policy`,
          `/${lang}/contact`,
        ]);
        expect(await footerHrefs(page, footer.groupLegal)).toEqual([
          `/${lang}/privacy`,
          `/${lang}/terms`,
          `/${lang}/cookies`,
          `/${lang}/legal-notice`,
        ]);
        await expect(page.locator(`footer a[href="/${lang}/deletion"]`)).toHaveCount(0);

        const blocks = await longTextBlocks(page);
        expect([...blocks].filter((text) => english.has(text))).toEqual([]);
      });
    }
  }
});
