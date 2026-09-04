import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  escapeXml,
  getBaseUrl,
  buildUrl,
  getBookSitemapUrls,
  buildSitemapIndexXml,
  buildUrlSetXml,
  takeCompletePage,
  fetchAllPages,
  fetchPageWindow,
  sitemapUnavailable,
  type SitemapItem,
} from '@/lib/sitemap/utils';

beforeEach(() => {
  vi.resetModules();
});

describe('escapeXml', () => {
  it('should escape ampersands', () => {
    expect(escapeXml('a&b')).toBe('a&amp;b');
  });

  it('should escape less-than', () => {
    expect(escapeXml('a<b')).toBe('a&lt;b');
  });

  it('should escape greater-than', () => {
    expect(escapeXml('a>b')).toBe('a&gt;b');
  });

  it('should escape double quotes', () => {
    expect(escapeXml('a"b')).toBe('a&quot;b');
  });

  it('should escape single quotes', () => {
    expect(escapeXml("a'b")).toBe('a&apos;b');
  });

  it('should escape all special chars together', () => {
    expect(escapeXml('<a href="x&\'y">')).toBe('&lt;a href=&quot;x&amp;&apos;y&quot;&gt;');
  });

  it('should return empty string for empty input', () => {
    expect(escapeXml('')).toBe('');
  });

  it('should pass through safe strings unchanged', () => {
    expect(escapeXml('hello-world')).toBe('hello-world');
    expect(escapeXml('/en/catalog')).toBe('/en/catalog');
    expect(escapeXml('https://bibliaris.com/en/book/slug')).toBe(
      'https://bibliaris.com/en/book/slug'
    );
  });
});

describe('getBaseUrl', () => {
  it('should return NEXT_PUBLIC_SITE_URL when set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bibliaris.com';
    expect(getBaseUrl()).toBe('https://bibliaris.com');
  });

  it('should strip trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bibliaris.com/';
    expect(getBaseUrl()).toBe('https://bibliaris.com');
  });

  it('should fallback to https://bibliaris.com when env not set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = '';
    expect(getBaseUrl()).toBe('https://bibliaris.com');
  });
});

describe('buildUrl', () => {
  it('should build a full URL from path', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bibliaris.com';
    expect(buildUrl('/en/catalog')).toBe('https://bibliaris.com/en/catalog');
  });
});

describe('getBookSitemapUrls', () => {
  const baseUrl = 'https://bibliaris.com';
  const langs = ['en', 'es', 'fr', 'pt', 'ru'] as const;

  it('should generate correct page counts per language', async () => {
    const getTotalBooks: (lang: string) => Promise<number> = async (lang) => {
      const counts: Record<string, number> = {
        en: 1500,
        es: 1,
        fr: 0,
        pt: 500,
        ru: 2500,
      };
      return counts[lang] ?? 0;
    };

    const urls = await getBookSitemapUrls(baseUrl, langs, getTotalBooks);

    expect(urls).toContain('https://bibliaris.com/sitemaps/sitemap-books-en-1.xml');
    expect(urls).toContain('https://bibliaris.com/sitemaps/sitemap-books-en-2.xml');
    expect(urls).toContain('https://bibliaris.com/sitemaps/sitemap-books-es-1.xml');
    expect(urls).not.toContain('https://bibliaris.com/sitemaps/sitemap-books-es-2.xml');
    expect(urls).not.toContain('https://bibliaris.com/sitemaps/sitemap-books-fr-1.xml');
    expect(urls).toContain('https://bibliaris.com/sitemaps/sitemap-books-pt-1.xml');
    expect(urls).toContain('https://bibliaris.com/sitemaps/sitemap-books-ru-1.xml');
    expect(urls).toContain('https://bibliaris.com/sitemaps/sitemap-books-ru-2.xml');
    expect(urls).toContain('https://bibliaris.com/sitemaps/sitemap-books-ru-3.xml');
    expect(urls).not.toContain('https://bibliaris.com/sitemaps/sitemap-books-ru-4.xml');
  });

  /**
   * This test used to assert `toHaveLength(0)` — it encoded the defect as the
   * expected behaviour and stayed green while doing it. Dropping every book
   * sitemap for a language from an index still served as 200 OK says those URLs
   * no longer exist; a 403 from the rate limiter was enough to say it, for all
   * five languages at once.
   *
   * The rule is the one `sitemap-static.xml` already follows: an unknown count is
   * not a zero count, and unknown fails towards keeping the URL.
   */
  it('keeps the language in the index when the count cannot be established', async () => {
    const getTotalBooks: (lang: string) => Promise<number | null> = async (_lang) => {
      throw new Error('API error');
    };

    const urls = await getBookSitemapUrls(baseUrl, langs, getTotalBooks);

    expect(urls).toHaveLength(langs.length);
    for (const lang of langs) {
      expect(urls).toContain(`${baseUrl}/sitemaps/sitemap-books-${lang}-1.xml`);
    }
  });

  it('treats a null count as unknown, not as zero', async () => {
    const getTotalBooks: (lang: string) => Promise<number | null> = async (_lang) => null;

    const urls = await getBookSitemapUrls(baseUrl, langs, getTotalBooks);

    expect(urls).toHaveLength(langs.length);
  });

  it('should skip languages with zero books', async () => {
    const getTotalBooks: (lang: string) => Promise<number> = async (_lang) => 0;

    const urls = await getBookSitemapUrls(baseUrl, langs, getTotalBooks);

    expect(urls).toHaveLength(0);
  });
});

