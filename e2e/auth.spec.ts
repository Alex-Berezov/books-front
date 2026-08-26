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

  // Решение владельца от 22.08.2026: чтение, прослушивание и саммари открыты без
  // входа. Прежде этот тест ждал здесь редиректа на форму входа — теперь
  // редирект на неё и есть отказ.
  //
  // ⚠️ Слаги в адресах намеренно произвольные, и существовать в каталоге они
  // не обязаны: проверяется **рубеж**, а не содержимое. `middleware` решает,
  // отправлять ли анонима на форму входа, до всякого обращения к данным
  // (`middleware.ts:227-229` — не админский маршрут, дальше `NextResponse.next()`),
  // поэтому 404 на несуществующей книге доказывает ровно то же, что и живая
  // страница: гейта на этом адресе нет. Проверка содержимого была бы зависимостью
  // от боевого каталога — см. `e2e/public.spec.ts` и `LEGACY-283`.
  test('content routes stay open to anonymous visitors', async ({ page }) => {
    for (const path of [
      '/en/summary/some-book/00000000-0000-0000-0000-000000000000',
      '/en/book/hamlet/read',
      '/en/book/hamlet/listen',
    ]) {
      await page.goto(path);

      await expect(page).not.toHaveURL(/\/auth\/sign-in/);
    }
  });
});
