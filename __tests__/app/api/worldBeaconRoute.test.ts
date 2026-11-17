// @vitest-environment node
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * F08-3b, `product.md` §14: маршрут `/api/world/beacon` ставит `X-Visitor-IP` (без него запрос
 * сервера фронта идёт мимо лимита, `LEGACY-064`), пересобирает тело из трёх полей и не пересылает
 * ни куки, ни `Authorization`.
 */

const SITE = 'https://bibliaris.com';
const fetchMock = vi.fn();

/** Адрес посетителя по умолчанию: без него маршрут в API не ходит вовсе (тест ниже). */
const VISITOR_IP = '198.51.100.20';

const call = async (
  body: unknown,
  headers: Record<string, string> = {},
  { withIp = true }: { withIp?: boolean } = {}
) => {
  const { POST } = await import('@/app/api/world/beacon/route');
  return POST(
    new Request(`${SITE}/api/world/beacon`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bibliaris-proxy': '1',
        'sec-fetch-site': 'same-origin',
        ...(withIp ? { 'cf-connecting-ip': VISITOR_IP } : {}),
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
};

describe('POST /api/world/beacon', () => {
  const env = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    if (env === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = env;
  });

  it('ставит X-Visitor-IP из cf-connecting-ip и пересылает событие в API', async () => {
    const res = await call(
      { bookVersionId: 'ver-1', key: 'ophelia', event: 'view' },
      { 'cf-connecting-ip': '203.0.113.7', 'user-agent': 'Mozilla/5.0 Test' }
    );

    expect(res.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname.endsWith('/world/beacon')).toBe(true);
    const headers = new Headers(init.headers);
    expect(headers.get('x-visitor-ip')).toBe('203.0.113.7');
    expect(headers.get('user-agent')).toBe('Mozilla/5.0 Test');
    expect(headers.get('content-type')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({
      bookVersionId: 'ver-1',
      key: 'ophelia',
      event: 'view',
    });
  });

  it('x-forwarded-for без cf-connecting-ip: первый адрес слева уходит в X-Visitor-IP', async () => {
    const res = await call(
      { bookVersionId: 'ver-1', event: 'view' },
      { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
      { withIp: false }
    );

    expect(res.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = new Headers((fetchMock.mock.calls[0] as [URL, RequestInit])[1].headers);
    expect(headers.get('x-visitor-ip')).toBe('203.0.113.9');
  });

  it('адреса посетителя нет - 204, в API ничего не уходит (иначе событие мимо лимита)', async () => {
    const res = await call({ bookVersionId: 'ver-1', event: 'view' }, {}, { withIp: false });

    expect(res.status).toBe(204);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('куки, Authorization и прочие заголовки браузера в API не уходят', async () => {
    const res = await call(
      { bookVersionId: 'ver-1', event: 'view' },
      {
        cookie: 'session=secret',
        authorization: 'Bearer x',
        'x-visitor-country': 'US',
        'x-forwarded-host': 'evil.example',
        'user-agent': 'Mozilla/5.0 Test',
      }
    );

    expect(res.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = (fetchMock.mock.calls[0] as [URL, RequestInit])[1];
    expect(init.credentials).toBeUndefined();
    const headers = new Headers(init.headers);
    expect(headers.has('cookie')).toBe(false);
    expect(headers.has('authorization')).toBe(false);
    expect(headers.has('x-visitor-country')).toBe(false);
    expect(headers.has('x-forwarded-host')).toBe(false);
    // Белый список целиком: ровно три заголовка, никаких других.
    expect([...headers.keys()].sort()).toEqual(['content-type', 'user-agent', 'x-visitor-ip']);
  });

  it.each([
    ['чужое поле', { bookVersionId: 'v', event: 'view', userId: 'u1' }],
    ['неизвестное событие', { bookVersionId: 'v', event: 'click' }],
    ['пустой ключ', { bookVersionId: 'v', key: '', event: 'view' }],
    ['нет версии', { event: 'view' }],
    ['не объект', ['view']],
    ['не JSON', 'event=view'],
  ])('%s - 400 и в API ничего не уходит', async (_name, body) => {
    expect((await call(body)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('межсайтовый запрос и запрос без своего заголовка - 403', async () => {
    const body = { bookVersionId: 'v', event: 'view' };
    expect((await call(body, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect((await call(body, { 'x-bibliaris-proxy': '0' })).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('статус API (429 лимитера) передаётся, недоступный API - 502, ответ не кэшируется', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 }));
    const limited = await call({ bookVersionId: 'v', event: 'view' });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('cache-control')).toBe('private, no-store');

    fetchMock.mockRejectedValueOnce(new Error('down'));
    expect((await call({ bookVersionId: 'v', event: 'view' })).status).toBe(502);
  });
});
