import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getReaderBootstrap } from '@/api/endpoints/public';
import { BACKEND_PROXY_HEADER, BACKEND_PROXY_PREFIX } from '@/lib/backend-proxy.constants';
import { setSession } from '@/lib/http-client/auth';

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(async () => null),
  signOut: vi.fn(),
}));

/**
 * `LEGACY-088`. Читалка открыта анониму, но прогресс чтения принадлежит
 * владельцу токена. До 10.08.2026 читателя называл query-параметр `?userId=`,
 * взятый из сессии на клиенте, — то есть значение, которое подменяется в
 * адресной строке. Подставив чужой идентификатор (их раздавал `GET /comments`
 * вместе с почтой, `LEGACY-089`), аноним узнавал, что человек читает и на каком
 * месте остановился.
 *
 * ⚠️ Проверяется именно **отсутствие** параметра в URL, а не наличие заголовка:
 * пока идентификатор ехал в адресе, любой заголовок сверху ничего не менял.
 */
describe('getReaderBootstrap — читатель приходит токеном, а не параметром', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setSession(null);
  });

  const lastCall = () => fetchMock.mock.calls[0] as [string, RequestInit];

  // 🔴 Сам дефект.
  it('никогда не кладёт userId в адрес', async () => {
    setSession({ user: { id: 'user-1' } } as never);

    await getReaderBootstrap('en', 'hamlet');

    const [url] = lastCall();
    expect(url).not.toContain('userId');
    expect(url).toContain('/en/books/hamlet/reader-bootstrap');
  });

  // `reader-bootstrap` гео-зависима: страну читателя серверный прокси передаёт сам
  // (`X-Visitor-Country`, `LEGACY-465`, решение арбитра 12.10.2026, заход 2). Токена в браузере нет.
  it('идёт через серверный прокси без токена, когда сессия есть', async () => {
    setSession({ user: { id: 'user-1' } } as never);

    await getReaderBootstrap('en', 'hamlet');

    const [url, init] = lastCall();
    expect(url.startsWith(`${BACKEND_PROXY_PREFIX}/`)).toBe(true);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect((init.headers as Record<string, string>)[BACKEND_PROXY_HEADER]).toBe('1');
  });

  /**
   * ⚠️ Отсутствие сессии здесь не ошибка: читалка обязана открываться без
   * входа. Обычный `httpGetAuth` в этом случае бросает 401, не дойдя до сети, —
   * поэтому маршруту и понадобился режим `optionalAuth`.
   */
  it('идёт анонимом без сессии, а не падает с 401', async () => {
    setSession(null);

    await expect(getReaderBootstrap('en', 'hamlet')).resolves.toBeDefined();

    const [url, init] = lastCall();
    expect(url.startsWith(BACKEND_PROXY_PREFIX)).toBe(false);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
