// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * F04-3 (`tech.md` T10, `product.md` §6): разделы пересказа - своими файлами карты, одна страница
 * ручки на файл, `lastmod` - дата раздела, без hreflang (T10). Неизвестный счёт в индексе -
 * файл 1 остаётся (`LEGACY-082`); отказ и усечение - 503, а не похудевшая карта. Посадка - через
 * настоящие обработчики.
 */

const SITE = 'https://bibliaris.com';

const getSummarySectionsSitemap = vi.fn();
const getPublicBooks = vi.fn();

vi.mock('@/api/endpoints/public', () => ({
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

const sectionFile = async (filename: string) => {
  const { GET } = await import('@/app/sitemaps/[filename]/route');
  return GET(new Request(`${SITE}/sitemaps/${filename}`), {
    params: Promise.resolve({ filename }),
  });
};

const index = async () => {
  const { GET } = await import('@/app/sitemap.xml/route');
  return (await GET()).text();
};

describe('карта разделов пересказа', () => {
  const env = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    getSummarySectionsSitemap.mockReset();
    getPublicBooks.mockReset();
    getPublicBooks.mockResolvedValue(page([], 0, 1, 1));
  });

  afterAll(() => {
    if (env === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = env;
  });

  it('файл: адрес раздела, lastmod - дата раздела, без hreflang', async () => {
    getSummarySectionsSitemap.mockResolvedValue(
      page(
        [
          {
            slug: 'oblomov',
            sections: [
              { number: 1, lastmod: '2026-10-11T08:00:00.000Z' },
              { number: 2, lastmod: '2026-10-12T09:30:00.000Z' },
            ],
          },
        ],
        1
      )
    );

    const res = await sectionFile('sitemap-summary-sections-ru-1.xml');
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(getSummarySectionsSitemap).toHaveBeenCalledWith('ru', 1, 50);
    expect(xml).toContain(`<loc>${SITE}/ru/book/oblomov/summary/1</loc>`);
    expect(xml).toContain(`<loc>${SITE}/ru/book/oblomov/summary/2</loc>`);
    expect(xml).toContain('<lastmod>2026-10-11T08:00:00.000Z</lastmod>');
    expect(xml).toContain('<lastmod>2026-10-12T09:30:00.000Z</lastmod>');
    // Пары «раздел ↔ раздел» между языками нет (T9) - и hreflang в карте нет (T10).
    expect(xml).not.toContain('hreflang');
  });

  it('файл не больше 10 000 адресов: 50 версий по 200 разделов', async () => {
    const versions = Array.from({ length: 50 }, (_, v) => ({
      slug: `book-${v}`,
      sections: Array.from({ length: 200 }, (_, s) => ({
        number: s + 1,
        lastmod: '2026-10-01T00:00:00.000Z',
      })),
    }));
    getSummarySectionsSitemap.mockResolvedValue(page(versions, 50));

    const xml = await (await sectionFile('sitemap-summary-sections-en-1.xml')).text();

    expect(xml.match(/<url>/g)).toHaveLength(10_000);
  });

  it('усечённая страница - 503, а не короткий файл', async () => {
    getSummarySectionsSitemap.mockResolvedValue(
      page([{ slug: 'a', sections: [{ number: 1, lastmod: '2026-10-01T00:00:00.000Z' }] }], 2)
    );
    expect((await sectionFile('sitemap-summary-sections-en-1.xml')).status).toBe(503);
  });

  it('раздел без даты - 503, а не «сейчас» в lastmod', async () => {
    getSummarySectionsSitemap.mockResolvedValue(
      page([{ slug: 'a', sections: [{ number: 1, lastmod: null }] }], 1)
    );
    expect((await sectionFile('sitemap-summary-sections-en-1.xml')).status).toBe(503);
  });

  it.each([
    ['версия без slug', { sections: [{ number: 1, lastmod: '2026-10-01T00:00:00.000Z' }] }],
    ['версия без списка разделов', { slug: 'a' }],
    [
      'нецелый номер раздела',
      { slug: 'a', sections: [{ number: 1.5, lastmod: '2026-10-01T00:00:00.000Z' }] },
    ],
  ])('%s - 503, а не адрес /book/undefined', async (_name, item) => {
    getSummarySectionsSitemap.mockResolvedValue(page([item], 1));
    expect((await sectionFile('sitemap-summary-sections-en-1.xml')).status).toBe(503);
  });

  it('отказ ручки на файле 2 - 503, а не 404', async () => {
    getSummarySectionsSitemap.mockRejectedValue(new Error('down'));
    expect((await sectionFile('sitemap-summary-sections-en-2.xml')).status).toBe(503);
  });

  it('отказ ручки дважды подряд - 503', async () => {
    getSummarySectionsSitemap.mockRejectedValue(new Error('down'));
    expect((await sectionFile('sitemap-summary-sections-en-1.xml')).status).toBe(503);
    expect(getSummarySectionsSitemap).toHaveBeenCalledTimes(2);
  });

  it('единичный отказ (429 лимитера) - одна повторная попытка, файл собран', async () => {
    getSummarySectionsSitemap
      .mockRejectedValueOnce(new Error('429'))
      .mockResolvedValueOnce(
        page([{ slug: 'a', sections: [{ number: 1, lastmod: '2026-10-01T00:00:00.000Z' }] }], 1)
      );
    const res = await sectionFile('sitemap-summary-sections-en-1.xml');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(`<loc>${SITE}/en/book/a/summary/1</loc>`);
  });

  it.each([
    'sitemap-summary-sections-xx-1.xml',
    'sitemap-summary-sections-en-0.xml',
    'sitemap-summary-sections-en-01.xml',
    'sitemap-summary-sections-en-10001.xml',
  ])('%s - 404', async (filename) => {
    expect((await sectionFile(filename)).status).toBe(404);
    expect(getSummarySectionsSitemap).not.toHaveBeenCalled();
  });

  it('номер за пределами выдачи - 404', async () => {
    getSummarySectionsSitemap.mockResolvedValue(page([], 3, 2));
    expect((await sectionFile('sitemap-summary-sections-en-2.xml')).status).toBe(404);
  });

  // Индекс держит файл 1 при неизвестном счёте (`LEGACY-082`): пустой язык - валидный пустой
  // `<urlset>`, а не битая запись индекса.
  it('файл 1 языка без разделов - пустой urlset 200, а не 404', async () => {
    getSummarySectionsSitemap.mockResolvedValue(page([], 0));
    const res = await sectionFile('sitemap-summary-sections-en-1.xml');
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain('<url>');
  });

  it('индекс: файлов столько, сколько страниц по 50 версий; ноль - ни одного', async () => {
    getSummarySectionsSitemap.mockImplementation((lang: string) =>
      Promise.resolve(page([], lang === 'ru' ? 101 : 0, 1, 1))
    );

    const xml = await index();

    for (const n of [1, 2, 3]) {
      expect(xml).toContain(`${SITE}/sitemaps/sitemap-summary-sections-ru-${n}.xml`);
    }
    expect(xml).not.toContain('sitemap-summary-sections-ru-4.xml');
    expect(xml).not.toContain('sitemap-summary-sections-en-');
  });

  it('индекс: счёт неизвестен - файл 1 остаётся', async () => {
    getSummarySectionsSitemap.mockRejectedValue(new Error('down'));

    const xml = await index();

    expect(xml).toContain(`${SITE}/sitemaps/sitemap-summary-sections-en-1.xml`);
    expect(xml).not.toContain('sitemap-summary-sections-en-2.xml');
  });
});
