// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshAccessToken, resetSharedRefreshes } from '@/lib/auth/config';
import { AUTH_REQUEST_TIMEOUTS, AuthErrorType } from '@/lib/auth/constants';
import type { JWT } from 'next-auth/jwt';

/**
 * LEGACY-465, пачка T127. С серверным прокси колбэк `jwt` идёт на каждом запросе через
 * `/api/backend`, и страница админки с истёкшим access продлевала бы токен столько раз,
 * сколько запросов шлёт разом. Лимит `/auth/refresh` — 10 в минуту на весь сайт: двое таких
 * пользователей в одну минуту получали 429, за ним 401 и выход. Продление одного refresh-токена
 * обязано быть одним обращением к API на процесс.
 */

const token = (refreshToken: string) =>
  ({
    id: 'u1',
    roles: ['admin'],
    accessToken: 'old-access',
    refreshToken,
    accessTokenExpires: 0,
  }) as JWT;

const refreshed = () =>
  new Response(JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('одно продление на refresh-токен (LEGACY-465)', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    resetSharedRefreshes();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('восемь параллельных продлений — один запрос, у всех новый токен', async () => {
    fetchMock.mockImplementation(async () => refreshed());

    const results = await Promise.all(
      Array.from({ length: 8 }, () => refreshAccessToken(token('ref-1')))
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const result of results) {
      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
      expect(result.error).toBeUndefined();
    }
  });

  it('запрос со старой кукой сразу после продления получает тот же исход без похода в API', async () => {
    fetchMock.mockImplementation(async () => refreshed());

    await refreshAccessToken(token('ref-2'));
    const late = await refreshAccessToken(token('ref-2'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(late.accessToken).toBe('new-access');
  });

  it('за окном раздачи исход забыт: следующий вызов снова спрашивает API', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementation(async () => refreshed());

      await refreshAccessToken(token('ref-5'));
      vi.advanceTimersByTime(AUTH_REQUEST_TIMEOUTS.REFRESH_SHARE_MS + 1);
      await refreshAccessToken(token('ref-5'));

      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('токен без refresh — окончательный отказ без похода в API', async () => {
    const out = await refreshAccessToken({
      ...token('x'),
      refreshToken: undefined,
    } as unknown as JWT);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(out.error).toBe(AuthErrorType.SESSION_ENDED);
  });

  it('повисший /auth/refresh обрывается по таймауту — временный отказ, а не вечное ожидание', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementationOnce(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
          })
      );

      const pending = refreshAccessToken(token('ref-6'));
      await vi.advanceTimersByTimeAsync(AUTH_REQUEST_TIMEOUTS.REFRESH_MS);
      const out = await pending;

      expect(out.error).toBe(AuthErrorType.REFRESH_TOKEN_ERROR);
    } finally {
      vi.useRealTimers();
    }
  });

  it('разные refresh-токены продлеваются независимо', async () => {
    fetchMock.mockImplementation(async () => refreshed());

    await Promise.all([refreshAccessToken(token('a')), refreshAccessToken(token('b'))]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('временный отказ не раздаётся после ответа: следующий вызов спросит API снова', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    const first = await refreshAccessToken(token('ref-3'));
    expect(first.error).toBe(AuthErrorType.REFRESH_TOKEN_ERROR);

    fetchMock.mockResolvedValueOnce(refreshed());
    const second = await refreshAccessToken(token('ref-3'));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(second.accessToken).toBe('new-access');
  });

  it('окончательный отказ раздаётся всем ждущим', async () => {
    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify({ message: 'revoked' }), { status: 401 })
    );

    const results = await Promise.all([
      refreshAccessToken(token('ref-4')),
      refreshAccessToken(token('ref-4')),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const result of results) expect(result.error).toBe(AuthErrorType.SESSION_ENDED);
  });
});