describe('buildSitemapIndexXml', () => {
  it('should generate valid sitemap index XML', () => {
    const urls = [
      'https://bibliaris.com/sitemaps/sitemap-static.xml',
      'https://bibliaris.com/sitemaps/sitemap-books-en-1.xml',
    ];

    const xml = buildSitemapIndexXml(urls);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('</sitemapindex>');
    expect(xml).toContain('<loc>https://bibliaris.com/sitemaps/sitemap-static.xml</loc>');
    expect(xml).toContain('<loc>https://bibliaris.com/sitemaps/sitemap-books-en-1.xml</loc>');
  });

  it('should escape XML special chars in URLs', () => {
    const urls = ['https://bibliaris.com/sitemaps/sitemap&test.xml'];

    const xml = buildSitemapIndexXml(urls);

    expect(xml).toContain('sitemap&amp;test.xml');
    expect(xml).not.toContain('sitemap&test.xml');
  });
});

describe('buildUrlSetXml', () => {
  it('should generate valid urlset XML', () => {
    const items: SitemapItem[] = [
      {
        url: 'https://bibliaris.com/en/book/test',
        lastModified: new Date('2026-07-20T00:00:00.000Z'),
        changeFrequency: 'daily',
        priority: 0.9,
      },
    ];

    const xml = buildUrlSetXml(items);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
    );
    expect(xml).toContain('</urlset>');
    expect(xml).toContain('<loc>https://bibliaris.com/en/book/test</loc>');
    expect(xml).toContain('<lastmod>2026-07-20T00:00:00.000Z</lastmod>');
    expect(xml).toContain('<changefreq>daily</changefreq>');
    expect(xml).toContain('<priority>0.9</priority>');
  });

  it('should escape xhtml:link href values', () => {
    const items: SitemapItem[] = [
      {
        url: 'https://bibliaris.com/en/book/test',
        alternates: {
          languages: {
            en: 'https://bibliaris.com/en/book/test?q=a&b=c"d\'e<f>g',
            fr: 'https://bibliaris.com/fr/book/test&safe',
          },
        },
      },
    ];

    const xml = buildUrlSetXml(items);

    expect(xml).toContain('hreflang="en"');
    expect(xml).toContain(
      'href="https://bibliaris.com/en/book/test?q=a&amp;b=c&quot;d&apos;e&lt;f&gt;g"'
    );
    expect(xml).toContain('href="https://bibliaris.com/fr/book/test&amp;safe"');
    expect(xml).not.toContain('href="https://bibliaris.com/en/book/test?q=a&b=c"');
  });

  it('should escape the loc URL', () => {
    const items: SitemapItem[] = [
      {
        url: 'https://bibliaris.com/en/book/test&specials&more',
      },
    ];

    const xml = buildUrlSetXml(items);

    expect(xml).toContain('<loc>https://bibliaris.com/en/book/test&amp;specials&amp;more</loc>');
    expect(xml).not.toContain('<loc>https://bibliaris.com/en/book/test&specials&more</loc>');
  });

  it('should handle empty items array', () => {
    const items: SitemapItem[] = [];

    const xml = buildUrlSetXml(items);

    expect(xml).toContain('<urlset');
    expect(xml).toContain('</urlset>');
  });
});

