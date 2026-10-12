import { getSession, signOut } from 'next-auth/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKEND_PROXY_HEADER, BACKEND_PROXY_PREFIX } from '@/lib/backend-proxy.constants';
import { API_BASE_URL } from '@/lib/http.constants';
import type { ApiError } from '@/types/api';
import type { Session } from 'next-auth';
import type { MockInstance } from 'vitest';

/**
 * LEGACY-465, пачка T127 (заход 1). В браузере авторизованный JSON-запрос `http*Auth`
 * идёт через серверный прокси своего домена и **без** `Authorization`: токен добавляет
 * сервер. Напрямую с токеном, как раньше, идут только тело `FormData` (загрузки — заход 2,
 * решение арбитра 12.10.2026) и запрос без авторизации.
 *
 * Окружение jsdom: `window` есть, ветка браузера настоящая.
 */

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(async () => null),
  signOut: vi.fn(async () => undefined),
}));

const getSessionMock = vi.mocked(getSession);
const signOutMock = vi.mocked(signOut);

const liveSession: Session = {
  user: { id: 'u1', email: 'reader@example.com', roles: ['user'] },
  expires: '2099-01-01T00:00:00.000Z',
  accessToken: 'access-123',
};

const json = (status: number, body: unknown = { ok: true }) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const loadClient = async (session: Session | null) => {
  // Кэш сессии живёт на уровне модуля — свежий модуль на каждый тест.
  vi.resetModules();
  const auth = await import('@/lib/http-client/auth');
  auth.setSession(session);
  return import('@/lib/http-client/methods');
};

