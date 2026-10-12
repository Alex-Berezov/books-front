// @vitest-environment node
import { NextRequest } from 'next/server';
import { encode } from 'next-auth/jwt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/backend/[...path]/route';
import { BACKEND_PROXY_HEADER, BACKEND_PROXY_HEADER_VALUE } from '@/lib/backend-proxy.constants';

/**
 * LEGACY-465. Прокси читает куку сессии настоящим `getToken`, без мока: соседний тест
 * (`backendProxy.test.ts`) мокает `next-auth/jwt` и видит только флаг `secureCookie` в аргументах,
 * а ошибка в имени куки или в секрете на проде даёт 401 на каждый вызов и выход. Кука здесь
 * зашифрована так же, как её пишет Auth.js: `encode` с солью — именем куки.
 */

const SECRET = 'cookie-test-secret';
const SECURE_COOKIE = '__Secure-authjs.session-token';
const PLAIN_COOKIE = 'authjs.session-token';

const sessionCookie = async (name: string) =>
  `${name}=${await encode({
    token: { id: 'u1', email: 'reader@example.com', roles: ['user'], accessToken: 'access-777' },
    secret: SECRET,
    salt: name,
  })}`;

const request = (cookie: string, forwardedProto: string) =>
  new NextRequest('http://0.0.0.0:3000/api/backend/users/me', {
    headers: {
      [BACKEND_PROXY_HEADER]: BACKEND_PROXY_HEADER_VALUE,
      'sec-fetch-site': 'same-origin',
      'x-forwarded-proto': forwardedProto,
      cookie,
    },
  });

const get = GET as unknown as (req: NextRequest) => Promise<Response>;
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv('NEXTAUTH_SECRET', SECRET);
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://bibliaris.example');
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('backend proxy reads the real Auth.js session cookie', () => {
  it('https: finds the __Secure- cookie and sends its access token', async () => {
    const res = await get(request(await sessionCookie(SECURE_COOKIE), 'https'));

    expect(res.status).toBe(200);
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get('authorization')).toBe('Bearer access-777');
  });

  it('http (dev, http stand): finds the cookie without the prefix', async () => {
    const res = await get(request(await sessionCookie(PLAIN_COOKIE), 'http'));

    expect(res.status).toBe(200);
  });

  it('a cookie of the other form is not accepted: 401, nothing sent', async () => {
    const res = await get(request(await sessionCookie(PLAIN_COOKIE), 'https'));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
