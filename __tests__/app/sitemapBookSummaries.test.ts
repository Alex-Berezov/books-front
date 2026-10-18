// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Пересказ - отдельный индексируемый адрес `/{lang}/book/{slug}/summary` (решение владельца
 * 17.10.2026). Карта сайта кладёт его в файл книг языка, только если у версии этого языка есть
 * пересказ, а hreflang - только между языками с пересказом. Посадка идёт через настоящий
 * обработчик и смотрит на итоговый XML.
 */

const SITE = 'https://bibliaris.com';

const getPublicBooks = vi.fn();

vi.mock('@/api/endpoints/public', () => ({
  getPublicBooks: (...args: unknown[]) => getPublicBooks(...args) as unknown,
  getPublicCategories: vi.fn(),
  getPublicTags: vi.fn(),
  getBookCards: vi.fn(),
  getPublicAuthors: vi.fn(),
  getAuthorLetters: vi.fn(),
}));

const listVersion = (language: string, slug: string, summaries: number, analyses = 0) => ({
  id: `v-${slug}`,
  bookId: 'b',
  language,
  status: 'published',
  type: 'text',
  title: slug,
  author: 'a',
  coverImageUrl: '',
  description: '',
  slug,
  isFree: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  // Список книг отдаёт и счётчик анализа (F03): без него файл книг отвечает отказом.
  _count: { chapters: 1, audioChapters: 0, summaries, analyses },
  tags: [],
});

const book = (id: string, versions: ReturnType<typeof listVersion>[]) => ({
  id,
  slug: id,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-10T00:00:00.000Z',
  hasText: true,
  hasAudio: false,
  hasSummary: versions.some((v) => v._count.summaries > 0),
  versions,
});

const callGet = async (filename: string): Promise<string> => {
  const { GET } = await import('@/app/sitemaps/[filename]/route');
  const res = await GET(new Request(`${SITE}/sitemaps/${filename}`), {
    params: Promise.resolve({ filename }),
  });
  return res.text();
};

const urlBlock = (xml: string, loc: string) => {
  const start = xml.indexOf(`<loc>${loc}</loc>`);
  if (start < 0) return null;
  return xml.slice(start, xml.indexOf('</url>', start));
};

describe('карта сайта: адреса пересказов', () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  afterAll(() => {
    if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    const items = [
      book('hamlet', [
        listVersion('en', 'hamlet', 1),
        listVersion('fr', 'hamlet-fr', 1),
        listVersion('ru', 'gamlet', 0),
      ]),
      book('emma', [listVersion('en', 'emma', 0)]),
      book('carol', [listVersion('en', 'carol', 1), listVersion('es', 'cancion', 0)]),
    ];
    getPublicBooks.mockImplementation(async (_lang: string, params: { page?: number }) =>
      params.page === 1
        ? { items, pagination: { total: items.length, page: 1, limit: 100, totalPages: 1 } }
        : { items: [], pagination: { total: items.length, page: 2, limit: 100, totalPages: 1 } }
    );
  });

  it('пересказ языка файла - свой адрес, hreflang только языков с пересказом', async () => {
    const xml = await callGet('sitemap-books-en-1.xml');

    const block = urlBlock(xml, `${SITE}/en/book/hamlet/summary`);
    expect(block).not.toBeNull();
    expect(block).toContain(`hreflang="fr" href="${SITE}/fr/book/hamlet-fr/summary"`);
    expect(block).toContain(`hreflang="x-default" href="${SITE}/en/book/hamlet/summary"`);
    expect(block).not.toContain('gamlet');
    // Страница книги остаётся в карте как была.
    expect(xml).toContain(`<loc>${SITE}/en/book/hamlet</loc>`);
  });

  it('у книги нет пересказа - адреса пересказа нет', async () => {
    const xml = await callGet('sitemap-books-en-1.xml');

    expect(xml).toContain(`<loc>${SITE}/en/book/emma</loc>`);
    expect(xml).not.toContain('/en/book/emma/summary');
  });

  it('у версии языка файла нет пересказа - адреса нет, хотя у других языков есть', async () => {
    const xml = await callGet('sitemap-books-ru-1.xml');

    expect(xml).toContain(`<loc>${SITE}/ru/book/gamlet</loc>`);
    expect(xml).not.toContain('/summary');
  });

  it('пересказ на одном языке - кластер только из него, без языка без пересказа; без lastmod', async () => {
    const xml = await callGet('sitemap-books-en-1.xml');

    const block = urlBlock(xml, `${SITE}/en/book/carol/summary`);
    expect(block).toContain(`hreflang="x-default" href="${SITE}/en/book/carol/summary"`);
    expect(block).not.toContain('cancion');
    expect(block).not.toContain('<lastmod>');
  });

  it('нет счётчика пересказов у версии языка файла - 503, а не похудевшая карта', async () => {
    const broken = { ...listVersion('en', 'odd', 1), _count: undefined };
    getPublicBooks.mockImplementation(async (_lang: string, params: { page?: number }) =>
      params.page === 1
        ? {
            items: [{ ...book('odd', [listVersion('en', 'odd', 1)]), versions: [broken] }],
            pagination: { total: 1, page: 1, limit: 100, totalPages: 1 },
          }
        : { items: [], pagination: { total: 1, page: 2, limit: 100, totalPages: 1 } }
    );
    const { GET } = await import('@/app/sitemaps/[filename]/route');
    const res = await GET(new Request(`${SITE}/sitemaps/sitemap-books-en-1.xml`), {
      params: Promise.resolve({ filename: 'sitemap-books-en-1.xml' }),
    });

    expect(res.status).toBe(503);
  });
});
