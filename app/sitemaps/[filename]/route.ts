import { NextResponse } from 'next/server';
import { getBooks } from '@/api/endpoints/admin/books';
import { getCategories } from '@/api/endpoints/admin/categories';
import { getTags } from '@/api/endpoints/admin/tags';
import { getBookCards, getPublicAuthors } from '@/api/endpoints/public';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import type {
  BookOverview,
  Category,
  CategoryTranslation,
  Tag,
  TagTranslation,
  VersionPreview,
  AuthorListItem,
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
    const landingCounts = new Map<string, { audiobooks: number; popular: number; new: number }>();
    await Promise.all(
      SUPPORTED_LANGS.map(async (lang) => {
        const [audioRes, popRes, newRes] = await Promise.all([
          getBookCards(lang as SupportedLang, 1, 1, { type: 'audio' }).catch(() => null),
          getBookCards(lang as SupportedLang, 1, 1, { sort: 'popular' }).catch(() => null),
          getBookCards(lang as SupportedLang, 1, 1, { sort: 'new' }).catch(() => null),
        ]);
        landingCounts.set(lang, {
          audiobooks: audioRes?.pagination?.total ?? 0,
          popular: popRes?.pagination?.total ?? 0,
          new: newRes?.pagination?.total ?? 0,
        });
      })
    );

    const staticRoutes: { path: string; include: (lang: string) => boolean }[] = [
      { path: '', include: () => true },
      { path: '/categories', include: () => true },
      { path: '/genres', include: () => true },
      { path: '/collections', include: () => true },
      { path: '/tags', include: () => true },
      { path: '/catalog', include: () => true },
      { path: '/audiobooks', include: (lang) => (landingCounts.get(lang)?.audiobooks ?? 0) > 0 },
      { path: '/popular-books', include: (lang) => (landingCounts.get(lang)?.popular ?? 0) > 0 },
      { path: '/new-releases', include: (lang) => (landingCounts.get(lang)?.new ?? 0) > 0 },
      { path: '/privacy', include: () => true },
      { path: '/terms', include: () => true },
      { path: '/deletion', include: () => true },
    ];
    staticRoutes.forEach(({ path: route, include }) => {
      SUPPORTED_LANGS.forEach((lang) => {
        if (!include(lang)) return;

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
  // 2. Books Sitemap: sitemap-books-[lang]-[n].xml (paginated)
  else if (/^sitemap-books-[a-z]{2}-[0-9]+\.xml$/.test(filename)) {
    const match = filename.match(/^sitemap-books-([a-z]{2})-([0-9]+)\.xml$/);
    if (!match) {
      return new NextResponse('Sitemap not found', { status: 404 });
    }
    const lang = match[1];
    const pageNumber = parseInt(match[2], 10);
    if (!(SUPPORTED_LANGS as readonly string[]).includes(lang) || pageNumber < 1) {
      return new NextResponse('Sitemap not found', { status: 404 });
    }
    let books: BookOverview[] = [];
    try {
      const booksRes = await getBooks({ page: pageNumber, limit: 1000 });
      books = booksRes?.data || [];
    } catch (error) {
      console.error(`Error fetching books for sitemap (${lang}, page ${pageNumber}):`, error);
    }
    // Return 404 if page is out of range (no items)
    if (books.length === 0) {
      return new NextResponse('Sitemap not found', { status: 404 });
    }

    books.forEach((book) => {
      // Find published version for this specific language
      const currentVersion = book.versions?.find(
        (v: VersionPreview) => v.language === lang && v.status === 'published' && v.slug
      );
      if (!currentVersion?.slug) return;

      // Build alternates from all published versions with slug
      const alternates: Record<string, string> = {};
      const publishedVersions =
        book.versions?.filter((v: VersionPreview) => v.status === 'published' && v.slug) || [];

      publishedVersions.forEach((v: VersionPreview) => {
        if (v.language && v.slug) {
          alternates[v.language] = `${cleanBaseUrl}/${v.language}/book/${v.slug}`;
        }
      });

      // x-default: prefer English, fallback to first available
      const enVersion = publishedVersions.find((v: VersionPreview) => v.language === 'en');
      const fallbackVersion = publishedVersions[0];
      const defaultVersion = enVersion || fallbackVersion;
      if (defaultVersion) {
        alternates['x-default'] =
          `${cleanBaseUrl}/${defaultVersion.language}/book/${defaultVersion.slug}`;
      }

      const url = `${cleanBaseUrl}/${lang}/book/${currentVersion.slug}`;

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
  // 3. Genres Sitemap: sitemap-genres-[lang].xml
  else if (filename.startsWith('sitemap-genres-') && filename.endsWith('.xml')) {
    const lang = filename.substring('sitemap-genres-'.length, filename.length - '.xml'.length);
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      let categories: Category[] = [];
      try {
        const catRes = await getCategories({ type: 'genre', limit: 1000 });
        categories = catRes?.data || [];
      } catch (error) {
        console.error(`Error fetching genres for sitemap (${lang}):`, error);
      }

      categories.forEach((cat) => {
        // Skip genres without books
        if (!cat.booksCount || cat.booksCount === 0) return;

        const currentTranslation = cat.translations?.find(
          (t: CategoryTranslation) => t.language === lang && t.slug
        );
        if (!currentTranslation?.slug) return;

        const url = `${cleanBaseUrl}/${lang}/genre/${currentTranslation.slug}`;

        const alternates: Record<string, string> = {};
        cat.translations?.forEach((t: CategoryTranslation) => {
          if (t.slug) {
            alternates[t.language] = `${cleanBaseUrl}/${t.language}/genre/${t.slug}`;
          }
        });

        // x-default: prefer English, fallback to first available with real language
        const enTranslation = cat.translations?.find(
          (t: CategoryTranslation) => t.language === 'en' && t.slug
        );
        const fallbackTranslation = cat.translations?.find((t: CategoryTranslation) => t.slug);
        const defaultTranslation = enTranslation || fallbackTranslation;
        if (defaultTranslation?.slug) {
          alternates['x-default'] =
            `${cleanBaseUrl}/${defaultTranslation.language}/genre/${defaultTranslation.slug}`;
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
  // 3a. Categories Sitemap: sitemap-categories-[lang].xml
  else if (filename.startsWith('sitemap-categories-') && filename.endsWith('.xml')) {
    const lang = filename.substring('sitemap-categories-'.length, filename.length - '.xml'.length);
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      let categories: Category[] = [];
      try {
        const catRes = await getCategories({ type: 'category', limit: 1000 });
        categories = catRes?.data || [];
      } catch (error) {
        console.error(`Error fetching categories for sitemap (${lang}):`, error);
      }

      categories.forEach((cat) => {
        // Skip categories without books
        if (!cat.booksCount || cat.booksCount === 0) return;

        const currentTranslation = cat.translations?.find(
          (t: CategoryTranslation) => t.language === lang && t.slug
        );
        if (!currentTranslation?.slug) return;

        const url = `${cleanBaseUrl}/${lang}/category/${currentTranslation.slug}`;

        const alternates: Record<string, string> = {};
        cat.translations?.forEach((t: CategoryTranslation) => {
          if (t.slug) {
            alternates[t.language] = `${cleanBaseUrl}/${t.language}/category/${t.slug}`;
          }
        });

        const enTranslation = cat.translations?.find(
          (t: CategoryTranslation) => t.language === 'en' && t.slug
        );
        const fallbackTranslation = cat.translations?.find((t: CategoryTranslation) => t.slug);
        const defaultTranslation = enTranslation || fallbackTranslation;
        if (defaultTranslation?.slug) {
          alternates['x-default'] =
            `${cleanBaseUrl}/${defaultTranslation.language}/category/${defaultTranslation.slug}`;
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
  // 3b. Collections Sitemap: sitemap-collections-[lang].xml
  else if (filename.startsWith('sitemap-collections-') && filename.endsWith('.xml')) {
    const lang = filename.substring('sitemap-collections-'.length, filename.length - '.xml'.length);
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      let categories: Category[] = [];
      try {
        const catRes = await getCategories({ type: 'collection', limit: 1000 });
        categories = catRes?.data || [];
      } catch (error) {
        console.error(`Error fetching collections for sitemap (${lang}):`, error);
      }

      categories.forEach((cat) => {
        // Skip collections without books
        if (!cat.booksCount || cat.booksCount === 0) return;

        const currentTranslation = cat.translations?.find(
          (t: CategoryTranslation) => t.language === lang && t.slug
        );
        if (!currentTranslation?.slug) return;

        const url = `${cleanBaseUrl}/${lang}/collection/${currentTranslation.slug}`;

        const alternates: Record<string, string> = {};
        cat.translations?.forEach((t: CategoryTranslation) => {
          if (t.slug) {
            alternates[t.language] = `${cleanBaseUrl}/${t.language}/collection/${t.slug}`;
          }
        });

        const enTranslation = cat.translations?.find(
          (t: CategoryTranslation) => t.language === 'en' && t.slug
        );
        const fallbackTranslation = cat.translations?.find((t: CategoryTranslation) => t.slug);
        const defaultTranslation = enTranslation || fallbackTranslation;
        if (defaultTranslation?.slug) {
          alternates['x-default'] =
            `${cleanBaseUrl}/${defaultTranslation.language}/collection/${defaultTranslation.slug}`;
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
  // 4. Authors Sitemap: sitemap-authors-[lang].xml
  else if (/^sitemap-authors-[a-z]{2}\.xml$/.test(filename)) {
    const lang = filename.replace(/^sitemap-authors-/, '').replace(/\.xml$/, '');
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      const allAuthors: AuthorListItem[] = [];
      try {
        // Paginate through all authors using the public endpoint
        const firstPage = await getPublicAuthors(lang as SupportedLang, { page: 1, limit: 100 });
        const total = firstPage.meta.total;
        allAuthors.push(...firstPage.data);
        const totalPages = Math.ceil(total / 100);
        if (totalPages > 1) {
          const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
          const results = await Promise.all(
            remainingPages.map((p) =>
              getPublicAuthors(lang as SupportedLang, { page: p, limit: 100 }).catch(() => null)
            )
          );
          results.forEach((res) => {
            if (res) allAuthors.push(...res.data);
          });
        }
      } catch (error) {
        console.error(`Error fetching authors for sitemap (${lang}):`, error);
      }

      allAuthors.forEach((author) => {
        const slug = author.slug;
        if (!slug) return;

        const activeLangs: string[] = [];
        if (author.translations) {
          author.translations.forEach((t) => {
            if (t.slug && (SUPPORTED_LANGS as readonly string[]).includes(t.language)) {
              activeLangs.push(t.language);
            }
          });
        }

        const url = `${cleanBaseUrl}/${lang}/author/${slug}`;
        const alternates =
          activeLangs.length > 0
            ? getAlternates(activeLangs, (l) => `${cleanBaseUrl}/${l}/author/${slug}`)
            : undefined;

        sitemapItems.push({
          url,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
          ...(alternates ? { alternates: { languages: alternates } } : {}),
        });
      });
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

        const currentTranslation = tag.translations?.find(
          (t: TagTranslation) => t.language === lang && t.slug
        );
        if (!currentTranslation?.slug) return;

        const url = `${cleanBaseUrl}/${lang}/tag/${currentTranslation.slug}`;

        const alternates: Record<string, string> = {};
        tag.translations?.forEach((t: TagTranslation) => {
          if (t.slug) {
            alternates[t.language] = `${cleanBaseUrl}/${t.language}/tag/${t.slug}`;
          }
        });

        // x-default: prefer English, fallback to first available with real language
        const enTranslation = tag.translations?.find(
          (t: TagTranslation) => t.language === 'en' && t.slug
        );
        const fallbackTranslation = tag.translations?.find((t: TagTranslation) => t.slug);
        const defaultTranslation = enTranslation || fallbackTranslation;
        if (defaultTranslation?.slug) {
          alternates['x-default'] =
            `${cleanBaseUrl}/${defaultTranslation.language}/tag/${defaultTranslation.slug}`;
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
