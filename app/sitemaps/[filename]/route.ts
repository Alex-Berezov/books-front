import { NextResponse } from 'next/server';
import { getCategories } from '@/api/endpoints/admin/categories';
import { getTags } from '@/api/endpoints/admin/tags';
import { getPublicBooks, getBookCards, getPublicAuthors } from '@/api/endpoints/public';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { isAuthorLinkable } from '@/lib/seo/author-linkable';
import { buildIndexableAlternates, type AlternateCandidate } from '@/lib/seo/hreflang-alternates';
import { isTaxonomyLinkable } from '@/lib/seo/taxonomy-linkable';
import { getBaseUrl, buildUrlSetXml, type SitemapItem } from '@/lib/sitemap/utils';
import { toCountResult, type CountResult } from '@/lib/utils/seo-indexing';
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

/**
 * The sitemap must never be built from stale taxonomy state.
 *
 * `dynamic = 'force-dynamic'` only guarantees the handler re-runs per request —
 * the upstream `fetch` calls still land in the Next data cache, because the API
 * sends no `Cache-Control` header of its own. On 05.08.2026 that combination
 * kept the sitemap advertising 2205 taxonomy URLs for hours after the backend
 * had already recomputed `autoIndexable` to `false` for all of them: the handler
 * ran fresh (`lastmod` was current) while its data was hours old.
 */
export const fetchCache = 'force-no-store';

/**
 * Переводы термина, приведённые к кандидатам hreflang.
 *
 * 🔴 Линкуемость считается **по переводу**, а не по термину целиком: у hreflang
 * вопрос задаётся про каждый язык отдельно. Термин-уровневые переключатели
 * (`isVisible`, `indexable`) редакторские и общие для всех языков, а
 * `autoIndexable`/`bookCount` — свои у каждого перевода.
 *
 * Для языка самого файла это даёт тот же ответ, что и `isTaxonomyLinkable(term)`
 * выше по ветке: список отдаётся с `?lang`, и верхнеуровневые `autoIndexable` и
 * `langBookCount` там — значения этого же перевода. Значит, self-ссылка кластера
 * не может пропасть у URL, который в карту попал.
 */
function toAlternateCandidates(
  term: { isVisible?: boolean; indexable?: boolean },
  translations: Array<{
    language: string;
    slug?: string;
    autoIndexable?: boolean;
    bookCount?: number;
  }>
): AlternateCandidate[] {
  return translations
    .filter((t) => Boolean(t.slug))
    .map((t) => ({
      language: t.language,
      slug: t.slug as string,
      linkable: isTaxonomyLinkable({
        isVisible: term.isVisible,
        indexable: term.indexable,
        autoIndexable: t.autoIndexable,
        booksCount: t.bookCount,
      }),
    }));
}

