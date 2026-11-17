// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * F08-3b (решение арбитра `F08 | F08-3` Q1, Q4): мир книги - своими файлами карты, одна страница
 * ручки на файл; общая `/wiki` и страницы сущностей рядом, `lastmod` и кластеры hreflang - из
 * ответа ручки, priority 0.6. Усечение, форма не та и отказ - 503, а не похудевшая карта.
 * Посадка - через настоящие обработчики.
 */

const SITE = 'https://bibliaris.com';

const getPublicWorldSitemap = vi.fn();
const getPublicBooks = vi.fn();
const getSummarySectionsSitemap = vi.fn();

vi.mock('@/api/endpoints/public', () => ({
  getPublicWorldSitemap: (...args: unknown[]) => getPublicWorldSitemap(...args) as unknown,
  getSummarySectionsSitemap: (...args: unknown[]) => getSummarySectionsSitemap(...args) as unknown,
  getPublicBooks: (...args: unknown[]) => getPublicBooks(...args) as unknown,
  getPublicCategories: vi.fn(),
  getPublicTags: vi.fn(),
  getBookCards: vi.fn(),
  getPublicAuthors: vi.fn(),
  getAuthorLetters: vi.fn(),
}));

const page = (items: unknown[], total: number, pageNo = 1, limit = 50) => ({
  items,
  pagination: { page: pageNo, limit, total, totalPages: Math.ceil(total / limit) },
});

const LASTMOD = '2026-11-10T08:00:00.000Z';
const ENTITY_LASTMOD = '2026-11-12T09:30:00.000Z';

const hamlet = (over: Record<string, unknown> = {}) => ({
  slug: 'hamlet',
  lastmod: LASTMOD,
  alternates: [
    { language: 'en', slug: 'hamlet' },
    { language: 'fr', slug: 'hamlet-fr' },
  ],
  entities: [
    {
      key: 'ophelia',
      lastmod: ENTITY_LASTMOD,
      alternates: [
        { language: 'en', slug: 'hamlet' },
        { language: 'fr', slug: 'hamlet-fr' },
      ],
    },
  ],
  ...over,
});

const worldFile = async (filename: string) => {
  const { GET } = await import('@/app/sitemaps/[filename]/route');
  return GET(new Request(`${SITE}/sitemaps/${filename}`), {
    params: Promise.resolve({ filename }),
  });
};

const index = async () => {
  const { GET } = await import('@/app/sitemap.xml/route');
  return (await GET()).text();
};

