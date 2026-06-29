import { NextResponse } from 'next/server';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bibliaris.com';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  const sitemaps = [
    `${cleanBaseUrl}/sitemaps/sitemap-static.xml`,
    ...SUPPORTED_LANGS.flatMap((lang) => [
      `${cleanBaseUrl}/sitemaps/sitemap-books-${lang}-1.xml`,
      `${cleanBaseUrl}/sitemaps/sitemap-genres-${lang}.xml`,
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
