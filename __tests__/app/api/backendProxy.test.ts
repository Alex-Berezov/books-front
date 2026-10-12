// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthErrorType } from '@/lib/auth/constants';
import {
  BACKEND_PROXY_HEADER,
  BACKEND_PROXY_HEADER_VALUE,
  BACKEND_PROXY_MAX_BODY_BYTES,
  BACKEND_PROXY_UPSTREAM_TIMEOUT_MS,
} from '@/lib/backend-proxy.constants';
import { API_BASE_URL } from '@/lib/http.constants';
import type { JWT } from 'next-auth/jwt';

/**
 * LEGACY-465, пачка T127 (заход 1). Серверный прокси авторизованных запросов браузера:
 * токен берётся из JWT-куки сессии на сервере (`getToken`), браузер его не шлёт. Кук прокси
 * не пишет вовсе: иначе запрос, летевший в момент выхода, вернул бы стёртую сессию (решение
 * арбитра 12.10.2026).
 *
 * Каждый отказ закреплён отдельно: прокси с токеном пользователя — это CSRF-мишень
 * (чужая страница шлёт запрос с кукой посетителя) и SSRF-мишень (путь уводит запрос
 * с API вместе с токеном). Отказ обязан случиться **до** похода в сеть.
 */

const getTokenMock = vi.hoisted(() => vi.fn());

vi.mock('next-auth/jwt', () => ({ getToken: getTokenMock }));

const { GET, POST, PATCH, PUT, DELETE } = await import('@/app/api/backend/[...path]/route');
type RouteHandler = (req: NextRequest) => Promise<Response>;
const get = GET as unknown as RouteHandler;
const post = POST as unknown as RouteHandler;
const patch = PATCH as unknown as RouteHandler;
const put = PUT as unknown as RouteHandler;
const del = DELETE as unknown as RouteHandler;

/**
 * Адрес, на котором слушает процесс Next. В рабочем сервере `req.url`/`nextUrl` собраны из
 * `HOSTNAME:PORT` (`0.0.0.0:3000` в образе), а не из адреса посетителя — это сценарий ревью
 * ревью: прокси обязан опираться на адрес сайта из настроек, а не на адрес запроса.
 */
const SITE = 'http://0.0.0.0:3000';
/** Публичный адрес сайта (`NEXT_PUBLIC_SITE_URL`). */
const PUBLIC_SITE = 'https://bibliaris.example';

const sessionToken = (extra: Partial<JWT> = {}): JWT =>
  ({
    id: 'u1',
    email: 'reader@example.com',
    roles: ['user'],
    accessToken: 'access-123',
    refreshToken: 'refresh-1',
    ...extra,
  }) as JWT;

const proxyRequest = (
  path: string,
  init: { method?: string; headers?: Record<string, string>; body?: BodyInit } = {}
): NextRequest =>
  new NextRequest(`${SITE}/api/backend${path}`, {
    method: init.method ?? 'GET',
    headers: {
      [BACKEND_PROXY_HEADER]: BACKEND_PROXY_HEADER_VALUE,
      'sec-fetch-site': 'same-origin',
      ...init.headers,
    },
    body: init.body,
    // `duplex` нужен Node для тела-потока; для строки он безвреден.
    ...(init.body ? { duplex: 'half' } : {}),
  } as ConstructorParameters<typeof NextRequest>[1]);

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', PUBLIC_SITE);
  vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
  getTokenMock.mockReset();
  getTokenMock.mockResolvedValue(sessionToken());
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        date: 'Mon, 12 Oct 2026 10:00:00 GMT',
        'set-cookie': 'upstream=1',
        'access-control-allow-origin': '*',
      },
    })
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const upstreamCall = () => {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), init: init as RequestInit, headers: new Headers(init?.headers) };
};