/**
 * `LEGACY-098` — детектор усечения и `LEGACY-082` — правильный код отказа.
 *
 * Оба про одно: ответ, который выглядит успешным, но неполон, хуже явной
 * ошибки. Короткий `<urlset>` с кодом 200 и 404 на живой карте одинаково
 * убирают адреса из индекса, только молча.
 */
describe('takeCompletePage: полнота СТРАНИЦЫ, а не выборки (LEGACY-098)', () => {
  it('отдаёт данные, когда страница пришла целиком', () => {
    expect(takeCompletePage({ data: [1, 2, 3], meta: { total: 3 } }, 'books')).toEqual([1, 2, 3]);
  });

  it('падает, когда одностраничная выдача короче обещанной', () => {
    expect(() => takeCompletePage({ data: [1, 2], meta: { total: 441 } }, 'categories en')).toThrow(
      /получено 2 из 441/
    );
  });

  it('называет место в сообщении — иначе по логу не найти виноватую секцию', () => {
    expect(() => takeCompletePage({ data: [], meta: { total: 5 } }, 'tags ru')).toThrow(/tags ru/);
  });

  /**
   * 🔴 Регрессия, найденная код-ревью. `meta.total` — счётчик по **всей**
   * выборке, а не по странице. Сравнение с ним длины одной страницы объявляло
   * усечением нормальную пагинацию: карта книг ушла бы в 503 навсегда в тот
   * день, когда каталог перевалит за тысячу. Детектор неполноты стал бы
   * причиной полной потери.
   */
  it('полная первая страница из нескольких — не усечение', () => {
    const page = {
      data: Array.from({ length: 1000 }, (_, i) => i),
      meta: { total: 1500, page: 1, limit: 1000 },
    };
    expect(takeCompletePage(page, 'books en p1')).toHaveLength(1000);
  });

  it('последняя, неполная по размеру страница — тоже не усечение', () => {
    const page = {
      data: Array.from({ length: 500 }, (_, i) => i),
      meta: { total: 1500, page: 2, limit: 1000 },
    };
    expect(takeCompletePage(page, 'books en p2')).toHaveLength(500);
  });

  it('страница за пределами выборки пуста законно — это путь к 404, а не к 503', () => {
    expect(
      takeCompletePage({ data: [], meta: { total: 500, page: 2, limit: 1000 } }, 'books en p2')
    ).toEqual([]);
  });

  it('но недобор внутри страницы по-прежнему усечение', () => {
    const page = {
      data: Array.from({ length: 900 }, (_, i) => i),
      meta: { total: 1500, page: 1, limit: 1000 },
    };
    expect(() => takeCompletePage(page, 'books en p1')).toThrow(/усечена/);
  });

  it('не считает ошибкой, когда строк больше обещанного', () => {
    // Гонка с добавлением записей между подсчётом и выборкой — не потеря.
    expect(takeCompletePage({ data: [1, 2, 3], meta: { total: 2 } }, 'authors')).toEqual([1, 2, 3]);
  });

  it('пропускает ответ без meta.total — сверять не с чем', () => {
    expect(takeCompletePage({ data: [1] }, 'legacy endpoint')).toEqual([1]);
  });

  it('пустой ответ при total = 0 законен', () => {
    expect(takeCompletePage({ data: [], meta: { total: 0 } }, 'collections fr')).toEqual([]);
  });
});

