// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revokeBackendSessions } from '@/api/endpoints/auth-logout';
import { AUTH_REQUEST_TIMEOUTS } from '@/lib/auth/constants';
import { revokeBackendSessionsAction } from '@/lib/auth/revoke-sessions.action';

const { getTokenMock } = vi.hoisted(() => ({ getTokenMock: vi.fn() }));

vi.mock('next/headers', () => ({
  headers: () =>
    new Headers({ cookie: 'authjs.session-token=opaque', 'cf-connecting-ip': '198.51.100.7' }),
}));

vi.mock('next-auth/jwt', () => ({ getToken: getTokenMock }));

/**
 * `LEGACY-451`, пачка `T122` (решение арбитра 10.10.2026, `decisions-log.md`): сессии бэкенда
 * гасит только выход по кнопке — серверным действием, которое берёт refresh из серверной куки.
 * Отказ любого шага выход не роняет, refresh не уходит ни в лог, ни в ответ.
 */
describe('отзыв сессий при выходе (LEGACY-451)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getTokenMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('revokeBackendSessions', () => {
    it('POST /auth/logout с refresh в теле, адресом посетителя и таймаутом', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

      await revokeBackendSessions('ref-1', { 'X-Visitor-IP': '198.51.100.7' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/auth\/logout$/);
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({ refreshToken: 'ref-1' });
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(init.headers).toEqual({
        'Content-Type': 'application/json',
        'X-Visitor-IP': '198.51.100.7',
      });
      expect(consoleError).not.toHaveBeenCalled();
    });

    it('повисший бэкенд обрывается по таймауту, выход не ждёт дольше', async () => {
      const timeout = vi.spyOn(AbortSignal, 'timeout');
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          })
      );
      const controller = new AbortController();
      timeout.mockReturnValue(controller.signal);

      const pending = revokeBackendSessions('ref-1');
      controller.abort();

      await expect(pending).resolves.toBeUndefined();
      expect(timeout).toHaveBeenCalledWith(AUTH_REQUEST_TIMEOUTS.LOGOUT_MS);
    });

    it('обрыв бэкенда не роняет и refresh не логирует', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(revokeBackendSessions('secret-ref')).resolves.toBeUndefined();

      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-ref');
    });

    it('отказ бэкенда (не 2xx) не роняет и пишет только код', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 429 }));

      await expect(revokeBackendSessions('secret-ref')).resolves.toBeUndefined();

      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(consoleError.mock.calls[0]).toEqual(['Backend logout refused:', 429]);
    });

    it('без refresh запроса нет', async () => {
      await revokeBackendSessions(undefined);
      await revokeBackendSessions('');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('revokeBackendSessionsAction', () => {
    it('берёт refresh из серверной куки и гасит сессии', async () => {
      getTokenMock.mockResolvedValueOnce({ refreshToken: 'ref-secure' });
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

      await revokeBackendSessionsAction();

      expect(getTokenMock).toHaveBeenCalledTimes(1);
      expect(getTokenMock.mock.calls[0][0]).toMatchObject({ secureCookie: true });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({ refreshToken: 'ref-secure' });
      // Адрес посетителя пересылается: иначе все выходы сайта делят корзину адреса Next.
      expect((init.headers as Record<string, string>)['X-Visitor-IP']).toBe('198.51.100.7');
    });

    it('кука без __Secure- (http) — вторая попытка', async () => {
      getTokenMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ refreshToken: 'ref-plain' });
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

      await revokeBackendSessionsAction();

      expect(getTokenMock).toHaveBeenCalledTimes(2);
      expect(getTokenMock.mock.calls[1][0]).toMatchObject({ secureCookie: false });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('сессии нет — к бэкенду не ходит', async () => {
      getTokenMock.mockResolvedValue(null);

      await expect(revokeBackendSessionsAction()).resolves.toBeUndefined();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('битая кука не роняет выход', async () => {
      getTokenMock.mockRejectedValue(new Error('JWEDecryptionFailed'));

      await expect(revokeBackendSessionsAction()).resolves.toBeUndefined();

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
