import { NextResponse } from 'next/server';
import { getPublicBooks } from '@/api/endpoints/public';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { getBaseUrl, getBookSitemapUrls, buildSitemapIndexXml } from '@/lib/sitemap/utils';

export const dynamic = 'force-dynamic';

async function fetchBooksTotal(lang: string): Promise<number> {
  const res = await getPublicBooks(lang as SupportedLang, { page: 1, limit: 1 });
  return res.meta.total;
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
