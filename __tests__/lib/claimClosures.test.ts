import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAnalysisClaimClosures } from '@/api/endpoints/analysis-claim-closures';
import {
  CLOSURES_TTL_MS,
  isClaimClosed,
  loadClaimClosures,
  matchClaimClosedPath,
  resetClaimClosuresCache,
  RETRY_AFTER_FAILURE_MS,
} from '@/lib/claim-closures';
import type { BookAnalysisClaimClosure } from '@/types/api-schema';

/**
 * F03-2, решение арбитра `F03 | F03-2`: список закрытий анализа для middleware. Кэш до
 * `CLOSURES_TTL_MS`; бэкенд не ответил - прежний список; списка не было - открыто; лежащий бэкенд
 * не добавляет таймаут каждому заходу (пауза `RETRY_AFTER_FAILURE_MS`).
 */

const API = 'http://api.test';
const T0 = 1_000_000;
const closure = (over: Partial<BookAnalysisClaimClosure> = {}): BookAnalysisClaimClosure => ({
  slugs: ['hamlet'],
  language: 'en',
  countryCode: 'GB',
  expiresAt: null,
  ...over,
});
const ok = (items: BookAnalysisClaimClosure[]) =>
  new Response(JSON.stringify({ items }), { status: 200 });

describe('loadClaimClosures', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetClaimClosuresCache();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('свежий список берётся из кэша, после TTL - запрашивается снова', async () => {
    fetchMock.mockResolvedValue(ok([closure()]));

    await loadClaimClosures(API, T0);
    await loadClaimClosures(API, T0 + CLOSURES_TTL_MS - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await loadClaimClosures(API, T0 + CLOSURES_TTL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ответ не ok или не той формы - прежний список, а не «закрытий нет»', async () => {
    fetchMock.mockResolvedValueOnce(ok([closure()]));
    await loadClaimClosures(API, T0);

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 500 }));
    expect(await loadClaimClosures(API, T0 + CLOSURES_TTL_MS)).toHaveLength(1);

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ nope: 1 }), { status: 200 }));
    expect(
      await loadClaimClosures(API, T0 + CLOSURES_TTL_MS + RETRY_AFTER_FAILURE_MS)
    ).toHaveLength(1);
  });

  // Элемент не той формы уронил бы сверку в middleware на каждом заходе: такой ответ - «списка нет».
  it.each([
    [{ items: [{ language: 'en', countryCode: 'GB', expiresAt: null }] }],
    [{ items: [{ slugs: ['a'], language: 'en', countryCode: 7, expiresAt: null }] }],
    [{ items: [{ slugs: [null], language: 'en', countryCode: null, expiresAt: null }] }],
    [{ items: [{ slugs: ['a'], language: 'en', countryCode: null, expiresAt: 'не дата' }] }],
  ])('элемент не той формы - прежний список (%j)', async (bad) => {
    fetchMock.mockResolvedValueOnce(ok([closure()]));
    await loadClaimClosures(API, T0);

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(bad), { status: 200 }));
    const list = await loadClaimClosures(API, T0 + CLOSURES_TTL_MS);
    expect(list).toEqual([closure()]);
  });

  it('списка не было и бэкенд не ответил (сбой или таймаут) - пусто, страница открыта', async () => {
    fetchMock.mockRejectedValue(new DOMException('aborted', 'AbortError'));
    expect(await loadClaimClosures(API, T0)).toEqual([]);
  });

  it('после неудачи повтор не раньше паузы - лежащий бэкенд не тормозит каждый заход', async () => {
    fetchMock.mockRejectedValue(new Error('down'));

    await loadClaimClosures(API, T0);
    await loadClaimClosures(API, T0 + RETRY_AFTER_FAILURE_MS - 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await loadClaimClosures(API, T0 + RETRY_AFTER_FAILURE_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('одновременные заходы - один запрос', async () => {
    let release: (r: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (release = resolve)));

    const both = Promise.all([loadClaimClosures(API, T0), loadClaimClosures(API, T0)]);
    release(ok([closure()]));
    const [a, b] = await both;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });
});

describe('matchClaimClosedPath', () => {
  it.each([
    ['/en/book/hamlet/analysis', { lang: 'en', slug: 'hamlet', kind: 'analysis' }],
    ['/en/book/hamlet/analysis/', { lang: 'en', slug: 'hamlet', kind: 'analysis' }],
    [
      '/ru/book/%D0%B3%D0%B0%D0%BC%D0%BB%D0%B5%D1%82/analysis',
      { lang: 'ru', slug: 'гамлет', kind: 'analysis' },
    ],
    // F04-3: раздел пересказа - номер правильной формы, есть такой раздел или нет (451 раньше 404).
    ['/en/book/hamlet/summary/1', { lang: 'en', slug: 'hamlet', kind: 'summarySection' }],
    ['/en/book/hamlet/summary/7/', { lang: 'en', slug: 'hamlet', kind: 'summarySection' }],
    ['/pt/book/hamlet/summary/999999', { lang: 'pt', slug: 'hamlet', kind: 'summarySection' }],
    // Закодированные сегменты Next раскодирует и отдаёт странице - закрытие видит то же самое.
    ['/en/book/hamlet/summary/%31', { lang: 'en', slug: 'hamlet', kind: 'summarySection' }],
    ['/en/book/hamlet/%73ummary/1', { lang: 'en', slug: 'hamlet', kind: 'summarySection' }],
    ['/en/book/hamlet/%61nalysis', { lang: 'en', slug: 'hamlet', kind: 'analysis' }],
  ])('%s - закрываемый адрес', (path, expected) => {
    expect(matchClaimClosedPath(path)).toEqual(expected);
  });

  it.each([
    '/en/book/hamlet',
    '/en/book/hamlet/analysis/x',
    '/xx/book/hamlet/analysis',
    '/en/book/%E0/analysis',
    // Сам пересказ открыт при претензии (D4); кривой номер - 404 везде (решение арбитра `F04 | F04-3`).
    '/en/book/hamlet/summary',
    '/en/book/hamlet/summary/',
    '/en/book/hamlet/summary/0',
    '/en/book/hamlet/summary/01',
    '/en/book/hamlet/summary/abc',
    '/en/book/hamlet/summary/1.5',
    '/en/book/hamlet/summary/1/x',
    '/xx/book/hamlet/summary/1',
  ])('%s - не закрывается', (path) => {
    expect(matchClaimClosedPath(path)).toBeNull();
  });
});

describe('isClaimClosed', () => {
  const target = { lang: 'en', slug: 'Hamlet' };

  it('слаг сравнивается без учёта регистра; страна - точно', () => {
    expect(isClaimClosed([closure()], target, 'GB', T0)).toBe(true);
    expect(isClaimClosed([closure()], target, 'US', T0)).toBe(false);
    expect(isClaimClosed([closure()], target, null, T0)).toBe(false);
  });

  it('блок на весь мир закрывает и без страны; блок на все языки - любой язык', () => {
    const worldwide = closure({ countryCode: null, language: null });
    expect(isClaimClosed([worldwide], { lang: 'fr', slug: 'hamlet' }, null, T0)).toBe(true);
  });

  it('истёкший блок не закрывает', () => {
    const expired = closure({ expiresAt: new Date(T0 - 1).toISOString() });
    expect(isClaimClosed([expired], target, 'GB', T0)).toBe(false);
  });
});

describe('fetchAnalysisClaimClosures', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // Повисший бэкенд не держит каждый заход на анализ: запрос обрывается по таймауту.
  it('обрывает запрос по таймауту и отдаёт null', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            signal = init?.signal ?? undefined;
            signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError'))
            );
          })
      )
    );

    const pending = fetchAnalysisClaimClosures(API, 2000);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(pending).resolves.toBeNull();
    expect(signal?.aborted).toBe(true);
  });
});
