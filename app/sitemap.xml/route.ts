import { NextResponse } from 'next/server';
import { getBooks } from '@/api/endpoints/admin/books';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';

const BOOKS_SITEMAP_PAGE_SIZE = 1000;

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bibliaris.com';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  let totalBooks = 0;
  try {
    const firstPage = await getBooks({ page: 1, limit: 1 });
    totalBooks = firstPage.meta.total;
  } catch {
    // fallback to 1 page if we cannot get total
    totalBooks = 0;
  }
  const bookSitemapPages = Math.ceil(totalBooks / BOOKS_SITEMAP_PAGE_SIZE) || 1;

  const sitemaps = [
    `${cleanBaseUrl}/sitemaps/sitemap-static.xml`,
    ...SUPPORTED_LANGS.flatMap((lang) =>
      Array.from(
        { length: bookSitemapPages },
        (_, index) => `${cleanBaseUrl}/sitemaps/sitemap-books-${lang}-${index + 1}.xml`
      )
    ),
    ...SUPPORTED_LANGS.flatMap((lang) => [
      `${cleanBaseUrl}/sitemaps/sitemap-categories-${lang}.xml`,
      `${cleanBaseUrl}/sitemaps/sitemap-genres-${lang}.xml`,
      `${cleanBaseUrl}/sitemaps/sitemap-collections-${lang}.xml`,
      `${cleanBaseUrl}/sitemaps/sitemap-authors-${lang}.xml`,
      `${cleanBaseUrl}/sitemaps/sitemap-tags-${lang}.xml`,
    ]),
  ];

  const xmlItems = sitemaps.map((url) => {
    return ['  <sitemap>', `    <loc>${url}</loc>`, '  </sitemap>'].join('\n');
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems.join('\n')}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