describe('http*Auth в браузере: маршрут через прокси', () => {
  // Шпион в beforeEach: msw подменяет fetch в своём beforeAll (`setupTests.ts`).
  let fetchSpy: MockInstance<typeof globalThis.fetch>;

  beforeEach(() => {
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue(null);
    signOutMock.mockClear();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(200));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.restoreAllMocks();
  });

  const call = (index = 0) => {
    const [url, init] = fetchSpy.mock.calls[index];
    return { url: String(url), headers: new Headers(init?.headers) };
  };

  it.each([
    ['GET', (m: typeof import('@/lib/http-client/methods')) => m.httpGetAuth('/users/me')],
    ['POST', (m: typeof import('@/lib/http-client/methods')) => m.httpPostAuth('/me/x', { a: 1 })],
    [
      'PATCH',
      (m: typeof import('@/lib/http-client/methods')) => m.httpPatchAuth('/me/x', { a: 1 }),
    ],
    ['PUT', (m: typeof import('@/lib/http-client/methods')) => m.httpPutAuth('/me/x', { a: 1 })],
    ['DELETE', (m: typeof import('@/lib/http-client/methods')) => m.httpDeleteAuth('/me/x')],
  ])('%s идёт в прокси без токена', async (_method, run) => {
    const methods = await loadClient(liveSession);
    await run(methods);

    const { url, headers } = call();
    expect(url.startsWith(`${BACKEND_PROXY_PREFIX}/`)).toBe(true);
    expect(url).not.toContain(API_BASE_URL);
    expect(headers.get('authorization')).toBeNull();
    expect(headers.get(BACKEND_PROXY_HEADER)).toBe('1');
  });

  // Гео-зависимые ручки (`reader-bootstrap`) берут страну из `cf-ipcountry`: через прокси это была
  // бы страна сервера фронта. `optionalAuth` идёт напрямую до захода 2 (решение арбитра 12.10.2026).
  it('optionalAuth с сессией идёт напрямую с токеном, как до захода', async () => {
    const { httpGetAuth } = await loadClient(liveSession);
    await httpGetAuth('/versions/v1/reader', { optionalAuth: true });

    expect(call().url).toBe(`${API_BASE_URL}/versions/v1/reader`);
    expect(call().headers.get('authorization')).toBe('Bearer access-123');
    expect(call().headers.get(BACKEND_PROXY_HEADER)).toBeNull();
  });

  it('optionalAuth без сессии идёт напрямую анонимом', async () => {
    const { httpGetAuth } = await loadClient(null);
    await httpGetAuth('/versions/v1/reader', { optionalAuth: true });

    expect(call().url).toBe(`${API_BASE_URL}/versions/v1/reader`);
    expect(call().headers.get('authorization')).toBeNull();
    expect(call().headers.get(BACKEND_PROXY_HEADER)).toBeNull();
  });

  it('viaBackendProxy из опций вызывающего не уводит загрузку в прокси', async () => {
    const { httpPostAuth } = await loadClient(liveSession);
    const form = new FormData();
    form.append('file', new Blob(['x']), 'x.txt');
    await httpPostAuth('/media/upload', form, { viaBackendProxy: true });

    expect(call().url).toBe(`${API_BASE_URL}/media/upload`);
  });

  it('обязательная авторизация без сессии — 401 до сети', async () => {
    const { httpGetAuth } = await loadClient(null);
    const error = await httpGetAuth('/users/me').catch((e: unknown) => e);

    // `toBeInstanceOf` здесь не годится: после `vi.resetModules()` у клиента своя копия класса.
    expect((error as ApiError).statusCode).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Прокси токен не продлевает (решение арбитра 12.10.2026): после 401 клиент берёт
  // сессию мимо кэша — `/api/auth/session` продлевает истёкший access и пишет куку.
  it('401 от прокси — свежая сессия мимо кэша и повтор через прокси без токена', async () => {
    fetchSpy.mockResolvedValueOnce(json(401, { statusCode: 401, message: 'Unauthorized' }));
    const { httpGetAuth } = await loadClient(liveSession);
    getSessionMock.mockResolvedValue({ ...liveSession, accessToken: 'renewed' });
    // Кэш сессии моложе окна свежести (5 с) раздаётся без запроса — уходим за окно.
    const realNow = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(realNow + 10_000);

    await expect(httpGetAuth('/users/me')).resolves.toEqual({ ok: true });

    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(call(1).url).toBe(`${BACKEND_PROXY_PREFIX}/users/me`);
    expect(call(1).headers.get('authorization')).toBeNull();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('две 401 разом — один запрос сессии на обе', async () => {
    fetchSpy
      .mockResolvedValueOnce(json(401, { statusCode: 401, message: 'Unauthorized' }))
      .mockResolvedValueOnce(json(401, { statusCode: 401, message: 'Unauthorized' }));
    const { httpGetAuth } = await loadClient(liveSession);
    getSessionMock.mockResolvedValue(liveSession);
    const realNow = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(realNow + 10_000);

    await Promise.all([httpGetAuth('/users/me'), httpGetAuth('/me/bookshelf')]);

    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it('в окне свежести (5 с) после запроса сессии повтор не спрашивает её снова', async () => {
    fetchSpy.mockResolvedValueOnce(json(401, { statusCode: 401, message: 'Unauthorized' }));
    // Часы стоят: `setSession` в `loadClient` отмечает сессию полученной, повтор идёт в ту же
    // миллисекунду — внутри окна при любой загрузке раннера.
    vi.spyOn(Date, 'now').mockReturnValue(Date.now());
    const { httpGetAuth } = await loadClient(liveSession);

    await expect(httpGetAuth('/users/me')).resolves.toEqual({ ok: true });

    expect(getSessionMock).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it.each([403, 500, 502, 504])(
    'отказ прокси %i — ошибка наружу, без запасного прямого пути с токеном',
    async (status) => {
      fetchSpy.mockResolvedValueOnce(json(status, { statusCode: status, message: 'x' }));
      const { httpGetAuth } = await loadClient(liveSession);

      await expect(httpGetAuth('/users/me')).rejects.toMatchObject({ statusCode: status });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(call().url.startsWith(API_BASE_URL)).toBe(false);
    }
  );

  it('сеть до прокси упала — ошибка наружу, прямого пути нет', async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { httpGetAuth } = await loadClient(liveSession);

    await expect(httpGetAuth('/users/me')).rejects.toThrow();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(call().url.startsWith(API_BASE_URL)).toBe(false);
  });

  it('повтор через прокси решает по живости сессии, а не по accessToken в ней', async () => {
    fetchSpy.mockResolvedValueOnce(json(401, { statusCode: 401, message: 'Unauthorized' }));
    const { httpGetAuth } = await loadClient(liveSession);
    getSessionMock.mockResolvedValue({ ...liveSession, accessToken: undefined });
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 10_000);

    await expect(httpGetAuth('/users/me')).resolves.toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('сессия с ошибкой после 401 через прокси — выход без повтора', async () => {
    fetchSpy.mockResolvedValueOnce(json(401, { statusCode: 401, message: 'Unauthorized' }));
    const { httpGetAuth } = await loadClient(liveSession);
    getSessionMock.mockResolvedValue({
      ...liveSession,
      error: 'RefreshAccessTokenError',
    } as unknown as Session);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 10_000);

    await expect(httpGetAuth('/users/me')).rejects.toMatchObject({ statusCode: 401 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalled();
  });

  it('401 и после повтора — выход', async () => {
    fetchSpy.mockImplementation(async () =>
      json(401, { statusCode: 401, message: 'Unauthorized' })
    );
    const { httpGetAuth } = await loadClient(liveSession);
    getSessionMock.mockResolvedValue(liveSession);
    const realNow = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(realNow + 10_000);

    await expect(httpGetAuth('/users/me')).rejects.toMatchObject({ statusCode: 401 });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(signOutMock).toHaveBeenCalled();
  });

  it('свежая сессия без токена после 401 — выход без повтора', async () => {
    fetchSpy.mockResolvedValueOnce(json(401, { statusCode: 401, message: 'Unauthorized' }));
    const { httpGetAuth } = await loadClient(liveSession);
    getSessionMock.mockResolvedValue(null);
    const realNow = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(realNow + 10_000);

    await expect(httpGetAuth('/users/me')).rejects.toMatchObject({ statusCode: 401 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalled();
  });

  it('явный accessToken в браузере идёт напрямую с ним', async () => {
    const { httpGetAuth } = await loadClient(liveSession);
    await httpGetAuth('/users/me', { accessToken: 'explicit' });

    expect(call().url).toBe(`${API_BASE_URL}/users/me`);
    expect(call().headers.get('authorization')).toBe('Bearer explicit');
  });

  it('тело FormData идёт напрямую в API с токеном (загрузки — заход 2)', async () => {
    const { httpPostAuth } = await loadClient(liveSession);
    const form = new FormData();
    form.append('file', new Blob(['x']), 'x.txt');
    await httpPostAuth('/media/upload', form);

    expect(call().url).toBe(`${API_BASE_URL}/media/upload`);
    expect(call().headers.get('authorization')).toBe('Bearer access-123');
    expect(call().headers.get(BACKEND_PROXY_HEADER)).toBeNull();
  });

  it('requireAuth: false идёт напрямую и без токена', async () => {
    const { httpGetAuth } = await loadClient(liveSession);
    await httpGetAuth('/public/thing', { requireAuth: false });

    expect(call().url).toBe(`${API_BASE_URL}/public/thing`);
    expect(call().headers.get('authorization')).toBeNull();
  });
});
