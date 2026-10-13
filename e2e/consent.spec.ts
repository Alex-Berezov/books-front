import { test, expect, type Page } from '@playwright/test';

/**
 * Плашка cookie в настоящем браузере (`F01-3`, `tech.md` §4.4). Cloudflare локально нет, поэтому
 * ответ `/api/consent-region` подставляется через `page.route`. Сборка e2e в `ci.yml` идёт
 * с тестовым `NEXT_PUBLIC_GA_MEASUREMENT_ID` (решение арбитра 13.10.2026): запросы к Google
 * перехватываются и считаются здесь же, в сеть раннер не ходит.
 */

/** Считает запросы к googletagmanager.com и отвечает пустым телом, не выходя в сеть. */
const countGoogle = async (page: Page) => {
  const hits = { count: 0 };
  await page.route('**/*googletagmanager.com/**', (route) => {
    hits.count += 1;
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  return hits;
};

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
