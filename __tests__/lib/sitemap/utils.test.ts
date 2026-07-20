import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  escapeXml,
  getBaseUrl,
  buildUrl,
  getBookSitemapUrls,
  buildSitemapIndexXml,
  buildUrlSetXml,
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

  it('should handle fetch errors gracefully', async () => {
    const getTotalBooks: (lang: string) => Promise<number> = async (_lang) => {
      throw new Error('API error');
    };

    const urls = await getBookSitemapUrls(baseUrl, langs, getTotalBooks);

    expect(urls).toHaveLength(0);
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
