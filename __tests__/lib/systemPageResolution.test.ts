import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TAXONOMY_OVERVIEW_CONFIGS } from '@/components/public/taxonomy-overview/TaxonomyOverviewConfig';
import { SYSTEM_PAGE_KEYS } from '@/lib/system-pages';
import { fetchPageBySystemKey } from '@/lib/utils/fetch-page';

/**
 * A2, `books-app-docs/tasks/system-pages-slug/TASK.md`.
 *
 * Пять страниц сайт ищет сам, и адресом служил слаг — поле, которое админка
 * генерирует из заголовка. Переименование заголовка рвало связь беззвучно:
 * страница отвечала 200, но уже без своих metaTitle, metaDescription, h1,
 * SEO-текста и FAQ. На проде это случилось — `homepage-index` стал `homepage`.
 */
describe('system page resolution', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'p1' }) });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // 🔴 Возврат на слаг — единственный способ вернуть исходный дефект, поэтому
  // адрес проверяется буквально.
  it('asks for the page by key, never by slug', async () => {
    await fetchPageBySystemKey('en', 'homepage');

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/en/pages/by-key/homepage');
    expect(url).not.toContain('homepage-index');
  });

  // 🔴 Хаб, отвечающий на чужом языке, индексируется и потому хуже хаба на
  // словарных строках. Язык обязан ехать и в пути, и в заголовке.
  it('keeps the request pinned to one language', async () => {
    await fetchPageBySystemKey('ru', 'taxonomy-genres');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/ru/pages/by-key/taxonomy-genres');
    expect((init.headers as Record<string, string>)['Accept-Language']).toBe('ru');
  });

  /**
   * ⚠️ SEO-контент хаба ценен, но страница без него работает на словарных
   * строках. Падение запроса не должно превращать потерю текста в 500.
   */
  it('degrades to null instead of throwing', async () => {
    fetchMock.mockRejectedValue(new Error('network'));

    await expect(fetchPageBySystemKey('en', 'taxonomy-tags')).resolves.toBeNull();
  });

  /**
   * 🔴 `pageKey` в конфиге раньше хранил слаг и не читался вообще: маршруты
   * дублировали то же значение литералом. Теперь читается именно он, поэтому
   * старое значение в конфиге снова увело бы сайт на слаг.
   */
  it('gives every taxonomy hub a real system key, not the old slug', () => {
    for (const config of Object.values(TAXONOMY_OVERVIEW_CONFIGS)) {
      expect(SYSTEM_PAGE_KEYS).toContain(config.pageKey);
      expect(config.pageKey).not.toMatch(/-index$/);
    }
  });
});
