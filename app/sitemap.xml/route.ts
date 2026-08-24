import { NextResponse } from 'next/server';
import { getPublicBooks } from '@/api/endpoints/public';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { getBaseUrl, getBookSitemapUrls, buildSitemapIndexXml } from '@/lib/sitemap/utils';

export const dynamic = 'force-dynamic';

/** Same reason as in `app/sitemaps/[filename]/route.ts`: the index must not be built from cached counts. */
export const fetchCache = 'force-no-store';

/**
 * `res.meta.total` was read unguarded. A missing `meta` threw; worse, a non-numeric
 * `total` did not even throw — it produced `Math.ceil(NaN)`, then an empty array of
 * book sitemaps, with no error anywhere. Returning `null` keeps "could not tell"
 * distinct from "no books", which is the whole point of the branch downstream.
 */
async function fetchBooksTotal(lang: string): Promise<number | null> {
  const res = await getPublicBooks(lang as SupportedLang, { page: 1, limit: 1 });
  const total = res?.meta?.total;
  return typeof total === 'number' && Number.isFinite(total) ? total : null;
}

export async function GET() {
  const cleanBaseUrl = getBaseUrl();

  const bookSitemapUrls = await getBookSitemapUrls(cleanBaseUrl, SUPPORTED_LANGS, fetchBooksTotal);

  const sitemaps = [
    `${cleanBaseUrl}/sitemaps/sitemap-static.xml`,
    ...bookSitemapUrls,
    ...SUPPORTED_LANGS.flatMap((lang) => [
      `${cleanBaseUrl}/sitemaps/sitemap-categories-${lang}.xml`,
      `${cleanBaseUrl}/sitemaps/sitemap-genres-${lang}.xml`,
      `${cleanBaseUrl}/sitemaps/sitemap-collections-${lang}.xml`,
      `${cleanBaseUrl}/sitemaps/sitemap-authors-${lang}.xml`,
      // Страницы букв хаба авторов. Отдельным файлом, а не строками в
      // `sitemap-static.xml`: их до тридцати на язык, и каждая проверяется
      // на непустоту — пустая буква в карту не попадает.
      `${cleanBaseUrl}/sitemaps/sitemap-author-letters-${lang}.xml`,
      `${cleanBaseUrl}/sitemaps/sitemap-tags-${lang}.xml`,
    ]),
  ];

  const xml = buildSitemapIndexXml(sitemaps);

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