describe('backend proxy: what reaches the API', () => {
  it('sends the session token, not the browser cookie or a browser Authorization', async () => {
    const res = await get(
      proxyRequest('/users/me?lang=en', {
        headers: {
          cookie: 'authjs.session-token=secret',
          authorization: 'Bearer forged',
          'accept-language': 'fr',
          'cf-connecting-ip': '198.51.100.7',
        },
      })
    );

    expect(res.status).toBe(200);
    const { url, headers, init } = upstreamCall();
    expect(url).toBe(`${API_BASE_URL}/users/me?lang=en`);
    expect(headers.get('authorization')).toBe('Bearer access-123');
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('accept-language')).toBe('fr');
    expect(headers.get('x-visitor-ip')).toBe('198.51.100.7');
    expect(init.redirect).toBe('manual');
  });

  it('picks the cookie name by the public site protocol, not by the process address', async () => {
    // Процесс слушает http://0.0.0.0:3000, сайт открыт по https — кука `__Secure-`.
    await get(proxyRequest('/users/me'));
    expect(getTokenMock).toHaveBeenCalledTimes(1);
    expect(getTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ secureCookie: true, secret: 'test-secret' })
    );

    // http-стенд: кука без префикса.
    getTokenMock.mockClear();
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://stand.example');
    await get(proxyRequest('/users/me'));
    expect(getTokenMock).toHaveBeenCalledWith(expect.objectContaining({ secureCookie: false }));
  });

  it('the cookie name follows x-forwarded-proto first, as Auth.js does', async () => {
    // Сайт в настройках на https, а запрос пришёл по http (dev, http-стенд) — Auth.js поставил
    // куку без префикса, её и ищем.
    await get(proxyRequest('/users/me', { headers: { 'x-forwarded-proto': 'http' } }));
    expect(getTokenMock).toHaveBeenLastCalledWith(expect.objectContaining({ secureCookie: false }));

    await get(proxyRequest('/users/me', { headers: { 'x-forwarded-proto': 'https, http' } }));
    expect(getTokenMock).toHaveBeenLastCalledWith(expect.objectContaining({ secureCookie: true }));

    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://stand.example');
    await get(proxyRequest('/users/me', { headers: { 'x-forwarded-proto': 'https' } }));
    expect(getTokenMock).toHaveBeenLastCalledWith(expect.objectContaining({ secureCookie: true }));
  });

  it('401 without a session leaves the body unread', async () => {
    getTokenMock.mockResolvedValue(null);
    let pulls = 0;
    // `highWaterMark: 0` — поток не заполняет очередь сам, `pull` зовётся только на чтение.
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulls += 1;
          controller.enqueue(new TextEncoder().encode('{}'));
          controller.close();
        },
      },
      { highWaterMark: 0 }
    );

    const res = await post(
      proxyRequest('/me/bookshelf', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      })
    );

    expect(res.status).toBe(401);
    expect(pulls).toBe(0);
  });

  it('401 for a session token without access: no anonymous call on behalf of the user', async () => {
    getTokenMock.mockResolvedValue(sessionToken({ accessToken: undefined }));
    const res = await get(proxyRequest('/users/me'));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never writes a cookie: the session is renewed only by /api/auth/session', async () => {
    const res = await get(proxyRequest('/users/me'));
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('forwards a session whose last refresh failed temporarily with its token as is', async () => {
    getTokenMock.mockResolvedValue(
      sessionToken({
        error: AuthErrorType.REFRESH_TOKEN_ERROR,
        refreshRetryAt: Date.now() + 60_000,
      })
    );
    await get(proxyRequest('/users/me'));
    expect(upstreamCall().headers.get('authorization')).toBe('Bearer access-123');
  });

  it('keeps the response private and drops API-only headers', async () => {
    const res = await get(proxyRequest('/users/me'));

    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('date')).toBe('Mon, 12 Oct 2026 10:00:00 GMT');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    expect(await res.json()).toEqual({ ok: true });
  });

  it('passes the API status through, including 401 for the client retry', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ statusCode: 401, message: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    );
    const res = await get(proxyRequest('/users/me'));
    expect(res.status).toBe(401);
  });

  it('forwards a JSON body as is', async () => {
    await post(
      proxyRequest('/me/bookshelf', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: PUBLIC_SITE },
        body: JSON.stringify({ versionId: 'v1' }),
      })
    );
    const { init, headers } = upstreamCall();
    expect(init.method).toBe('POST');
    expect(headers.get('content-type')).toBe('application/json');
    expect(new TextDecoder().decode(init.body as Uint8Array)).toBe('{"versionId":"v1"}');
  });

  it('answers 502 when the API is unreachable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    const res = await get(proxyRequest('/users/me'));
    expect(res.status).toBe(502);
  });

  it('answers 504 when the API does not answer in time', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'));
    const res = await get(proxyRequest('/users/me'));
    expect(res.status).toBe(504);
  });

  it('504 when the API hangs: the route timer aborts the wait', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementationOnce(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
          })
      );
      const pending = get(proxyRequest('/users/me'));
      await vi.advanceTimersByTimeAsync(BACKEND_PROXY_UPSTREAM_TIMEOUT_MS + 1);
      expect((await pending).status).toBe(504);
    } finally {
      vi.useRealTimers();
    }
  });

  it('times out only the wait for the API answer, not a response already streaming', async () => {
    vi.useFakeTimers();
    try {
      const res = await get(proxyRequest('/users/me'));
      const { init } = upstreamCall();
      vi.advanceTimersByTime(BACKEND_PROXY_UPSTREAM_TIMEOUT_MS + 1);
      expect((init.signal as AbortSignal).aborted).toBe(false);
      expect(await res.json()).toEqual({ ok: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it('a session cookie the proxy cannot read is a private 500, not an unhandled error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getTokenMock.mockRejectedValueOnce(new Error('MissingSecret'));

    const res = await get(proxyRequest('/users/me'));

    expect(res.status).toBe(500);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a body upload the browser aborts is 499, not an unhandled error', async () => {
    const controller = new AbortController();
    const body = new ReadableStream<Uint8Array>(
      {
        pull() {
          controller.abort();
          throw new DOMException('aborted', 'AbortError');
        },
      },
      { highWaterMark: 0 }
    );
    const req = proxyRequest('/me/bookshelf', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    Object.defineProperty(req, 'signal', { value: controller.signal });

    const res = await post(req);

    expect(res.status).toBe(499);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not report an outage when the browser cancelled the request itself', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const controller = new AbortController();
    const req = proxyRequest('/users/me');
    Object.defineProperty(req, 'signal', { value: controller.signal });
    fetchMock.mockImplementationOnce(async () => {
      controller.abort();
      throw new DOMException('aborted', 'AbortError');
    });

    const res = await get(req);

    expect(res.status).toBe(499);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it.each([205, 304])(
    'a %i from the API passes through without a body instead of a 500',
    async (status) => {
      // У ответа `fetch` тело-поток есть всегда (пусть пустой); `Response` с телом и таким
      // статусом не собрать, поэтому — объект той же формы.
      fetchMock.mockResolvedValueOnce({
        status,
        headers: new Headers(),
        body: new ReadableStream(),
      } as unknown as Response);
      const res = await get(proxyRequest('/users/me'));
      expect(res.status).toBe(status);
    }
  );

  it('keeps an empty 204 empty and forwards content-length 0 of an empty 200', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const noContent = await del(proxyRequest('/me/bookshelf/v1', { method: 'DELETE' }));
    expect(noContent.status).toBe(204);
    expect(await noContent.text()).toBe('');

    fetchMock.mockResolvedValueOnce(
      new Response('', { status: 200, headers: { 'content-length': '0' } })
    );
    const empty = await get(proxyRequest('/users/me'));
    expect(empty.headers.get('content-length')).toBe('0');
  });

  it('does not hand a redirect target to the browser', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: 'https://elsewhere.example/' } })
    );
    const res = await get(proxyRequest('/users/me'));
    expect(upstreamCall().init.redirect).toBe('manual');
    expect(res.headers.get('location')).toBeNull();
  });

  it.each([
    ['PATCH', patch],
    ['PUT', put],
    ['DELETE', del],
  ])('%s forwards its JSON body with the session token', async (method, handler) => {
    await handler(
      proxyRequest('/users/me', {
        method,
        headers: { 'content-type': 'application/json' },
        body: '{"name":"N"}',
      })
    );
    const { init, headers } = upstreamCall();
    expect(init.method).toBe(method);
    expect(headers.get('authorization')).toBe('Bearer access-123');
    expect(new TextDecoder().decode(init.body as Uint8Array)).toBe('{"name":"N"}');
  });

  it('passes an old browser GET that sends neither Sec-Fetch-Site nor Origin', async () => {
    const req = new NextRequest(`${SITE}/api/backend/users/me`, {
      headers: { [BACKEND_PROXY_HEADER]: BACKEND_PROXY_HEADER_VALUE },
    });
    expect((await get(req)).status).toBe(200);
  });

  it('trusts Sec-Fetch-Site over Origin when the browser sends it', async () => {
    // Браузер с `Sec-Fetch-Site: same-origin` пропускается без сверки Origin: её решает
    // браузер, а не адрес из настроек.
    const res = await post(
      proxyRequest('/me/bookshelf', {
        method: 'POST',
        headers: { origin: 'https://www.localhost:3000', 'content-type': 'application/json' },
        body: '{}',
      })
    );
    expect(res.status).toBe(200);
  });
});

