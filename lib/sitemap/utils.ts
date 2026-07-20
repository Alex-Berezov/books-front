export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://bibliaris.com').replace(/\/$/, '');
}

export function buildUrl(path: string): string {
  return `${getBaseUrl()}${path}`;
}

const BOOKS_SITEMAP_PAGE_SIZE = 1000;

export type GetTotalBooksFn = (lang: string) => Promise<number>;

export async function getBookSitemapUrls(
  cleanBaseUrl: string,
  supportedLangs: readonly string[],
  getTotalBooks: GetTotalBooksFn
): Promise<string[]> {
  const results = await Promise.all(
    supportedLangs.map(async (lang) => {
      try {
        const total = await getTotalBooks(lang);
        const pages = Math.ceil(total / BOOKS_SITEMAP_PAGE_SIZE);
        return Array.from(
          { length: pages },
          (_, index) => `${cleanBaseUrl}/sitemaps/sitemap-books-${lang}-${index + 1}.xml`
        );
      } catch {
        return [] as string[];
      }
    })
  );
  return results.flat();
}

export interface SitemapItem {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: {
    languages?: Record<string, string>;
  };
}

export function buildSitemapIndexXml(sitemapUrls: string[]): string {
  const xmlItems = sitemapUrls.map((url) => {
    const safeUrl = escapeXml(url);
    return ['  <sitemap>', `    <loc>${safeUrl}</loc>`, '  </sitemap>'].join('\n');
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems.join('\n')}
</sitemapindex>`;
}

export function buildUrlSetXml(items: SitemapItem[]): string {
  const xmlItems = items.map((item) => {
    let itemXml = '  <url>\n';
    itemXml += `    <loc>${escapeXml(item.url)}</loc>\n`;
    if (item.lastModified) {
      const dateStr =
        typeof item.lastModified === 'string'
          ? item.lastModified
          : (item.lastModified as Date).toISOString();
      itemXml += `    <lastmod>${escapeXml(dateStr)}</lastmod>\n`;
    }
    if (item.changeFrequency) {
      itemXml += `    <changefreq>${escapeXml(item.changeFrequency)}</changefreq>\n`;
    }
    if (item.priority !== undefined) {
      itemXml += `    <priority>${escapeXml(item.priority.toFixed(1))}</priority>\n`;
    }
    if (item.alternates?.languages) {
      Object.entries(item.alternates.languages).forEach(([langKey, href]) => {
        const safeLangKey = escapeXml(langKey);
        const safeHref = escapeXml(href);
        itemXml += `    <xhtml:link rel="alternate" hreflang="${safeLangKey}" href="${safeHref}" />\n`;
      });
    }
    itemXml += '  </url>';
    return itemXml;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${xmlItems.join('\n')}
</urlset>`;
}
