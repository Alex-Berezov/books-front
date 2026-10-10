// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accessTokenExpiresAt, authOptions } from '@/lib/auth/config';
import {
  AUTH_REQUEST_TIMEOUTS,
  AUTH_TOKEN_EXPIRY,
  AuthErrorType,
  REFRESH_RETRY_NEVER,
} from '@/lib/auth/constants';
import { SESSION_CACHE_TIME } from '@/lib/http-client/auth';
import type { Account, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

/**
 * `LEGACY-451`, пачка `T122` (решения арбитра 10.10.2026, `decisions-log.md`).
 *
 * Бэкенд перестал продлевать сессию и научился её гасить. Фронт обязан: не повторять отказ
 * refresh на каждом вызове колбэка `jwt` (иначе мёртвые сессии выедают общий лимит
 * `/auth/refresh`) и брать срок access из самого токена с запасом на часы. Отзыв сессий
 * при выходе — `revokeSessions.test.ts`.
 */

type JwtCallback = (params: { token: JWT; user?: User; account?: Account | null }) => Promise<JWT>;
const options = authOptions as unknown as {
  callbacks: { jwt: JwtCallback };
  events?: unknown;
};

/** Неподписанный JWT с нужными полями: фронт подпись не проверяет, только читает `exp`. */
function fakeJwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}.signature`;
}

const NOW = new Date('2026-10-10T12:00:00Z').getTime();
const NOW_SEC = Math.floor(NOW / 1000);
const SKEW = AUTH_TOKEN_EXPIRY.ACCESS_TOKEN_SKEW_MS;

describe('сессии после T122 (LEGACY-451)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('запас до exp больше кэша сессии в браузере: иначе повтор после 401 берёт тот же токен', () => {
    expect(AUTH_TOKEN_EXPIRY.ACCESS_TOKEN_SKEW_MS).toBeGreaterThan(SESSION_CACHE_TIME);
  });

  describe('accessTokenExpiresAt', () => {
    it('берёт срок из exp токена с запасом на часы', () => {
      const exp = NOW_SEC + 600;
      expect(accessTokenExpiresAt(fakeJwt({ sub: 'u1', exp }))).toBe(exp * 1000 - SKEW);
    });

    it('токен живёт меньше запаса — свой точный exp, а не «сейчас» (иначе обновление по кругу)', () => {
      expect(accessTokenExpiresAt(fakeJwt({ exp: NOW_SEC + 10 }))).toBe((NOW_SEC + 10) * 1000);
    });

    it('exp уже в прошлом — в прошлом: одно обновление, без запаса', () => {
      expect(accessTokenExpiresAt(fakeJwt({ exp: NOW_SEC - 3600 }))).toBe((NOW_SEC - 3600) * 1000);
      expect(accessTokenExpiresAt(fakeJwt({ exp: 0 }))).toBe(0);
    });

    it.each([
      ['не строка', undefined],
      ['не JWT', 'opaque-token'],
      ['битый base64', 'a.@@@.b'],
      ['без exp', fakeJwt({ sub: 'u1' })],
      ['exp не число', fakeJwt({ exp: 'soon' })],
    ])('%s — прежняя константа от «сейчас», а не 0', (_label, token) => {
      expect(accessTokenExpiresAt(token)).toBe(NOW + AUTH_TOKEN_EXPIRY.ACCESS_TOKEN_MS);
    });
  });

  describe('колбэк jwt', () => {
    const expired: JWT = {
      id: 'u1',
      email: 'a@example.com',
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      accessTokenExpires: NOW - 1,
    } as JWT;

    const okRefresh = () =>
      new Response(
        JSON.stringify({
          accessToken: fakeJwt({ sub: 'u1', exp: NOW_SEC + 900 }),
          refreshToken: 'r2',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    it.each([400, 401])(
      'окончательный отказ (%i) больше в /auth/refresh не ходит — и после паузы',
      async (status) => {
        fetchMock.mockResolvedValue(new Response(null, { status }));

        const failed = await options.callbacks.jwt({ token: expired });
        expect(failed.error).toBe(AuthErrorType.REFRESH_TOKEN_ERROR);
        expect(failed.refreshRetryAt).toBe(REFRESH_RETRY_NEVER);
        // Отметка переживает куку: JSON не превращает её в `null`, как `Infinity`.
        expect(JSON.parse(JSON.stringify(failed)).refreshRetryAt).toBe(REFRESH_RETRY_NEVER);

        await options.callbacks.jwt({ token: failed });
        vi.advanceTimersByTime(AUTH_REQUEST_TIMEOUTS.REFRESH_RETRY_PAUSE_MS * 10);
        const later = await options.callbacks.jwt({ token: failed });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(later).toBe(failed);
      }
    );

    it.each([
      ['429', () => fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 }))],
      ['503', () => fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }))],
      ['403 от WAF', () => fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }))],
      ['обрыв сети', () => fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))],
    ])(
      'временный отказ (%s): в паузе не ходит, после паузы повторяет и лечит сессию',
      async (_l, fail) => {
        fail();
        fetchMock.mockResolvedValueOnce(okRefresh());

        const failed = await options.callbacks.jwt({ token: expired });
        // В паузе `error` стоит: читалка пишет прогресс локально, а не шлёт истёкший access.
        expect(failed.error).toBe(AuthErrorType.REFRESH_TOKEN_ERROR);
        expect(failed.refreshRetryAt).toBe(NOW + AUTH_REQUEST_TIMEOUTS.REFRESH_RETRY_PAUSE_MS);

        const inPause = await options.callbacks.jwt({ token: failed });
        expect(inPause).toBe(failed);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(AUTH_REQUEST_TIMEOUTS.REFRESH_RETRY_PAUSE_MS);
        const healed = await options.callbacks.jwt({ token: failed });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(healed.error).toBeUndefined();
        expect(healed.refreshRetryAt).toBeUndefined();
        expect(healed.refreshToken).toBe('r2');
      }
    );

    it('кука до T122 с error без отметки: один повтор, удачный лечит сессию', async () => {
      fetchMock.mockResolvedValueOnce(okRefresh());
      const legacy = { ...expired, error: AuthErrorType.REFRESH_TOKEN_ERROR } as JWT;

      const healed = await options.callbacks.jwt({ token: legacy });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(healed.error).toBeUndefined();
      expect(healed.refreshToken).toBe('r2');
    });

    it('кука до T122: сохранённый срок «вход + 12 ч» не держит истёкший по exp access', async () => {
      fetchMock.mockResolvedValueOnce(okRefresh());
      const legacy = {
        ...expired,
        accessToken: fakeJwt({ sub: 'u1', exp: NOW_SEC - 1 }),
        accessTokenExpires: NOW + AUTH_TOKEN_EXPIRY.ACCESS_TOKEN_MS,
      } as JWT;

      const refreshed = await options.callbacks.jwt({ token: legacy });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(refreshed.refreshToken).toBe('r2');
    });

    it('живой по exp access не обновляется', async () => {
      const alive = {
        ...expired,
        accessToken: fakeJwt({ sub: 'u1', exp: NOW_SEC + 3600 }),
        accessTokenExpires: NOW + 3_600_000,
      } as JWT;

      const same = await options.callbacks.jwt({ token: alive });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(same).toBe(alive);
    });

    it('удачный refresh ставит срок access из exp нового токена', async () => {
      const exp = NOW_SEC + 300;
      const accessToken = fakeJwt({ sub: 'u1', exp });
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ accessToken, refreshToken: 'new-refresh' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const refreshed = await options.callbacks.jwt({ token: expired });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(refreshed.accessToken).toBe(accessToken);
      expect(refreshed.accessTokenExpires).toBe(exp * 1000 - SKEW);
      expect(refreshed.error).toBeUndefined();
    });

    it('вход паролем ставит срок access из exp выданного токена', async () => {
      const exp = NOW_SEC + 1200;
      const accessToken = fakeJwt({ sub: 'u1', exp });
      const user = {
        id: 'u1',
        email: 'a@example.com',
        roles: ['user'],
        accessToken,
        refreshToken: 'r1',
      } as unknown as User;

      const token = await options.callbacks.jwt({
        token: {} as JWT,
        user,
        account: { provider: 'credentials' } as Account,
      });

      expect(token.accessTokenExpires).toBe(exp * 1000 - SKEW);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('вход через провайдера ставит срок access из exp выданного токена', async () => {
    const exp = NOW_SEC + 1200;
    const accessToken = fakeJwt({ sub: 'u1', exp });
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          user: { id: 'u1', email: 'a@example.com', roles: ['user'] },
          accessToken,
          refreshToken: 'r1',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const token = await options.callbacks.jwt({
      token: {} as JWT,
      user: { id: 'g', email: 'a@example.com' } as User,
      account: { provider: 'google', id_token: 'google-id-token' } as Account,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as [string])[0]).toMatch(/\/auth\/social$/);
    expect(token.accessTokenExpires).toBe(exp * 1000 - SKEW);
  });

  it('Auth.js не гасит сессии бэкенда своим событием выхода: это делает только кнопка', () => {
    // `events.signOut` не знает, кто вызвал выход; автоматический выход по 401 гасил бы
    // сессии на всех устройствах (решение арбитра 10.10.2026).
    expect(options.events).toBeUndefined();
  });
});