export async function GET(request: Request, { params }: { params: { filename: string } }) {
  const { filename } = params;
  const cleanBaseUrl = getBaseUrl();
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
    // A landing is dropped from the sitemap only when it is *known* to be empty.
    // `.catch(() => null)` collapsed into `?? 0` used to silently un-list all
    // three landings in every language whenever the API blinked during a crawl.
    const landingCounts = new Map<
      string,
      { audiobooks: CountResult; popular: CountResult; new: CountResult }
    >();
    await Promise.all(
      SUPPORTED_LANGS.map(async (lang) => {
        const count = async (params: Parameters<typeof getBookCards>[3]) => {
          try {
            const res = await getBookCards(lang as SupportedLang, 1, 1, params);
            return toCountResult(res?.pagination?.total ?? null);
          } catch (error) {
            console.error(`Error counting landing books for sitemap (${lang}):`, error);
            return toCountResult(null);
          }
        };
        const [audiobooks, popular, newest] = await Promise.all([
          count({ type: 'audio' }),
          count({ sort: 'popular' }),
          count({ sort: 'new' }),
        ]);
        landingCounts.set(lang, { audiobooks, popular, new: newest });
      })
    );

    /** Unknown counts as "keep": dropping a live URL costs more than listing an empty one. */
    const hasLanding = (lang: string, key: 'audiobooks' | 'popular' | 'new'): boolean => {
      const count = landingCounts.get(lang)?.[key];
      if (!count || !count.ok) return true;
      return count.total > 0;
    };

    const staticRoutes: { path: string; include: (lang: string) => boolean }[] = [
      { path: '', include: () => true },
      { path: '/categories', include: () => true },
      { path: '/genres', include: () => true },
      { path: '/collections', include: () => true },
      { path: '/tags', include: () => true },
      { path: '/catalog', include: () => true },
      { path: '/audiobooks', include: (lang) => hasLanding(lang, 'audiobooks') },
      { path: '/popular-books', include: (lang) => hasLanding(lang, 'popular') },
      { path: '/new-releases', include: (lang) => hasLanding(lang, 'new') },
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
          ...(alternates ? { alternates: { languages: alternates } } : {}),
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
      const booksRes = await getPublicBooks(lang as SupportedLang, {
        page: pageNumber,
        limit: 1000,
      });
      books = booksRes?.data || [];
    } catch (error) {
      console.error(`Error fetching books for sitemap (${lang}, page ${pageNumber}):`, error);
    }
    if (books.length === 0) {
      return new NextResponse('Sitemap not found', { status: 404 });
    }

    books.forEach((book) => {
      const currentVersion = book.versions?.find(
        (v: VersionPreview) => v.language === lang && v.status === 'published' && v.slug
      );
      if (!currentVersion?.slug) return;

      const alternates: Record<string, string> = {};
      const publishedVersions =
        book.versions?.filter((v: VersionPreview) => v.status === 'published' && v.slug) || [];

      publishedVersions.forEach((v: VersionPreview) => {
        if (v.language && v.slug) {
          alternates[v.language] = `${cleanBaseUrl}/${v.language}/book/${v.slug}`;
        }
      });

      const enVersion = publishedVersions.find((v: VersionPreview) => v.language === 'en');
      const fallbackVersion = publishedVersions[0];
      const defaultVersion = enVersion || fallbackVersion;
      if (defaultVersion) {
        alternates['x-default'] =
          `${cleanBaseUrl}/${defaultVersion.language}/book/${defaultVersion.slug ?? ''}`;
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
        const catRes = await getCategories({ type: 'genre', limit: 1000, lang });
        categories = catRes?.data || [];
      } catch (error) {
        console.error(`Error fetching genres for sitemap (${lang}):`, error);
      }

      categories.forEach((cat) => {
        const currentTranslation = cat.translations?.find(
          (t: CategoryTranslation) => t.language === lang && t.slug
        );
        if (!currentTranslation?.slug) return;
        if (!isTaxonomyLinkable(cat)) return;

        const url = `${cleanBaseUrl}/${lang}/genre/${currentTranslation.slug}`;

        // 🔴 Альтернативы строятся только из индексируемых языков (LEGACY-057).
        // Раньше сюда шли все переводы подряд: URL фильтровался по линкуемости в
        // языке файла, а список hreflang — нет, и термин, закрытый на `ru`,
        // объявлялся альтернативой открытого `en`.
        const alternates = buildIndexableAlternates(
          toAlternateCandidates(cat, cat.translations ?? []),
          (language, slug) => `${cleanBaseUrl}/${language}/genre/${slug}`
        );

        sitemapItems.push({
          url,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
          ...(alternates ? { alternates: { languages: alternates } } : {}),
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
        const catRes = await getCategories({ type: 'category', limit: 1000, lang });
        categories = catRes?.data || [];
      } catch (error) {
        console.error(`Error fetching categories for sitemap (${lang}):`, error);
      }

      categories.forEach((cat) => {
        const currentTranslation = cat.translations?.find(
          (t: CategoryTranslation) => t.language === lang && t.slug
        );
        if (!currentTranslation?.slug) return;
        if (!isTaxonomyLinkable(cat)) return;

        const url = `${cleanBaseUrl}/${lang}/category/${currentTranslation.slug}`;

        // 🔴 Альтернативы строятся только из индексируемых языков (LEGACY-057).
        // Раньше сюда шли все переводы подряд: URL фильтровался по линкуемости в
        // языке файла, а список hreflang — нет, и термин, закрытый на `ru`,
        // объявлялся альтернативой открытого `en`.
        const alternates = buildIndexableAlternates(
          toAlternateCandidates(cat, cat.translations ?? []),
          (language, slug) => `${cleanBaseUrl}/${language}/category/${slug}`
        );

        sitemapItems.push({
          url,
          ...(alternates ? { alternates: { languages: alternates } } : {}),
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
        const catRes = await getCategories({ type: 'collection', limit: 1000, lang });
        categories = catRes?.data || [];
      } catch (error) {
        console.error(`Error fetching collections for sitemap (${lang}):`, error);
      }

      categories.forEach((cat) => {
        const currentTranslation = cat.translations?.find(
          (t: CategoryTranslation) => t.language === lang && t.slug
        );
        if (!currentTranslation?.slug) return;
        if (!isTaxonomyLinkable(cat)) return;

        const url = `${cleanBaseUrl}/${lang}/collection/${currentTranslation.slug}`;

        // 🔴 Альтернативы строятся только из индексируемых языков (LEGACY-057).
        // Раньше сюда шли все переводы подряд: URL фильтровался по линкуемости в
        // языке файла, а список hreflang — нет, и термин, закрытый на `ru`,
        // объявлялся альтернативой открытого `en`.
        const alternates = buildIndexableAlternates(
          toAlternateCandidates(cat, cat.translations ?? []),
          (language, slug) => `${cleanBaseUrl}/${language}/collection/${slug}`
        );

        sitemapItems.push({
          url,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
          ...(alternates ? { alternates: { languages: alternates } } : {}),
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

      /**
       * 🔴 Для hreflang нужна линкуемость **каждого** языка, а список авторов
       * отдаёт `booksCount` только для запрошенного (LEGACY-057). Поэтому здесь
       * снимается состав остальных языков: автор линкуем в языке ровно тогда,
       * когда попадает в его список — тот уже отфильтрован и по наличию
       * перевода, и по числу книг.
       *
       * ⚠️ Цена: по одному запросу на язык вместо одного на файл. При нынешних
       * десяти авторах это ничто, но при росте каталога ветку придётся переводить
       * на счётчики по языкам в самом ответе — сегодня их в нём нет.
       *
       * Отказ запроса трактуется как «язык неизвестен», а не «закрыт»: молча
       * выкинуть живую альтернативу дороже, чем оставить лишнюю.
       */
      const linkableByLang = new Map<string, Set<string>>();
      await Promise.all(
        SUPPORTED_LANGS.map(async (other) => {
          if (other === lang) return;
          try {
            const res = await getPublicAuthors(other as SupportedLang, { page: 1, limit: 1000 });
            linkableByLang.set(
              other,
              new Set(res.data.filter((a) => isAuthorLinkable(a)).map((a) => a.id))
            );
          } catch (error) {
            console.error(`Error fetching authors for hreflang (${other}):`, error);
          }
        })
      );

      allAuthors.forEach((author) => {
        // The URL must use this language's own slug, not the root one. Listing the
        // root slug put /ru/author/sun-tzu in the Russian sitemap while the page
        // actually lives at /ru/author/sun-czy — and the API answers 404 for the
        // former, so the entry was only "working" thanks to the soft-404 fallback
        // this commit removes. An author without a slug in this language has no
        // address here and is skipped.
        const slugByLang = new Map<string, string>();
        (author.translations ?? []).forEach((t) => {
          if (t.slug && (SUPPORTED_LANGS as readonly string[]).includes(t.language)) {
            slugByLang.set(t.language, t.slug);
          }
        });

        const slug = slugByLang.get(lang);
        if (!slug) return;

        // 🔴 Автор без опубликованных книг в карту сайта не идёт: страница у него
        // тонкая, а `seo-rules.md` требует, чтобы ссылка, sitemap и meta robots
        // решали про один объект одинаково. До 09.08.2026 авторы были вне этого
        // контура целиком — фильтровалось только наличие слага.
        //
        // ⚠️ Опирается на `booksCount`, который до 09.08.2026 был нулём у всех
        // из-за подсчёта по пустому FK. Эта строка **обязана** ехать на прод
        // после бэкенда, иначе она обнулит все файлы `sitemap-authors-*`.
        if (!isAuthorLinkable(author)) return;

        const url = `${cleanBaseUrl}/${lang}/author/${slug}`;
        const alternates = buildIndexableAlternates(
          [...slugByLang.entries()].map(([language, langSlug]) => ({
            language,
            slug: langSlug,
            // Язык файла уже прошёл `isAuthorLinkable` выше. Для остальных —
            // членство в их списке; отсутствие данных (отказ запроса) не
            // считается закрытием.
            linkable:
              language === lang ||
              !linkableByLang.has(language) ||
              (linkableByLang.get(language)?.has(author.id) ?? false),
          })),
          (language, langSlug) => `${cleanBaseUrl}/${language}/author/${langSlug}`
        );

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
        const tagsRes = await getTags({ limit: 1000, lang });
        tags = tagsRes?.data || [];
      } catch (error) {
        console.error(`Error fetching tags for sitemap (${lang}):`, error);
      }

      tags.forEach((tag) => {
        const currentTranslation = tag.translations?.find(
          (t: TagTranslation) => t.language === lang && t.slug
        );
        if (!currentTranslation?.slug) return;
        if (!isTaxonomyLinkable(tag)) return;

        const url = `${cleanBaseUrl}/${lang}/tag/${currentTranslation.slug}`;

        // Альтернативы — только из индексируемых языков (LEGACY-057), тем же
        // правилом, что у категорий, жанров и коллекций.
        const alternates = buildIndexableAlternates(
          toAlternateCandidates(tag, tag.translations ?? []),
          (language, slug) => `${cleanBaseUrl}/${language}/tag/${slug}`
        );

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

  // If no items matched, return 404
  if (sitemapItems.length === 0) {
    return new NextResponse('Sitemap not found', { status: 404 });
  }

  const xml = buildUrlSetXml(sitemapItems);

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