describe('карта мира книги', () => {
  const env = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    getPublicWorldSitemap.mockReset();
    getPublicBooks.mockReset();
    getSummarySectionsSitemap.mockReset();
    getPublicBooks.mockResolvedValue(page([], 0, 1, 1));
    getSummarySectionsSitemap.mockResolvedValue(page([], 0, 1, 1));
  });

  afterAll(() => {
    if (env === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = env;
  });

  it('файл: общая страница и сущность рядом, lastmod из ответа, priority 0.6', async () => {
    getPublicWorldSitemap.mockResolvedValue(page([hamlet()], 1));

    const res = await worldFile('sitemap-world-en-1.xml');
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(getPublicWorldSitemap).toHaveBeenCalledTimes(1);
    expect(getPublicWorldSitemap).toHaveBeenCalledWith('en', 1, 50);
    expect(xml).toContain(`<loc>${SITE}/en/book/hamlet/wiki</loc>`);
    expect(xml).toContain(`<loc>${SITE}/en/book/hamlet/wiki/ophelia</loc>`);
    expect(xml).toContain(`<lastmod>${LASTMOD}</lastmod>`);
    expect(xml).toContain(`<lastmod>${ENTITY_LASTMOD}</lastmod>`);
    expect(xml.match(/<priority>0\.6<\/priority>/g)).toHaveLength(2);
  });

  it('hreflang общей страницы и сущности - ровно из alternates ответа', async () => {
    getPublicWorldSitemap.mockResolvedValue(page([hamlet()], 1));

    const xml = await (await worldFile('sitemap-world-en-1.xml')).text();

    expect(xml).toContain(`hreflang="en" href="${SITE}/en/book/hamlet/wiki"`);
    expect(xml).toContain(`hreflang="fr" href="${SITE}/fr/book/hamlet-fr/wiki"`);
    expect(xml).toContain(`hreflang="fr" href="${SITE}/fr/book/hamlet-fr/wiki/ophelia"`);
    expect(xml).toContain(`hreflang="x-default" href="${SITE}/en/book/hamlet/wiki"`);
    // Язык вне alternates (книга без мира на нём) в кластер не попадает.
    expect(xml).not.toContain('hreflang="es"');
    expect(xml).not.toContain('hreflang="ru"');
  });

  it('в карту идут только сущности из ответа: isIndexable=false ручка не отдаёт, фронт не добавляет', async () => {
    // Решение об индексации - на бэкенде (`isIndexable`, Q4): фронт кладёт ровно присланное.
    getPublicWorldSitemap.mockResolvedValue(page([hamlet()], 1));

    const xml = await (await worldFile('sitemap-world-en-1.xml')).text();

    expect(xml.match(/<loc>/g)).toHaveLength(2);
    expect(xml.match(/<loc>[^<]*\/wiki\/[^<]*<\/loc>/g)).toEqual([
      `<loc>${SITE}/en/book/hamlet/wiki/ophelia</loc>`,
    ]);
  });

  it('сущность без кластера (не индексируется) - адрес без блока hreflang', async () => {
    getPublicWorldSitemap.mockResolvedValue(
      page([hamlet({ entities: [{ key: 'ophelia', lastmod: ENTITY_LASTMOD, alternates: [] }] })], 1)
    );

    const xml = await (await worldFile('sitemap-world-en-1.xml')).text();

    expect(xml).toContain(`<loc>${SITE}/en/book/hamlet/wiki/ophelia</loc>`);
    expect(xml).not.toContain('/wiki/ophelia" />');
    // Только кластер общей страницы: en, fr, x-default.
    expect(xml.match(/hreflang=/g)).toHaveLength(3);
  });

  it('кластер без языка файла не отдаётся - противоречивый сигнал', async () => {
    getPublicWorldSitemap.mockResolvedValue(
      page([hamlet({ alternates: [{ language: 'fr', slug: 'hamlet-fr' }], entities: [] })], 1)
    );

    const xml = await (await worldFile('sitemap-world-en-1.xml')).text();

    expect(xml).toContain(`<loc>${SITE}/en/book/hamlet/wiki</loc>`);
    expect(xml).not.toContain('hreflang');
  });

  it('усечённая страница - 503, а не короткий файл', async () => {
    getPublicWorldSitemap.mockResolvedValue(page([hamlet()], 2));
    expect((await worldFile('sitemap-world-en-1.xml')).status).toBe(503);
  });

  it.each([
    ['версия без slug', { slug: undefined }],
    ['версия без даты', { lastmod: null }],
    ['версия без alternates', { alternates: undefined }],
    ['версия без списка сущностей', { entities: undefined }],
    ['сущность без ключа', { entities: [{ lastmod: ENTITY_LASTMOD, alternates: [] }] }],
    ['сущность без даты', { entities: [{ key: 'a', lastmod: null, alternates: [] }] }],
  ])('%s - 503, а не адрес /book/undefined', async (_name, over) => {
    getPublicWorldSitemap.mockResolvedValue(page([hamlet(over)], 1));
    expect((await worldFile('sitemap-world-en-1.xml')).status).toBe(503);
  });

  it('отказ ручки дважды подряд - 503; единичный отказ - повтор, файл собран', async () => {
    getPublicWorldSitemap.mockRejectedValue(new Error('down'));
    expect((await worldFile('sitemap-world-en-1.xml')).status).toBe(503);
    expect(getPublicWorldSitemap).toHaveBeenCalledTimes(2);

    getPublicWorldSitemap.mockReset();
    getPublicWorldSitemap
      .mockRejectedValueOnce(new Error('429'))
      .mockResolvedValueOnce(page([hamlet()], 1));
    expect((await worldFile('sitemap-world-en-1.xml')).status).toBe(200);
  });

  it.each([
    'sitemap-world-xx-1.xml',
    'sitemap-world-en-0.xml',
    'sitemap-world-en-01.xml',
    'sitemap-world-en-10001.xml',
  ])('%s - 404', async (filename) => {
    expect((await worldFile(filename)).status).toBe(404);
    expect(getPublicWorldSitemap).not.toHaveBeenCalled();
  });

  it('номер за пределами выдачи - 404; файл 1 пустого языка - пустой urlset', async () => {
    getPublicWorldSitemap.mockResolvedValue(page([], 3, 2));
    expect((await worldFile('sitemap-world-en-2.xml')).status).toBe(404);

    getPublicWorldSitemap.mockResolvedValue(page([], 0));
    const res = await worldFile('sitemap-world-en-1.xml');
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain('<url>');
  });

  it('индекс: файлов столько, сколько страниц по 50 версий; ноль - ни одного', async () => {
    getPublicWorldSitemap.mockImplementation((lang: string) =>
      Promise.resolve(page([], lang === 'ru' ? 101 : 0, 1, 1))
    );

    const xml = await index();

    for (const n of [1, 2, 3]) {
      expect(xml).toContain(`${SITE}/sitemaps/sitemap-world-ru-${n}.xml`);
    }
    expect(xml).not.toContain('sitemap-world-ru-4.xml');
    expect(xml).not.toContain('sitemap-world-en-');
  });

  it('индекс: счёт неизвестен - файл 1 остаётся', async () => {
    getPublicWorldSitemap.mockRejectedValue(new Error('down'));

    const xml = await index();

    expect(xml).toContain(`${SITE}/sitemaps/sitemap-world-en-1.xml`);
    expect(xml).not.toContain('sitemap-world-en-2.xml');
  });
});
