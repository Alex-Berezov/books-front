// @vitest-environment node
import { encode } from 'next-auth/jwt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revokeBackendSessionsAction } from '@/lib/auth/revoke-sessions.action';

const { headersMock } = vi.hoisted(() => ({ headersMock: vi.fn() }));

vi.mock('next/headers', () => ({ headers: headersMock }));

const SECRET = 'test-secret-for-session-cookie-roundtrip';

/**
 * `LEGACY-451`, `T122`: серверное действие выхода читает refresh из **настоящей** куки Auth.js
 * (`getToken` не подменён): имя куки, соль и расшифровка — те же, что у живой сессии.
 * Сменятся они в Auth.js — эта спека покраснеет, а не выход молча перестанет гасить сессии.
 */
describe('отзыв сессий по настоящей куке Auth.js (LEGACY-451)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv('NEXTAUTH_SECRET', SECRET);
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([['__Secure-authjs.session-token'], ['authjs.session-token']])(
    'кука %s: refresh уходит в POST /auth/logout',
    async (cookieName) => {
      const cookie = await encode({
        token: { sub: 'u1', refreshToken: 'ref-from-cookie' },
        secret: SECRET,
        salt: cookieName,
      });
      headersMock.mockReturnValue(new Headers({ cookie: `${cookieName}=${cookie}` }));

      await revokeBackendSessionsAction();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toMatch(/\/auth\/logout$/);
      expect(JSON.parse(init.body as string)).toEqual({ refreshToken: 'ref-from-cookie' });
    }
  );

  it('кука чужим секретом — к бэкенду не ходит', async () => {
    const cookie = await encode({
      token: { sub: 'u1', refreshToken: 'ref' },
      secret: 'another-secret-entirely-different',
      salt: 'authjs.session-token',
    });
    headersMock.mockReturnValue(new Headers({ cookie: `authjs.session-token=${cookie}` }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await revokeBackendSessionsAction();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
