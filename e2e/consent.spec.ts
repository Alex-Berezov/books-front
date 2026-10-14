import { test, expect, type Page } from '@playwright/test';
import { countGoogle } from './google';

/**
 * Плашка cookie в настоящем браузере (`F01-3`, `tech.md` §4.4). Блок «Cookie consent» проверяет
 * поведение плашки и подставляет ответ `/api/consent-region` через `page.route`; блок «by visitor
 * country» (F01-7) ответ не подставляет, а шлёт страну заголовком `cf-ipcountry`. Запросы
 * к Google перехватываются и считаются (`e2e/google.ts`), в сеть раннер не ходит.
 */

const answerRegion = (page: Page, consentRequired: boolean) =>
  page.route('**/api/consent-region', (route) =>
    route.fulfill({ json: { consentRequired }, headers: { 'cache-control': 'private, no-store' } })
  );

const banner = (page: Page) => page.getByRole('region', { name: 'Cookie consent' });

test.describe('Cookie consent', () => {
  test('country with banner: no Google before a choice, "Reject" closes it for good', async ({
    page,
  }) => {
    await answerRegion(page, true);
    const google = await countGoogle(page);

    await page.goto('/en/cookies');
    await expect(banner(page)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cookie Policy');

    await banner(page).getByRole('button', { name: 'Reject' }).click();
    await expect(banner(page)).toBeHidden();
    await expect(page.getByTestId('consent-choice').getByText('Analytics is off')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('consent-choice').getByText('Analytics is off')).toBeVisible();
    await expect(banner(page)).toBeHidden();
    await page.waitForLoadState('networkidle');
    expect(google.count).toBe(0);
  });

  test('country with banner: "Accept" loads Google Analytics without a reload', async ({
    page,
  }) => {
    await answerRegion(page, true);
    const google = await countGoogle(page);

    await page.goto('/en/cookies');
    await expect(banner(page)).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(google.count).toBe(0);

    await banner(page).getByRole('button', { name: 'Accept' }).click();
    await expect.poll(() => google.count).toBeGreaterThan(0);
  });

  test('"Cookie Settings" in the footer reopens the banner', async ({ page }) => {
    await answerRegion(page, true);
    await page.goto('/en/cookies');
    await banner(page).getByRole('button', { name: 'Accept' }).click();
    await expect(banner(page)).toBeHidden();

    await page.getByRole('button', { name: 'Cookie Settings' }).click();
    await expect(banner(page)).toBeVisible();
  });

  test('country without banner: no banner and no "Cookie Settings" button', async ({ page }) => {
    await answerRegion(page, false);
    const regionAnswered = page.waitForResponse('**/api/consent-region');
    await page.goto('/en/cookies');
    await regionAnswered;

    await expect(page.getByTestId('consent-choice').getByText('Analytics is on')).toBeVisible();
    await expect(banner(page)).toBeHidden();
    await expect(page.getByRole('button', { name: 'Cookie Settings' })).toHaveCount(0);
  });

  test('Global Privacy Control: no banner, no request for the region, toggle disabled', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      Object.defineProperty(navigator, 'globalPrivacyControl', { value: true })
    );
    const google = await countGoogle(page);
    let regionRequests = 0;
    await page.route('**/api/consent-region', (route) => {
      regionRequests += 1;
      return route.fulfill({ json: { consentRequired: true } });
    });

    await page.goto('/en/cookies');
    await expect(page.getByTestId('consent-choice')).toContainText('Global Privacy Control');
    // Запрос, если бы провайдер его сделал, ушёл бы после отрисовки: ждём тишины сети.
    await page.waitForLoadState('networkidle');
    await expect(banner(page)).toBeHidden();
    await expect(page.getByTestId('consent-choice').getByRole('button')).toBeDisabled();
    expect(regionRequests).toBe(0);
    expect(google.count).toBe(0);
  });
});

/**
 * Страны из `product.md` §14 п. 3 (пачка F01-7): ответ региона не подставляется, страна приходит
 * заголовком `cf-ipcountry`, как от Cloudflare, и проходит настоящую цепочку
 * `/api/consent-region` → `visitorCountryFrom` → `isConsentRequired`.
 */
test.describe('Cookie consent by visitor country', () => {
  for (const country of ['DE', 'GB', 'CH', 'NO', null] as const) {
    test.describe(country ?? 'unknown country', () => {
      if (country) test.use({ extraHTTPHeaders: { 'cf-ipcountry': country } });

      test('banner is shown and Google is not requested', async ({ page }) => {
        const google = await countGoogle(page);
        await page.goto('/en/cookies');
        await expect(banner(page)).toBeVisible();
        await page.waitForLoadState('networkidle');
        expect(google.count).toBe(0);
      });
    });
  }

  for (const country of ['US', 'BR', 'RU', 'IN'] as const) {
    test.describe(country, () => {
      test.use({ extraHTTPHeaders: { 'cf-ipcountry': country } });

      test('no banner, no "Cookie Settings", Google Analytics loads', async ({ page }) => {
        const google = await countGoogle(page);
        const regionAnswered = page.waitForResponse('**/api/consent-region');
        await page.goto('/en/cookies');
        expect(await (await regionAnswered).json()).toEqual({ consentRequired: false });

        await expect(page.getByTestId('consent-choice').getByText('Analytics is on')).toBeVisible();
        await expect(banner(page)).toBeHidden();
        await expect(page.getByRole('button', { name: 'Cookie Settings' })).toHaveCount(0);
        await expect.poll(() => google.count).toBeGreaterThan(0);
      });
    });
  }
});
