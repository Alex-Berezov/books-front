import { test, expect } from '@playwright/test';
import { BACKEND_PROXY_HEADER, BACKEND_PROXY_HEADER_VALUE } from '../lib/backend-proxy.constants';

/**
 * LEGACY-465, пачка T127 (заход 1 из 2). Авторизованные запросы браузера идут через
 * серверный прокси `/api/backend` своего домена: токен к ним добавляет сервер Next из
 * сессии, браузер его не шлёт.
 *
 * Проверяется собранное приложение — вход через Auth.js, личный запрос профиля через прокси
 * с токеном из куки, подставной 401 на первой попытке и повтор клиента через свежую сессию,
 * запись из настоящего браузера (он сам ставит `Origin` и `Sec-Fetch-Site`). Истечение access
 * здесь не наступает: продление через `/api/auth/session` и сведение продлений держат юниты
 * (`__tests__/lib/auth/sharedRefresh.test.ts`). Юниты
 * (`__tests__/app/api/backendProxy.test.ts`, `__tests__/lib/http-client/backendProxyRoute.test.ts`)
 * не видят ни настоящей куки сессии, ни сборки.
 *
 * Пользователь заводится регистрацией прямо в API конвейера (`ci.yml`, свой бэкенд на
 * `127.0.0.1:5000` поверх засеянной базы), адрес уникальный на прогон. Шагу e2e для входа
 * нужны `NEXTAUTH_SECRET` и `AUTH_TRUST_HOST` (`ci.yml`, решение арбитра 12.10.2026).
 */

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:5000/api';
const PROFILE_REQUEST = '**/api/backend/users/me';

test.describe('Backend proxy', () => {
  test('refuses a request without the proxy header before touching the API', async ({
    request,
  }) => {
    const response = await request.get('/api/backend/users/me');

    expect(response.status()).toBe(403);
    expect(response.headers()['cache-control']).toBe('private, no-store');
  });

  test.describe('signed in', () => {
    // Тест входа требует живого API и секрета Auth.js у `yarn start`. Без них он краснел бы на регистрации
    // или входе с непонятным текстом — здесь причина называется сразу. Пропуска (`skip`) нет намеренно.
    test.beforeAll(async ({ request }) => {
      const health = await request.get(`${API_BASE_URL}/health`).catch(() => null);
      expect(
        health?.ok(),
        `API is not reachable at ${API_BASE_URL}: start the backend (ci.yml does it) before this spec`
      ).toBe(true);
    });

    test('signed-in profile loads through the proxy, retrying after a 401', async ({
      page,
      request,
    }) => {
      const email = `e2e-proxy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
      const password = 'e2e-proxy-password-1';

      const registered = await request.post(`${API_BASE_URL}/auth/register`, {
        data: { email, password },
      });
      expect(registered.ok(), `register: ${registered.status()}`).toBe(true);

      await page.goto('/en/auth/sign-in');
      // Форма входа — `#sign-in`: в шапке есть своя кнопка submit у поиска.
      const form = page.locator('#sign-in');
      await form.locator('input[name="email"]').fill(email);
      await form.locator('input[name="password"]').fill(password);
      await form.locator('button[type="submit"]').click();
      await expect(page).not.toHaveURL(/\/auth\/sign-in/);

      // Первая попытка получает подставной 401 — так выглядит истёкший access. Клиент обязан
      // повторить запрос через прокси же, а не выйти из аккаунта и не пойти в API напрямую.
      const seen: { authorization?: string; proxyHeader?: string }[] = [];
      let refused = false;
      await page.route(PROFILE_REQUEST, async (route) => {
        const headers = route.request().headers();
        seen.push({
          authorization: headers.authorization,
          proxyHeader: headers[BACKEND_PROXY_HEADER.toLowerCase()],
        });
        if (!refused) {
          refused = true;
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ statusCode: 401, message: 'Unauthorized' }),
          });
          return;
        }
        await route.continue();
      });

      const profile = page.waitForResponse(
        (response) => response.url().includes('/api/backend/users/me') && response.status() === 200
      );
      await page.goto('/en/profile');
      const body = (await (await profile).json()) as { email?: string };

      expect(body.email).toBe(email);
      expect(seen.length).toBeGreaterThanOrEqual(2);
      for (const request of seen) {
        expect(request.authorization).toBeUndefined();
        expect(request.proxyHeader).toBe(BACKEND_PROXY_HEADER_VALUE);
      }
      await expect(page).toHaveURL(/\/en\/profile/);
      await page.unroute(PROFILE_REQUEST);

      // Запись: тот же путь, которым идут правки профиля и вся админка.
      const written = await page.evaluate(
        async ({ header, value }) => {
          const response = await fetch('/api/backend/users/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', [header]: value },
            body: JSON.stringify({ name: 'E2E Proxy' }),
          });
          return { status: response.status, body: (await response.json()) as { name?: string } };
        },
        { header: BACKEND_PROXY_HEADER, value: BACKEND_PROXY_HEADER_VALUE }
      );

      expect(written.status).toBe(200);
      expect(written.body.name).toBe('E2E Proxy');
    });
  });
});
