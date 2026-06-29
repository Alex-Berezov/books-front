import { NextResponse } from 'next/server';
import { getBooks } from '@/api/endpoints/admin/books';
import { getCategories } from '@/api/endpoints/admin/categories';
import { getTags } from '@/api/endpoints/admin/tags';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type {
  BookOverview,
  Category,
  CategoryTranslation,
  Tag,
  TagTranslation,
  VersionPreview,
} from '@/types/api-schema';

export const dynamic = 'force-dynamic';

interface SitemapItem {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: {
    languages?: Record<string, string>;
  };
}

export async function GET(request: Request, { params }: { params: { filename: string } }) {
  const { filename } = params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bibliaris.com';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const defaultLang = 'en';

  const sitemapItems: SitemapItem[] = [];

  const getAlternates = (languages: readonly string[], pathBuilder: (lang: string) => string) => {
    const alternates: Record<string, string> = {};
    languages.forEach((lang) => {
      alternates[lang] = pathBuilder(lang);
    });
    alternates['x-default'] = pathBuilder(defaultLang);
    return alternates;
  };

  // 1. Static Sitemap
  if (filename === 'sitemap-static.xml') {
    const staticRoutes = ['', '/genres', '/tags', '/catalog', '/privacy', '/terms', '/deletion'];
    staticRoutes.forEach((route) => {
      SUPPORTED_LANGS.forEach((lang) => {
        const url = `${cleanBaseUrl}/${lang}${route}`;
        const alternates = getAlternates(SUPPORTED_LANGS, (l) => `${cleanBaseUrl}/${l}${route}`);

        sitemapItems.push({
          url,
          lastModified: new Date(),
          changeFrequency: route === '' ? 'daily' : 'weekly',
          priority: route === '' ? 1.0 : 0.8,
          alternates: {
            languages: alternates,
          },
        });
      });
    });
  }
  // 2. Books Sitemap: sitemap-books-[lang]-1.xml
  else if (filename.startsWith('sitemap-books-') && filename.endsWith('-1.xml')) {
    const lang = filename.substring('sitemap-books-'.length, filename.length - '-1.xml'.length);
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      let books: BookOverview[] = [];
      try {
        const booksRes = await getBooks({ limit: 1000 });
        books = booksRes?.data || [];
      } catch (error) {
        console.error(`Error fetching books for sitemap (${lang}):`, error);
      }

      books.forEach((book) => {
        if (!book.slug) return;

        // Check if there is a published version in this specific language
        const hasLangVersion = book.versions?.some(
          (v: VersionPreview) => v.language === lang && v.status === 'published'
        );
        if (!hasLangVersion) return;

        // Find all languages where the book has a published version for alternates
        const publishedLangs = SUPPORTED_LANGS.filter((l) =>
          book.versions?.some((v: VersionPreview) => v.language === l && v.status === 'published')
        );

        const url = `${cleanBaseUrl}/${lang}/book/${book.slug}`;
        const alternates = getAlternates(
          publishedLangs,
          (l) => `${cleanBaseUrl}/${l}/book/${book.slug}`
        );

        sitemapItems.push({
          url,
          lastModified: new Date(book.updatedAt || new Date()),
          changeFrequency: 'daily',
          priority: 0.9,
          alternates: {
            languages: alternates,
          },
        });
      });
    }
  }
  // 3. Genres Sitemap: sitemap-genres-[lang].xml
  else if (filename.startsWith('sitemap-genres-') && filename.endsWith('.xml')) {
    const lang = filename.substring('sitemap-genres-'.length, filename.length - '.xml'.length);
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      let categories: Category[] = [];
      try {
        const catRes = await getCategories({ limit: 100 });
        categories = catRes?.data || [];
      } catch (error) {
        console.error(`Error fetching categories for sitemap (${lang}):`, error);
      }

      categories.forEach((cat) => {
        const hasTranslation = cat.translations?.some(
          (t: CategoryTranslation) => t.language === lang && t.slug
        );
        if (!hasTranslation) return;

        const currentTranslation = cat.translations?.find(
          (t: CategoryTranslation) => t.language === lang
        );
        if (!currentTranslation?.slug) return;

        const url = `${cleanBaseUrl}/${lang}/catalog/${currentTranslation.slug}`;

        const alternates: Record<string, string> = {};
        const translatedLangs = SUPPORTED_LANGS.filter((l) =>
          cat.translations?.some((t: CategoryTranslation) => t.language === l && t.slug)
        );

        translatedLangs.forEach((l) => {
          const trans = cat.translations?.find((t: CategoryTranslation) => t.language === l);
          if (trans?.slug) {
            alternates[l] = `${cleanBaseUrl}/${l}/catalog/${trans.slug}`;
          }
        });

        const defaultTrans =
          cat.translations?.find((t: CategoryTranslation) => t.language === defaultLang) ||
          cat.translations?.[0];
        if (defaultTrans?.slug) {
          alternates['x-default'] = `${cleanBaseUrl}/${defaultLang}/catalog/${defaultTrans.slug}`;
        }

        sitemapItems.push({
          url,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: {
            languages: alternates,
          },
        });
      });
    }
  }
  // 4. Authors Sitemap: sitemap-authors-[lang].xml / sitemap-authors-[lang]-1.xml
  else if (filename.startsWith('sitemap-authors-') && filename.endsWith('.xml')) {
    let lang = '';
    if (filename.endsWith('-1.xml')) {
      lang = filename.substring('sitemap-authors-'.length, filename.length - '-1.xml'.length);
    } else {
      lang = filename.substring('sitemap-authors-'.length, filename.length - '.xml'.length);
    }

    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      let books: BookOverview[] = [];
      try {
        const booksRes = await getBooks({ limit: 1000 });
        books = booksRes?.data || [];
      } catch (error) {
        console.error(`Error fetching books for sitemap (${lang}):`, error);
      }

      const authorsByLang = new Map<string, Set<string>>();
      SUPPORTED_LANGS.forEach((l) => {
        authorsByLang.set(l, new Set<string>());
      });

      books.forEach((book) => {
        book.versions?.forEach((v: VersionPreview) => {
          if (
            v.status === 'published' &&
            v.author &&
            v.language &&
            SUPPORTED_LANGS.includes(v.language)
          ) {
            authorsByLang.get(v.language)?.add(v.author);
          }
        });
      });

      const langAuthors = authorsByLang.get(lang);
      if (langAuthors) {
        langAuthors.forEach((authorName) => {
          const authorSlug = encodeURIComponent(
            authorName.trim().replace(/\s+/g, '-')
          ).toLowerCase();
          const activeLangs = SUPPORTED_LANGS.filter((l) => authorsByLang.get(l)?.has(authorName));

          const url = `${cleanBaseUrl}/${lang}/author/${authorSlug}`;
          const alternates = getAlternates(
            activeLangs,
            (l) => `${cleanBaseUrl}/${l}/author/${authorSlug}`
          );

          sitemapItems.push({
            url,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
            alternates: {
              languages: alternates,
            },
          });
        });
      }
    }
  }
  // 5. Tags Sitemap: sitemap-tags-[lang].xml
  else if (filename.startsWith('sitemap-tags-') && filename.endsWith('.xml')) {
    const lang = filename.substring('sitemap-tags-'.length, filename.length - '.xml'.length);
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      let tags: Tag[] = [];
      try {
        const tagsRes = await getTags({ limit: 1000 });
        tags = tagsRes?.data || [];
      } catch (error) {
        console.error(`Error fetching tags for sitemap (${lang}):`, error);
      }

      tags.forEach((tag) => {
        // Skip tags without books
        if (!tag.booksCount || tag.booksCount === 0) return;

        const hasTranslation = tag.translations?.some(
          (t: TagTranslation) => t.language === lang && t.slug
        );
        if (!hasTranslation) return;

        const currentTranslation = tag.translations?.find(
          (t: TagTranslation) => t.language === lang
        );
        if (!currentTranslation?.slug) return;

        const url = `${cleanBaseUrl}/${lang}/tag/${currentTranslation.slug}`;

        const alternates: Record<string, string> = {};
        const translatedLangs = SUPPORTED_LANGS.filter((l) =>
          tag.translations?.some((t: TagTranslation) => t.language === l && t.slug)
        );

        translatedLangs.forEach((l) => {
          const trans = tag.translations?.find((t: TagTranslation) => t.language === l);
          if (trans?.slug) {
            alternates[l] = `${cleanBaseUrl}/${l}/tag/${trans.slug}`;
          }
        });

        const defaultTrans =
          tag.translations?.find((t: TagTranslation) => t.language === defaultLang) ||
          tag.translations?.[0];
        if (defaultTrans?.slug) {
          alternates['x-default'] = `${cleanBaseUrl}/${defaultLang}/tag/${defaultTrans.slug}`;
        }

        sitemapItems.push({
          url,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
          alternates: {
            languages: alternates,
          },
        });
      });
    }
  }

  // If no items matched, return 404
  if (sitemapItems.length === 0) {
    return new NextResponse('Sitemap not found', { status: 404 });
  }

  const xmlItems = sitemapItems.map((item) => {
    let itemXml = '  <url>\n';
    itemXml += `    <loc>${item.url}</loc>\n`;
    if (item.lastModified) {
      const dateStr =
        typeof item.lastModified === 'string'
          ? item.lastModified
          : (item.lastModified as Date).toISOString();
      itemXml += `    <lastmod>${dateStr}</lastmod>\n`;
    }
    if (item.changeFrequency) {
      itemXml += `    <changefreq>${item.changeFrequency}</changefreq>\n`;
    }
    if (item.priority !== undefined) {
      itemXml += `    <priority>${item.priority.toFixed(1)}</priority>\n`;
    }
    if (item.alternates?.languages) {
      Object.entries(item.alternates.languages).forEach(([langKey, href]) => {
        itemXml += `    <xhtml:link rel="alternate" hreflang="${langKey}" href="${href}" />\n`;
      });
    }
    itemXml += '  </url>';
    return itemXml;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${xmlItems.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
