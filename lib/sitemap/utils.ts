import { noteDegraded } from '@/lib/seo/degraded';
import { buildPublicUrl, getSiteUrl } from '@/lib/seo/urls';

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function getBaseUrl(): string {
  return getSiteUrl();
}

export function buildUrl(path: string): string {
  return buildPublicUrl(path);
}

const BOOKS_SITEMAP_PAGE_SIZE = 1000;

/** `null` means the count could not be established — never "zero books". */
export type GetTotalBooksFn = (lang: string) => Promise<number | null>;

/**
 * Book sitemap files for the index, one language at a time.
 *
 * The failure branch used to `return []`, which removed **every** book sitemap
 * for that language from an index still served as 200 OK — the site silently
 * appeared to have lost a whole language. A 403 from the rate limiter was enough,
 * and it fires for all five languages in parallel from one request.
 *
 * This follows `sitemap-static.xml` instead, which is the correct implementation
 * of the same problem: an unknown count is kept apart from a zero count, and
 * unknown fails towards *keeping* the URL. Page 1 is emitted so the language stays
 * in the index; the per-file route decides what that page contains.
 *
 * A genuine zero still yields nothing — that is an answer, not a failure.
 */
export async function getBookSitemapUrls(
  cleanBaseUrl: string,
  supportedLangs: readonly string[],
  getTotalBooks: GetTotalBooksFn
): Promise<string[]> {
  const results = await Promise.all(
    supportedLangs.map(async (lang) => {
      const fileUrl = (index: number) =>
        `${cleanBaseUrl}/sitemaps/sitemap-books-${lang}-${index}.xml`;

      let total: number | null = null;
      try {
        total = await getTotalBooks(lang);
      } catch {
        total = null;
      }

      if (total === null || !Number.isFinite(total)) {
        noteDegraded({
          surface: 'sitemap-index',
          reason: 'count-unreadable',
          lang,
          outcome: 'kept-url',
        });
        return [fileUrl(1)];
      }

      const pages = Math.ceil(total / BOOKS_SITEMAP_PAGE_SIZE);
      return Array.from({ length: pages }, (_, index) => fileUrl(index + 1));
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
