// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authOptions, refreshAccessToken } from '@/lib/auth/config';
import {
  AuthErrorType,
  REFRESH_RETRY_NEVER,
  isSessionEndedError,
  isTokenSessionEnded,
  sessionEndReasonDictKey,
} from '@/lib/auth/constants';
import type { JWT } from 'next-auth/jwt';

/**
 * `LEGACY-466`. Окончательный отказ сессии и блокировка различимы по ошибке в токене:
 * по ней клиент выходит, гейт админки не пускает, страница входа говорит своё слово.
 */

type JwtCallback = (params: Record<string, unknown>) => Promise<JWT>;
const { jwt } = (authOptions as unknown as { callbacks: { jwt: JwtCallback } }).callbacks;

const live = {
  id: 'u1',
  roles: ['admin'],
  accessToken: 'acc',
  refreshToken: 'ref',
  accessTokenExpires: 0,
} as JWT;

const reply = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

describe('конец сессии (LEGACY-466)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('refresh 401 без кода — SessionEnded, повтор «никогда»', async () => {
    fetchMock.mockResolvedValueOnce(reply(401, { message: 'Session revoked' }));
    const out = await refreshAccessToken(live);
    expect(out.error).toBe(AuthErrorType.SESSION_ENDED);
    expect(out.refreshRetryAt).toBe(REFRESH_RETRY_NEVER);
  });

  it('refresh 401 с кодом ACCOUNT_DISABLED — AccountDisabled', async () => {
    fetchMock.mockResolvedValueOnce(reply(401, { code: 'ACCOUNT_DISABLED' }));
    expect((await refreshAccessToken(live)).error).toBe(AuthErrorType.ACCOUNT_DISABLED);
  });

  it('refresh 401 с не-JSON телом не падает', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 401 }));
    expect((await refreshAccessToken(live)).error).toBe(AuthErrorType.SESSION_ENDED);
  });

  it.each([429, 502])('refresh %s — временный отказ, сессия не кончена', async (status) => {
    fetchMock.mockResolvedValueOnce(reply(status));
    const out = await refreshAccessToken(live);
    expect(out.error).toBe(AuthErrorType.REFRESH_TOKEN_ERROR);
    expect(isSessionEndedError(out.error)).toBe(false);
  });

  it.each([AuthErrorType.SESSION_ENDED, AuthErrorType.ACCOUNT_DISABLED])(
    'токен с %s в /auth/refresh больше не ходит',
    async (error) => {
      const out = await jwt({ token: { ...live, error } });
      expect(out.error).toBe(error);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it('кука до правки (RefreshAccessTokenError + «никогда») становится SessionEnded без запроса', async () => {
    const out = await jwt({
      token: {
        ...live,
        error: AuthErrorType.REFRESH_TOKEN_ERROR,
        refreshRetryAt: REFRESH_RETRY_NEVER,
      },
    });
    expect(out.error).toBe(AuthErrorType.SESSION_ENDED);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('соцвход: отказ бэкенда с кодом блокировки — AccountDisabled, иначе InvalidCredentials', async () => {
    const login = (body: unknown) => {
      fetchMock.mockResolvedValueOnce(reply(401, body));
      return jwt({
        token: {} as JWT,
        user: { id: 'u' },
        account: { provider: 'google', id_token: 'idt' },
      });
    };
    expect((await login({ code: 'ACCOUNT_DISABLED' })).error).toBe(AuthErrorType.ACCOUNT_DISABLED);
    // Пароля человек не вводил: «вход не удался», а не «неверный пароль».
    expect((await login({ message: 'Invalid credentials' })).error).toBe(
      AuthErrorType.AUTHENTICATION_FAILED
    );
  });

  it('соцвход: провайдер без id_token и обрыв сети — AuthenticationFailed, refresh не зовётся', async () => {
    const noProof = await jwt({
      token: {} as JWT,
      user: { id: 'u' },
      account: { provider: 'google' },
    });
    expect(noProof.error).toBe(AuthErrorType.AUTHENTICATION_FAILED);

    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    const broken = await jwt({
      token: {} as JWT,
      user: { id: 'u' },
      account: { provider: 'google', id_token: 'idt' },
    });
    expect(broken.error).toBe(AuthErrorType.AUTHENTICATION_FAILED);

    // Следующий вызов колбэка с таким токеном в /auth/refresh не идёт.
    fetchMock.mockClear();
    await jwt({ token: broken });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([429, 503])(
    'соцвход: временный сбой бэкенда (%i) — AuthenticationFailed, а не «неверные данные»',
    async (status) => {
      fetchMock.mockResolvedValueOnce(reply(status));
      const out = await jwt({
        token: {} as JWT,
        user: { id: 'u' },
        account: { provider: 'google', id_token: 'idt' },
      });
      expect(out.error).toBe(AuthErrorType.AUTHENTICATION_FAILED);
    }
  );

  it('парольный вход: 401 с кодом блокировки отдаёт код AccountDisabled, обычный 401 — InvalidCredentials', async () => {
    const providers = authOptions.providers as unknown as Array<{
      options?: { authorize?: (c: unknown, r: Request) => Promise<unknown> };
    }>;
    const authorize = providers.find((p) => p.options?.authorize)?.options?.authorize;
    expect(authorize).toBeTypeOf('function');
    const attempt = async (body: unknown) => {
      fetchMock.mockResolvedValueOnce(reply(401, body));
      try {
        await authorize!({ email: 'a@b.c', password: 'p' }, new Request('http://x'));
        return undefined;
      } catch (e) {
        return (e as { code?: string }).code;
      }
    };
    expect(await attempt({ code: 'ACCOUNT_DISABLED' })).toBe(AuthErrorType.ACCOUNT_DISABLED);
    expect(await attempt({ message: 'Invalid credentials' })).toBe(
      AuthErrorType.INVALID_CREDENTIALS
    );
  });

  it('конец сессии — ровно четыре ошибки; временный отказ и чужие строки — нет', () => {
    expect(
      [
        AuthErrorType.SESSION_ENDED,
        AuthErrorType.ACCOUNT_DISABLED,
        AuthErrorType.INVALID_CREDENTIALS,
        AuthErrorType.AUTHENTICATION_FAILED,
      ].every(isSessionEndedError)
    ).toBe(true);
    expect(isSessionEndedError(AuthErrorType.REFRESH_TOKEN_ERROR)).toBe(false);
    expect(isSessionEndedError(AuthErrorType.RATE_LIMIT_EXCEEDED)).toBe(false);
    expect(isSessionEndedError(undefined)).toBe(false);
  });

  it('сырой токен: старая кука (RefreshAccessTokenError + «никогда») — тоже конец сессии', () => {
    expect(
      isTokenSessionEnded({
        error: AuthErrorType.REFRESH_TOKEN_ERROR,
        refreshRetryAt: REFRESH_RETRY_NEVER,
      })
    ).toBe(true);
    expect(
      isTokenSessionEnded({ error: AuthErrorType.REFRESH_TOKEN_ERROR, refreshRetryAt: 1 })
    ).toBe(false);
  });

  it('причина выхода на странице входа — ключ из общей карты, чужие строки игнорируются', () => {
    expect(sessionEndReasonDictKey('AccountDisabled')).toBe('auth.signin.accountDisabled');
    expect(sessionEndReasonDictKey('SessionEnded')).toBe('auth.signin.sessionEnded');
    expect(sessionEndReasonDictKey('InvalidCredentials')).toBe('auth.signin.invalidCredentials');
    expect(sessionEndReasonDictKey('toString')).toBeNull();
    expect(sessionEndReasonDictKey('RefreshAccessTokenError')).toBeNull();
    expect(sessionEndReasonDictKey(null)).toBeNull();
  });
});
