import { NextResponse } from 'next/server';
import { getBooks } from '@/api/endpoints/admin/books';
import { getCategories } from '@/api/endpoints/admin/categories';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type {
  BookOverview,
  Category,
  CategoryTranslation,
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

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bibliaris.com';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const defaultLang = 'en';

  const sitemapItems: SitemapItem[] = [];

  // Helper to generate alternate URLs for a given route template
  const getAlternates = (languages: readonly string[], pathBuilder: (lang: string) => string) => {
    const alternates: Record<string, string> = {};
    languages.forEach((lang) => {
      alternates[lang] = pathBuilder(lang);
    });
    alternates['x-default'] = pathBuilder(defaultLang);
    return alternates;
  };

  // 1. Static Pages
  const staticRoutes = ['', '/genres', '/catalog', '/privacy', '/terms', '/deletion'];
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

  // 2. Fetch Books from Backend
  let books: BookOverview[] = [];
  try {
    const booksRes = await getBooks({ limit: 1000 });
    books = booksRes?.data || [];
  } catch (error) {
    console.error('Error fetching books for sitemap:', error);
  }

  // Generate Book pages (/[lang]/book/[slug])
  books.forEach((book) => {
    if (!book.slug) return;

    // Only include languages where the book has a published version
    const publishedLangs = SUPPORTED_LANGS.filter((lang) =>
      book.versions?.some((v: VersionPreview) => v.language === lang && v.status === 'published')
    );

    if (publishedLangs.length === 0) return;

    publishedLangs.forEach((lang) => {
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
  });

  // 3. Fetch Categories from Backend
  let categories: Category[] = [];
  try {
    const catRes = await getCategories({ limit: 100 });
    categories = catRes?.data || [];
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
  }

  // Generate Category pages (/[lang]/catalog/[categorySlug])
  categories.forEach((cat) => {
    // Find all languages where category has a translation
    const translatedLangs = SUPPORTED_LANGS.filter((lang) =>
      cat.translations?.some((t: CategoryTranslation) => t.language === lang && t.slug)
    );

    if (translatedLangs.length === 0) return;

    translatedLangs.forEach((lang) => {
      const currentTranslation = cat.translations?.find(
        (t: CategoryTranslation) => t.language === lang
      );
      if (!currentTranslation?.slug) return;

      const url = `${cleanBaseUrl}/${lang}/catalog/${currentTranslation.slug}`;

      // Build alternates mapping only using the localized slug for each language
      const alternates: Record<string, string> = {};
      translatedLangs.forEach((l) => {
        const trans = cat.translations?.find((t: CategoryTranslation) => t.language === l);
        if (trans?.slug) {
          alternates[l] = `${cleanBaseUrl}/${l}/catalog/${trans.slug}`;
        }
      });

      // x-default alternates to the default language (en) or first available translation
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
  });

  // 4. Generate Author pages (/[lang]/author/[authorSlug]) dynamically from published book versions
  const authorsByLang = new Map<string, Set<string>>(); // lang -> Set of author names
  SUPPORTED_LANGS.forEach((lang) => {
    authorsByLang.set(lang, new Set<string>());
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

  // Map author names to a global unique set to build cross-language mapping
  const allAuthorNames = new Set<string>();
  authorsByLang.forEach((names) => {
    names.forEach((name) => allAuthorNames.add(name));
  });

  allAuthorNames.forEach((authorName) => {
    const authorSlug = encodeURIComponent(authorName.trim().replace(/\s+/g, '-')).toLowerCase();

    // Only include in languages where the author has at least one published book version
    const activeLangs = SUPPORTED_LANGS.filter((lang) => authorsByLang.get(lang)?.has(authorName));

    if (activeLangs.length === 0) return;

    activeLangs.forEach((lang) => {
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
  });

  // Convert sitemap items to XML
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
      Object.entries(item.alternates.languages).forEach(([lang, href]) => {
        itemXml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />\n`;
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
