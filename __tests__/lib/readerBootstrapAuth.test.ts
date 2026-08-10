import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getReaderBootstrap } from '@/api/endpoints/public';
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
    setSession({ accessToken: 'token-1', user: { id: 'user-1' } } as never);

    await getReaderBootstrap('en', 'hamlet');

    const [url] = lastCall();
    expect(url).not.toContain('userId');
    expect(url).toContain('/en/books/hamlet/reader-bootstrap');
  });

  it('прикладывает токен, когда сессия есть', async () => {
    setSession({ accessToken: 'token-1', user: { id: 'user-1' } } as never);

    await getReaderBootstrap('en', 'hamlet');

    const [, init] = lastCall();
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-1');
  });

  /**
   * ⚠️ Отсутствие сессии здесь не ошибка: читалка обязана открываться без
   * входа. Обычный `httpGetAuth` в этом случае бросает 401, не дойдя до сети, —
   * поэтому маршруту и понадобился режим `optionalAuth`.
   */
  it('идёт анонимом без сессии, а не падает с 401', async () => {
    setSession(null);

    await expect(getReaderBootstrap('en', 'hamlet')).resolves.toBeDefined();

    const [, init] = lastCall();
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
