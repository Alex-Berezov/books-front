import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPageBySystemKey } from '@/lib/utils/fetch-page';

/**
 * A2. Главная и четыре хаба таксономий ищутся по неизменяемому ключу.
 *
 * ⚠️ Здесь проверяется **деградация**: SEO-контент хаба ценен, но страница без
 * него работает на словарных строках. Ронять весь маршрут из-за недоступного
 * CMS-блока значило бы менять потерю текста на 500 — а 500 стоит дороже.
 */
describe('fetchPageBySystemKey — деградация вместо отказа', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('возвращает страницу, когда API ответил', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'p1' }) });

    await expect(fetchPageBySystemKey('en', 'homepage')).resolves.toMatchObject({ id: 'p1' });
  });

  // 🔴 Ветка, которой не было в покрытии: API ответил, но не 2xx.
  it('отдаёт null, когда API ответил не-ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

    await expect(fetchPageBySystemKey('en', 'taxonomy-tags')).resolves.toBeNull();
  });

  it('отдаёт null, когда запрос упал', async () => {
    fetchMock.mockRejectedValue(new Error('network'));

    await expect(fetchPageBySystemKey('ru', 'taxonomy-genres')).resolves.toBeNull();
  });

  // Язык обязан ехать и в пути, и в заголовке: хаб на чужом языке индексируется.
  it('пришпиливает запрос к одному языку', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    await fetchPageBySystemKey('ru', 'taxonomy-categories');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/ru/pages/by-key/taxonomy-categories');
    expect((init.headers as Record<string, string>)['Accept-Language']).toBe('ru');
  });
});
