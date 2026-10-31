import { test, expect } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';
import {
  BACKEND_PROXY_HEADER,
  BACKEND_PROXY_HEADER_VALUE,
  BACKEND_PROXY_PREFIX,
} from '../lib/backend-proxy.constants';

/**
 * LEGACY-465, пачка T127. Авторизованные запросы браузера идут через серверный прокси
 * `/api/backend` своего домена: токен к ним добавляет сервер Next из куки сессии, браузер его
 * не шлёт и не знает — в сессии `/api/auth/session` токена нет (заход 2). Загрузка файла
 * (аватар профиля: presign → тело потоком → confirm) и скачивание идут тем же прокси.
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
const UPLOAD_DIRECT_PATH = `${BACKEND_PROXY_PREFIX}/uploads/direct`;
const UPLOAD_CONFIRM_PATH = `${BACKEND_PROXY_PREFIX}/uploads/confirm`;
const PASSWORD = 'e2e-proxy-password-1';

test.describe('Backend proxy', () => {
  test('refuses a request without the proxy header before touching the API', async ({
    request,
  }) => {
    const response = await request.get('/api/backend/users/me');

    expect(response.status()).toBe(403);
    expect(response.headers()['cache-control']).toBe('private, no-store');
  });

  test.describe('signed in', () => {
    // Регистрация в API ограничена (`RATE_LIMIT_REGISTER_MAX` 3 за 5 минут, `auth-rate-limit.guard.ts`).
    // Блок идёт одним воркером по порядку (`serial`): `beforeAll` регистрирует одного пользователя
    // на проект, тесты входят им по очереди. Повторов нет: повтор заново прогнал бы `beforeAll`,
    // и 429 на регистрации спрятал бы настоящую причину падения. Трасса без повтора не снимается
    // (`trace: 'on-first-retry'`), поэтому блок хранит её у упавшего теста. Тесты делят пользователя:
    // исходное состояние профиля здесь не проверяется.
    test.describe.configure({ mode: 'serial', retries: 0 });
    test.use({ trace: 'retain-on-failure' });

    let email = '';

    // Тест входа требует живого API и секрета Auth.js у `yarn start`. Без них он краснел бы на регистрации
    // или входе с непонятным текстом — здесь причина называется сразу. Пропуска (`skip`) нет намеренно.
    test.beforeAll(async ({ request }) => {
      const health = await request.get(`${API_BASE_URL}/health`).catch(() => null);
      expect(
        health?.ok(),
        `API is not reachable at ${API_BASE_URL}: start the backend (ci.yml does it) before this spec`
      ).toBe(true);

      email = await registerFreshUser(request);
    });

    test('signed-in profile loads through the proxy, retrying after a 401', async ({ page }) => {
      await signIn(page, email);

      // В браузерной сессии токена нет: его держит только зашифрованная кука (заход 2).
      const session = await page.evaluate(async () => {
        const response = await fetch('/api/auth/session');
        return (await response.json()) as Record<string, unknown>;
      });
      expect(session.user).toBeTruthy();
      expect(session).not.toHaveProperty('accessToken');
      expect(session).not.toHaveProperty('refreshToken');

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

      // Точный путь: страница профиля параллельно грузит `/users/me/activities`, и его ответ 200
      // без `email` иначе успевал раньше повтора `/users/me`.
      const profile = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/api/backend/users/me' && response.status() === 200
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

    // Загрузка идёт настоящим клиентом: аватар в профиле — `uploadAvatar` → presign через прокси →
    // тело XHR `uploadBinaryWithProgress` на адрес прокси (`ownApiProxyUrl`) → confirm. Браузер
    // токена не шлёт, его ставит прокси; тело — потоком на ручку загрузки из белого списка.
    test('the profile avatar upload goes through the proxy without a token', async ({ page }) => {
      await signIn(page, email);
      await page.goto('/en/profile');

      const directRequests: { authorization?: string; proxyHeader?: string }[] = [];
      page.on('request', (sent) => {
        if (new URL(sent.url()).pathname !== UPLOAD_DIRECT_PATH) return;
        const headers = sent.headers();
        directRequests.push({
          authorization: headers.authorization,
          proxyHeader: headers[BACKEND_PROXY_HEADER.toLowerCase()],
        });
      });
      const direct = page.waitForResponse(
        (response) => new URL(response.url()).pathname === UPLOAD_DIRECT_PATH
      );
      const confirm = page.waitForResponse(
        (response) => new URL(response.url()).pathname === UPLOAD_CONFIRM_PATH
      );

      // PNG 1×1: ручка сверяет тип и размер с presign.
      await page.locator('input[type="file"]').setInputFiles({
        name: 'avatar.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64'
        ),
      });

      const directResponse = await direct;
      expect(new URL(directResponse.url()).pathname).toBe(UPLOAD_DIRECT_PATH);
      expect(directResponse.status(), 'streamed body').toBeLessThan(300);
      expect((await confirm).status(), 'confirm').toBeLessThan(300);
      expect(directRequests).toHaveLength(1);
      expect(directRequests[0].authorization).toBeUndefined();
      expect(directRequests[0].proxyHeader).toBe(BACKEND_PROXY_HEADER_VALUE);
    });

    // Скачивание правового файла — путь админки: у пользователя конвейера роли нет, и бэкенд
    // отвечает 403. Это и проверяется: запрос дошёл до API с токеном из куки (без токена был бы
    // 401) и ответ API, а не прокси, дошёл до браузера.
    test('a file download goes through the proxy with the session token', async ({ page }) => {
      await signIn(page, email);

      const download = await page.evaluate(
        async ({ header, value }) => {
          const response = await fetch(
            '/api/backend/admin/rights/review-imports/00000000-0000-0000-0000-000000000000/report-pdf',
            { headers: { [header]: value } }
          );
          return {
            status: response.status,
            error: ((await response.json()) as { error?: string }).error,
          };
        },
        { header: BACKEND_PROXY_HEADER, value: BACKEND_PROXY_HEADER_VALUE }
      );

      expect(download.status).toBe(403);
      expect(download.error).not.toBe('BackendProxyRefused');
    });
  });
});

/** Регистрирует пользователя с уникальным адресом прямо в API. */
const registerFreshUser = async (request: APIRequestContext): Promise<string> => {
  const email = `e2e-proxy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  const registered = await request.post(`${API_BASE_URL}/auth/register`, {
    data: { email, password: PASSWORD },
  });
  expect(
    registered.ok(),
    registered.status() === 429
      ? 'register: 429 - registration rate limit (RATE_LIMIT_REGISTER_MAX per 5 min), wait or run one project'
      : `register: ${registered.status()}`
  ).toBe(true);
  return email;
};

/** Входит заведённым пользователем через форму сайта. */
const signIn = async (page: Page, email: string): Promise<void> => {
  await page.goto('/en/auth/sign-in');
  // Форма входа — `#sign-in`: в шапке есть своя кнопка submit у поиска.
  const form = page.locator('#sign-in');
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(PASSWORD);
  await form.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/auth\/sign-in/);
};
