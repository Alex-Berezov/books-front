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
  getPublicBooks: vi.fn(async () => ({ data: [], meta: { total: 0, totalPages: 0 } })),
  getBookCards: vi.fn(async () => ({ items: [], pagination: { total: 0, totalPages: 0 } })),
  getPublicAuthors: vi.fn(async () => ({ data: [], meta: { total: 0, totalPages: 0 } })),
  getAuthorLetters: vi.fn(async () => []),
}));

const emptyPage = { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } };

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
            data: [linkableTerm('solitude', 'es')],
            meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
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
              data: [linkableTerm('tragedy', 'fr')],
              meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
            }
          : emptyPage
    );

    const xml = await callGet('sitemap-genres-fr.xml');

    expect(getPublicCategories).toHaveBeenCalled();
    expect(getPublicCategories.mock.calls[0]?.[0]).toBe('fr');
    expect(getPublicCategories.mock.calls[0]?.[1]).toBe('genre');
    expect(xml).toContain('https://bibliaris.com/fr/genre/tragedy');
  });

  it('термин без перевода на язык файла в карту не попадает', async () => {
    // Страховка от обратного прочтения проверок выше: совпадение по подстроке
    // не должно проходить оттого, что в XML попало вообще всё подряд.
    getPublicTags.mockImplementation(async (_lang: string, params: { page?: number }) =>
      params.page === 1
        ? {
            data: [linkableTerm('solitude', 'en')],
            meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
          }
        : emptyPage
    );

    const xml = await callGet('sitemap-tags-es.xml');

    expect(xml).not.toContain('/es/tag/solitude');
  });
});