describe('fetchAllPages: обход всех страниц (LEGACY-098)', () => {
  const pageOf = (items: number[], page: number, limit: number, total: number) => ({
    data: items,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });

  it('собирает все страницы, а не первую', async () => {
    const fetchPage = vi.fn(async (page: number) => pageOf(page === 1 ? [1, 2] : [3], page, 2, 3));

    await expect(fetchAllPages(fetchPage, 'genres en')).resolves.toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('переживает единичный сбой страницы — одна повторная попытка', async () => {
    let attempts = 0;
    const fetchPage = vi.fn(async (page: number) => {
      attempts += 1;
      if (attempts === 1) throw new Error('429');
      return pageOf([1], page, 1, 1);
    });

    await expect(fetchAllPages(fetchPage, 'tags ru')).resolves.toEqual([1]);
  });

  it('но два отказа подряд — уже не рябь: падает громко', async () => {
    const fetchPage = vi.fn(async () => {
      throw new Error('502');
    });

    await expect(fetchAllPages(fetchPage, 'tags ru')).rejects.toThrow(/502/);
  });

  it('падает, если собранное меньше обещанного', async () => {
    const fetchPage = vi.fn(async (page: number) => ({
      data: page === 1 ? [1] : [],
      meta: { total: 5, page, limit: 1, totalPages: 1 },
    }));

    await expect(fetchAllPages(fetchPage, 'categories es')).rejects.toThrow(/обход неполон/);
  });

  it('отказывается обходить неправдоподобное число страниц', async () => {
    const fetchPage = vi.fn(async (page: number) => pageOf([1], page, 1, 10_000));

    await expect(fetchAllPages(fetchPage, 'books en', 50)).rejects.toThrow(/потолок обхода/);
  });
});

/**
 * `LEGACY-298` — карта книг больше не может забрать файл одним `limit: 1000`
 * (`GET /:lang/books` теперь зажат), поэтому файл собирается фиксированным
 * окном бэкенд-страниц. В отличие от `fetchAllPages`, окно не обходит выборку
 * до конца — оно должно остановиться на границе файла, а не залезть в
 * следующий.
 */
describe('fetchPageWindow: фиксированное окно страниц (LEGACY-298)', () => {
  const pageOf = (items: number[], page: number, limit: number, total: number) => ({
    data: items,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });

  it('складывает несколько бэкенд-страниц в одно окно', async () => {
    const fetchPage = vi.fn(async (page: number) => pageOf([page * 10, page * 10 + 1], page, 2, 6));

    const items = await fetchPageWindow(fetchPage, 1, 3, 2, 'books en p1');

    expect(items).toEqual([10, 11, 20, 21, 30, 31]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('начинает не с первой бэкенд-страницы, а с заданной', async () => {
    const fetchPage = vi.fn(async (page: number) => pageOf([page], page, 1, 100));

    const items = await fetchPageWindow(fetchPage, 11, 2, 1, 'books en p2');

    expect(items).toEqual([11, 12]);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 11);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 12);
  });

  it('останавливается раньше окна, когда страница короче размера', async () => {
    const fetchPage = vi.fn(async (page: number) =>
      page === 1 ? pageOf([1, 2], 1, 2, 3) : pageOf([3], 2, 2, 3)
    );

    const items = await fetchPageWindow(fetchPage, 1, 5, 2, 'books en p1');

    expect(items).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('усечение внутри одной страницы окна валит весь обход', async () => {
    const fetchPage = vi.fn(async (page: number) =>
      page === 1 ? pageOf([1, 2], 1, 2, 10) : pageOf([3], 2, 2, 10)
    );

    await expect(fetchPageWindow(fetchPage, 1, 3, 2, 'books en p1')).rejects.toThrow(/усечена/);
  });

  it('сбой одной страницы окна не отдаёт собранную ранее часть', async () => {
    const fetchPage = vi.fn(async (page: number) => {
      if (page === 2) throw new Error('502');
      return pageOf([page], page, 1, 100);
    });

    await expect(fetchPageWindow(fetchPage, 1, 3, 1, 'books en p1')).rejects.toThrow('502');
  });
});

describe('sitemapUnavailable (LEGACY-082)', () => {
  it('отвечает 503, а не 404 — 404 снял бы с индекса все адреса файла', () => {
    expect(sitemapUnavailable(['books en p1: timeout']).status).toBe(503);
  });

  it('даёт краулеру явный срок возврата', () => {
    expect(sitemapUnavailable(['x']).headers.get('Retry-After')).toBe('120');
  });

  it('запрещает кэшировать временный отказ', () => {
    expect(sitemapUnavailable(['x']).headers.get('Cache-Control')).toBe('no-store');
  });

  /**
   * Причины нужны оператору, а не анониму: в тексте ошибки API попадаются
   * внутренние хосты и фрагменты запросов, а тело этого ответа отдаётся кому
   * угодно, включая краулера.
   */
  it('не раскрывает причины в теле — они уходят в лог', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const body = await sitemapUnavailable(['books en p1: http://internal-api:5000 timeout']).text();

    expect(body).not.toContain('internal-api');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('internal-api'));
    spy.mockRestore();
  });
});
