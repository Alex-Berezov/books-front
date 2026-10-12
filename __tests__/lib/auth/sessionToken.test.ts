// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthErrorType, REFRESH_RETRY_NEVER } from '@/lib/auth/constants';

/**
 * LEGACY-465. Чтение access-токена из куки сессии на сервере — одним местом на прокси и на
 * заготовку `getServerAccessToken`: окончательно оконченная сессия токена не даёт, имя куки
 * выбирается так же, как у Auth.js. Настоящую куку держит `__tests__/app/api/backendProxyCookie.test.ts`.
 */

const getTokenMock = vi.hoisted(() => vi.fn());
vi.mock('next-auth/jwt', () => ({ getToken: getTokenMock }));
const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => requestHeaders.current }));

const { readSessionAccessToken } = await import('@/lib/auth/session-token');
const { getServerAccessToken } = await import('@/lib/auth/session-utils');

const SITE = new URL('https://bibliaris.example');

beforeEach(() => {
  vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
  getTokenMock.mockReset();
});

describe('readSessionAccessToken', () => {
  it('returns the access token of a live session', async () => {
    getTokenMock.mockResolvedValue({ accessToken: 'access-1' });
    await expect(readSessionAccessToken(new Headers(), SITE)).resolves.toBe('access-1');
    expect(getTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ secret: 'test-secret', secureCookie: true })
    );
  });

  it.each([
    ['no cookie', null],
    ['no access token', { id: 'u1' }],
    ['an ended session', { accessToken: 'dead', error: AuthErrorType.SESSION_ENDED }],
    [
      'a pre-T129 cookie with a final refresh failure',
      {
        accessToken: 'dead',
        error: AuthErrorType.REFRESH_TOKEN_ERROR,
        refreshRetryAt: REFRESH_RETRY_NEVER,
      },
    ],
  ])('returns null for %s', async (_name, token) => {
    getTokenMock.mockResolvedValue(token);
    await expect(readSessionAccessToken(new Headers(), SITE)).resolves.toBeNull();
  });

  // Временный отказ продления сессию не кончает: прокси шлёт прежний токен, а не 401.
  it('returns the token of a session whose refresh failed temporarily', async () => {
    getTokenMock.mockResolvedValue({
      accessToken: 'stale',
      error: AuthErrorType.REFRESH_TOKEN_ERROR,
      refreshRetryAt: Date.now() + 60_000,
    });
    await expect(readSessionAccessToken(new Headers(), SITE)).resolves.toBe('stale');
  });

  it('picks the cookie name by x-forwarded-proto first, then by the site protocol', async () => {
    getTokenMock.mockResolvedValue({ accessToken: 'a' });

    await readSessionAccessToken(new Headers({ 'x-forwarded-proto': 'http' }), SITE);
    expect(getTokenMock).toHaveBeenLastCalledWith(expect.objectContaining({ secureCookie: false }));

    await readSessionAccessToken(new Headers(), new URL('http://stand.example'));
    expect(getTokenMock).toHaveBeenLastCalledWith(expect.objectContaining({ secureCookie: false }));
  });
});

describe('getServerAccessToken', () => {
  it('reads the incoming request headers with the public site protocol', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://bibliaris.example');
    requestHeaders.current = new Headers({ cookie: 'x=1' });
    getTokenMock.mockResolvedValue({ accessToken: 'server-1' });

    await expect(getServerAccessToken()).resolves.toBe('server-1');
    expect(getTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ req: { headers: requestHeaders.current }, secureCookie: true })
    );
  });

  it('returns null for an ended session', async () => {
    getTokenMock.mockResolvedValue({ accessToken: 'dead', error: AuthErrorType.SESSION_ENDED });
    await expect(getServerAccessToken()).resolves.toBeNull();
  });
});