describe('backend proxy: refusals before the network', () => {
  const expectRefused = async (res: Response, status: number) => {
    expect(res.status).toBe(status);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  };

  it('401 without a session cookie — the proxy is not an open relay', async () => {
    getTokenMock.mockResolvedValue(null);
    await expectRefused(await get(proxyRequest('/users/me')), 401);
  });

  it.each([
    ['SessionEnded', {}],
    ['RefreshAccessTokenError', { refreshRetryAt: Number.MAX_SAFE_INTEGER }],
  ])('401 for a session that ended (%s)', async (error, extra) => {
    getTokenMock.mockResolvedValue(sessionToken({ error, ...extra } as Partial<JWT>));
    await expectRefused(await get(proxyRequest('/users/me')), 401);
  });

  it('refuses on path, origin and body before reading the session', async () => {
    expect((await get(new NextRequest(`${SITE}/api/backend/users/me`))).status).toBe(403);
    expect((await get(proxyRequest('/auth/login'))).status).toBe(403);
    const typed = await post(
      proxyRequest('/media/upload', {
        method: 'POST',
        body: 'x',
        headers: { 'content-type': 'text/plain' },
      })
    );
    expect(typed.status).toBe(415);
    const large = await post(
      proxyRequest('/admin/pages', {
        method: 'POST',
        body: '{}',
        headers: {
          'content-type': 'application/json',
          'content-length': String(BACKEND_PROXY_MAX_BODY_BYTES + 1),
        },
      })
    );
    expect(large.status).toBe(413);
    expect(getTokenMock).not.toHaveBeenCalled();
  });

  it('403 without the proxy header', async () => {
    const req = new NextRequest(`${SITE}/api/backend/users/me`);
    await expectRefused(await get(req), 403);
  });

  it.each(['same-site', 'none'])('403 on Sec-Fetch-Site: %s', async (site) => {
    await expectRefused(
      await get(proxyRequest('/users/me', { headers: { 'sec-fetch-site': site } })),
      403
    );
  });

  it('without Sec-Fetch-Site: Origin is checked against the public site, not the process address', async () => {
    const bare = (origin: string) =>
      new NextRequest(`${SITE}/api/backend/me/bookshelf`, {
        method: 'POST',
        headers: {
          [BACKEND_PROXY_HEADER]: BACKEND_PROXY_HEADER_VALUE,
          origin,
          'content-type': 'application/json',
        },
        body: '{}',
      });

    expect((await post(bare(PUBLIC_SITE))).status).toBe(200);
    for (const origin of [SITE, 'http://bibliaris.example', 'https://evil.example', 'null', '']) {
      fetchMock.mockClear();
      await expectRefused(await post(bare(origin)), 403);
    }
  });

  it('403 on a cross-site fetch', async () => {
    await expectRefused(
      await get(proxyRequest('/users/me', { headers: { 'sec-fetch-site': 'cross-site' } })),
      403
    );
  });

  it('403 when a browser without Sec-Fetch-Site sends Origin of another host', async () => {
    const req = new NextRequest(`${SITE}/api/backend/me/bookshelf`, {
      method: 'POST',
      headers: {
        [BACKEND_PROXY_HEADER]: BACKEND_PROXY_HEADER_VALUE,
        origin: 'https://evil.example',
        'content-type': 'application/json',
      },
      body: '{}',
    });
    await expectRefused(await post(req), 403);
  });

  it('403 on the auth routes: sign-in and refresh go through Auth.js, not the proxy', async () => {
    for (const path of ['/auth/login', '/AUTH/refresh', '/%61uth/register']) {
      await expectRefused(await get(proxyRequest(path)), 403);
    }
  });

  it('415 on a body without Content-Type', async () => {
    // Строковое тело `Request` сам помечает `text/plain` — байты идут без типа вовсе.
    const req = proxyRequest('/me/bookshelf', {
      method: 'POST',
      body: new TextEncoder().encode('{"a":1}'),
    });
    expect(req.headers.get('content-type')).toBeNull();
    await expectRefused(await post(req), 415);
  });

  it.each([
    ['/../admin', 'dot-dot segment'],
    ['/%2e%2e/admin', 'encoded dot-dot'],
    ['/users/%2F%2Fevil.example', 'encoded slash'],
    ['//evil.example/x', 'empty segment, absolute-looking path'],
    ['/users/%5Cevil', 'backslash'],
  ])('400 on %s (%s)', async (path) => {
    const req = new NextRequest(new URL(`${SITE}/api/backend/placeholder`), {
      headers: {
        [BACKEND_PROXY_HEADER]: BACKEND_PROXY_HEADER_VALUE,
        'sec-fetch-site': 'same-origin',
      },
    });
    // Адрес с `..` и `//` URL нормализует при разборе, поэтому сырой путь подставляется
    // в `nextUrl` напрямую — так его увидел бы маршрут за прокси, который пути не чистит.
    Object.defineProperty(req.nextUrl, 'pathname', { value: `/api/backend${path}` });
    await expectRefused(await get(req), 400);
  });

  it.each(['multipart/form-data; boundary=x', 'application/octet-stream', 'text/plain'])(
    '415 on %s',
    async (contentType) => {
      await expectRefused(
        await post(
          proxyRequest('/media/upload', {
            method: 'POST',
            headers: { 'content-type': contentType },
            body: 'x',
          })
        ),
        415
      );
    }
  );

  it('413 when the declared length is over the limit', async () => {
    await expectRefused(
      await post(
        proxyRequest('/admin/pages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'content-length': String(BACKEND_PROXY_MAX_BODY_BYTES + 1),
          },
          body: '{}',
        })
      ),
      413
    );
  });

  it('413 when the body is over the limit without a declared length', async () => {
    const big = new Uint8Array(BACKEND_PROXY_MAX_BODY_BYTES + 1);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(big.subarray(0, BACKEND_PROXY_MAX_BODY_BYTES));
        controller.enqueue(big.subarray(BACKEND_PROXY_MAX_BODY_BYTES));
        controller.close();
      },
    });
    await expectRefused(
      await post(
        proxyRequest('/admin/pages', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: stream,
        })
      ),
      413
    );
  });
});
