// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `LEGACY-387`: карта сайта переехала с безъязыких `GET /categories` и `GET /tags`
 * на языковые `getPublicCategories`/`getPublicTags`.
 *
 * 🔴 Ровно этот переезд владелец назвал опасным местом: «снять безъязыкие адреса
 * **после** перевода потребителей» — потому что ошибка здесь не падает, а отдаёт
 * пустой `<urlset>`, и замечает её не проверка, а просадка выдачи через недели.
 *
 * Снимок поверхности `check:type-sync` стережёт **адрес** вызова, но не форму ответа:
 * он не заметит, если термины придут и будут молча отброшены сборкой ссылок. Отсюда
 * эта посадка — она ходит через настоящий обработчик и смотрит на итоговый XML.
 */

const getPublicCategories = vi.fn();
const getPublicTags = vi.fn();

vi.mock('@/api/endpoints/public', () => ({
  getPublicCategories: (...args: unknown[]) => getPublicCategories(...args) as unknown,
  getPublicTags: (...args: unknown[]) => getPublicTags(...args) as unknown,
  getPublicBooks: vi.fn(async () => ({ items: [], pagination: { total: 0, totalPages: 0 } })),
  getBookCards: vi.fn(async () => ({ items: [], pagination: { total: 0, totalPages: 0 } })),
  getPublicAuthors: vi.fn(async () => ({ items: [], pagination: { total: 0, totalPages: 0 } })),
  getAuthorLetters: vi.fn(async () => ({
    items: [],
    pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
  })),
}));

const emptyPage = { items: [], pagination: { total: 0, page: 1, limit: 100, totalPages: 0 } };

/** Термин, проходящий `isTaxonomyLinkable`: видим, индексируем, с книгами. */
const linkableTerm = (slug: string, lang: string) => ({
  id: `id-${slug}`,
  key: slug,
  name: slug,
  slug,
  type: 'genre' as const,
  booksCount: 7,
  isVisible: true,
  indexable: true,
  autoIndexable: true,
  langBookCount: 7,
  translations: [{ language: lang, name: slug, slug, bookCount: 7, autoIndexable: true }],
});

const callGet = async (filename: string): Promise<string> => {
  const { GET } = await import('@/app/sitemaps/[filename]/route');
  const res = await GET(new Request(`https://bibliaris.com/sitemaps/${filename}`), {
    params: { filename },
  });
  return res.text();
};

describe('LEGACY-387: карта сайта строит ссылки из языковых ручек', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bibliaris.com';
    getPublicCategories.mockResolvedValue(emptyPage);
    getPublicTags.mockResolvedValue(emptyPage);
  });

  it('теги: зовёт `getPublicTags` с языком файла и печатает его ссылки', async () => {
    getPublicTags.mockImplementation(async (_lang: string, params: { page?: number }) =>
      params.page === 1
        ? {
            items: [linkableTerm('solitude', 'es')],
            pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
          }
        : emptyPage
    );

    const xml = await callGet('sitemap-tags-es.xml');

    expect(getPublicTags).toHaveBeenCalled();
    expect(getPublicTags.mock.calls[0]?.[0]).toBe('es');
    expect(xml).toContain('https://bibliaris.com/es/tag/solitude');
  });

  it('жанры: зовёт `getPublicCategories` с языком файла и типом, и печатает ссылки', async () => {
    getPublicCategories.mockImplementation(
      async (_lang: string, _type: string, params: { page?: number }) =>
        params.page === 1
          ? {
              items: [linkableTerm('tragedy', 'fr')],
              pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
            }
          : emptyPage
    );

    const xml = await callGet('sitemap-genres-fr.xml');

    expect(getPublicCategories).toHaveBeenCalled();
    expect(getPublicCategories.mock.calls[0]?.[0]).toBe('fr');
    expect(getPublicCategories.mock.calls[0]?.[1]).toBe('genre');
    expect(xml).toContain('https://bibliaris.com/fr/genre/tragedy');
  });

  // `LEGACY-422`, `T73`: снятая в админке галочка перевода `es` — страница `noindex`.
  // `GET /{lang}/tags` сворачивает флаг перевода в верхний `indexable` по языку запроса
  // и отдаёт его же в `translations[]`: в `sitemap-tags-es.xml` адреса нет, а в
  // alternates открытых соседей нет `es`. Парный случай — тот же тег с открытым `es`.
  const threeLangTag = (esOpen: boolean) => (lang: string) => ({
    ...linkableTerm('love', lang),
    indexable: lang !== 'es' || esOpen,
    translations: [
      { language: 'en', name: 'love', slug: 'love', bookCount: 7, autoIndexable: true },
      { language: 'fr', name: 'amour', slug: 'amour', bookCount: 7, autoIndexable: true },
      {
        language: 'es',
        name: 'amor',
        slug: 'amor',
        bookCount: 7,
        autoIndexable: true,
        indexable: esOpen,
      },
    ],
  });
  const serveTag = (build: (lang: string) => unknown) =>
    getPublicTags.mockImplementation(async (lang: string, params: { page?: number }) =>
      params.page === 1
        ? { items: [build(lang)], pagination: { total: 1, page: 1, limit: 100, totalPages: 1 } }
        : emptyPage
    );

  it('перевод тега, закрытый своим флагом, пропадает из карты и из hreflang соседей', async () => {
    serveTag(threeLangTag(false));

    expect(await callGet('sitemap-tags-es.xml')).not.toContain('/es/tag/amor');
    const en = await callGet('sitemap-tags-en.xml');
    expect(en).toContain('https://bibliaris.com/en/tag/love');
    expect(en).toContain('https://bibliaris.com/fr/tag/amour');
    expect(en).not.toContain('/es/tag/amor');
  });

  it('тот же тег с открытым переводом есть и в карте, и в hreflang соседей', async () => {
    serveTag(threeLangTag(true));

    expect(await callGet('sitemap-tags-es.xml')).toContain('https://bibliaris.com/es/tag/amor');
    expect(await callGet('sitemap-tags-en.xml')).toContain('https://bibliaris.com/es/tag/amor');
  });

  it('термин без перевода на язык файла в карту не попадает', async () => {
    // Страховка от обратного прочтения проверок выше: совпадение по подстроке
    // не должно проходить оттого, что в XML попало вообще всё подряд.
    getPublicTags.mockImplementation(async (_lang: string, params: { page?: number }) =>
      params.page === 1
        ? {
            items: [linkableTerm('solitude', 'en')],
            pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
          }
        : emptyPage
    );

    const xml = await callGet('sitemap-tags-es.xml');

    expect(xml).not.toContain('/es/tag/solitude');
  });
});
