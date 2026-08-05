import { notFound, permanentRedirect } from 'next/navigation';
import { TaxonomyDetailPage } from '@/components/public/taxonomy/TaxonomyDetailPage/TaxonomyDetailPage';
import { buildLangPath, httpGet } from '@/lib/http';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isSupportedLang, type SupportedLang } from '@/lib/i18n/lang';
import { isUnaddressableInLanguage, resolveTaxonomyDestination } from '@/lib/seo/taxonomy-slug';
import { toPublicAlternates, toPublicJsonLd, toPublicUrl } from '@/lib/seo/urls';
import { handleContentFailure } from '@/lib/utils/content-failure';
import { buildItemListJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { shouldNoindexPaginatedPage, toCountResult } from '@/lib/utils/seo-indexing';
import type {
  Category,
  CategoryBookCardsResponse,
  CategoryType,
  PaginatedResponse,
  SeoResolveResponse,
} from '@/types/api-schema';
import type { Metadata } from 'next';

const TAXONOMY_PAGE_SIZE = 20;

const logError = (message: string, error: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(message, error);
  }
};

type Props = {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const sParams = await searchParams;
  const supportedLang = lang as SupportedLang;

  try {
    const endpoint = buildLangPath(supportedLang, `/seo/resolve`);
    const seoParams = new URLSearchParams({ type: 'collection', id: slug });
    const seo = await httpGet<SeoResolveResponse>(`${endpoint}?${seoParams.toString()}`, {
      language: supportedLang,
      next: { revalidate: 300 },
    });

    const booksEndpoint = buildLangPath(supportedLang, `/categories/${slug}/books/cards`);
    const booksParams = new URLSearchParams({ page: '1', limit: '1' });
    const countRes = await httpGet<CategoryBookCardsResponse>(
      `${booksEndpoint}?${booksParams.toString()}`,
      {
        language: supportedLang,
        next: { revalidate: 300 },
      }
    ).catch((error) => {
      logError('Error counting books for collection metadata:', error);
      return null;
    });
    // Unknown count must not masquerade as zero — see buildRobotsByCount.
    const count = toCountResult(countRes?.pagination?.total ?? null);
    const currentPage = Math.max(1, Number(sParams.page) || 1);
    const outOfRange = count.ok
      ? shouldNoindexPaginatedPage(currentPage, count.total, TAXONOMY_PAGE_SIZE)
      : false;

    const alternatesLanguages = toPublicAlternates(seo.hreflangs || seo.hreflang);

    const publicCanonical = toPublicUrl(seo.meta.canonicalUrl);
    const canonicalUrl = publicCanonical
      ? currentPage > 1
        ? `${publicCanonical}?page=${currentPage}`
        : publicCanonical
      : undefined;

    return {
      title: seo.meta.title,
      description: seo.meta.description || undefined,
      robots: !count.ok
        ? // Count unknown: keep whatever the SEO bundle says, never force noindex.
          seo.meta.robots || undefined
        : count.total > 0 && !outOfRange
          ? seo.meta.robots || undefined
          : { index: false, follow: true },
      alternates: {
        canonical: canonicalUrl,
        languages: alternatesLanguages,
      },
      openGraph: {
        title: seo.openGraph.title,
        description: seo.openGraph.description || undefined,
        type: 'website',
        url: toPublicUrl(seo.openGraph.url),
        images: seo.openGraph.image
          ? [
              {
                url: seo.openGraph.image.url,
                alt: seo.openGraph.image.alt,
              },
            ]
          : undefined,
      },
      twitter: {
        card: (seo.twitter.card as 'summary' | 'summary_large_image') || 'summary',
        site: seo.twitter.site || undefined,
        title: seo.twitter.title || undefined,
        description: seo.twitter.description || undefined,
        images: seo.twitter.image ? [seo.twitter.image] : undefined,
      },
    };
  } catch (error) {
    logError('Error generating metadata for collection:', error);
    return {
      title: getDictionary(supportedLang).taxonomy.collectionMetaFallback,
    };
  }
}

const TAXONOMY_TYPE: CategoryType = 'collection';

const BREADCRUMB_LABEL_KEYS: Record<CategoryType, string> = {
  category: 'breadcrumb.categories',
  genre: 'breadcrumb.genres',
  collection: 'breadcrumb.collections',
};

const BREADCRUMB_PATH_NAMES: Record<CategoryType, string> = {
  category: 'categories',
  genre: 'genres',
  collection: 'collections',
};

const CURRENT_SECTION_KEYS: Record<CategoryType, string> = {
  category: 'taxonomy.currentCategory',
  genre: 'taxonomy.currentGenre',
  collection: 'taxonomy.currentCollection',
};

const ALL_LABEL_KEYS: Record<CategoryType, string> = {
  category: 'taxonomy.allCategories',
  genre: 'taxonomy.allGenres',
  collection: 'taxonomy.allCollections',
};

const LINK_KEYS: Record<CategoryType, string> = {
  category: 'taxonomy.categoriesLink',
  genre: 'taxonomy.genresLink',
  collection: 'taxonomy.collectionsLink',
};

export default async function CollectionDetailPage({ params, searchParams }: Props) {
  const { lang, slug } = await params;
  const { page: pageStr } = await searchParams;
  const supportedLang = lang as SupportedLang;

  if (!isSupportedLang(supportedLang)) {
    notFound();
  }

  const currentPage = Math.max(1, parseInt(pageStr || '1', 10) || 1);
  const cache = { next: { revalidate: 300 } };

  let seoData;
  let data;
  let allCategoriesData;

  try {
    const seoEndpoint = buildLangPath(supportedLang, `/seo/resolve`);
    const seoParams = new URLSearchParams({ type: 'collection', id: slug });

    const booksEndpoint = buildLangPath(supportedLang, `/categories/${slug}/books/cards`);
    const booksParams = new URLSearchParams({ page: String(currentPage), limit: '20' });

    // `lang` matters: without it booksCount comes back summed across all
    // languages, and that is the value isTaxonomyLinkable uses as its floor.
    const sidebarParams = new URLSearchParams({
      type: 'collection',
      limit: '100',
      lang: supportedLang,
    });

    [seoData, data, allCategoriesData] = await Promise.all([
      httpGet<SeoResolveResponse>(`${seoEndpoint}?${seoParams.toString()}`, {
        language: supportedLang,
        ...cache,
      }).catch(() => null),
      httpGet<CategoryBookCardsResponse>(`${booksEndpoint}?${booksParams.toString()}`, {
        language: supportedLang,
        ...cache,
      }),
      httpGet<PaginatedResponse<Category>>(`/categories?${sidebarParams.toString()}`, {
        ...cache,
      }).catch(() => ({
        data: [],
        meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
      })),
    ]);
  } catch (error) {
    // Only the books request can reach here — the other two carry their own
    // fallbacks. Losing it means the page has no content to show, so it must not
    // be served as an empty 200; see handleContentFailure.
    logError('Error loading collection page data:', error);
    handleContentFailure(error, notFound);
  }

  // `category: null` is the API's "no such term" answer. It must be a hard 404,
  // not a 200 with an empty list — a soft 404 keeps a non-existent URL alive in
  // the index. An existing term with zero books stays 200 + noindex.
  if (data && !data.category) {
    notFound();
  }

  // The term exists but has no slug in this language — there is no correct URL
  // to send anyone to, so this is a 404, not a redirect back onto itself.
  if (isUnaddressableInLanguage(data?.category, supportedLang)) {
    notFound();
  }

  // Reached by a foreign-language slug, or under the wrong route segment (every
  // term resolves under every segment). Either way the same page would be live
  // at two addresses; send the visitor and the crawler to the real one.
  const destination = resolveTaxonomyDestination(data?.category, supportedLang, 'collection', slug);
  if (destination) {
    const query = currentPage > 1 ? `?page=${currentPage}` : '';
    permanentRedirect(`/${supportedLang}/${destination.segment}/${destination.slug}${query}`);
  }

  const dict = getDictionary(supportedLang);
  const t = (key: string) => {
    const keys = key.split('.');
    let result: Record<string, unknown> = dict;
    for (const k of keys) {
      result = result[k] as Record<string, unknown>;
    }
    return typeof result === 'string' ? result : key;
  };

  const path = BREADCRUMB_PATH_NAMES[TAXONOMY_TYPE];

  const translations = {
    breadcrumbHome: t('breadcrumb.home'),
    breadcrumbLabel: t(BREADCRUMB_LABEL_KEYS[TAXONOMY_TYPE]),
    currentSection: t(CURRENT_SECTION_KEYS[TAXONOMY_TYPE]),
    allLabel: t(ALL_LABEL_KEYS[TAXONOMY_TYPE]),
    allBooksLabel: t('taxonomy.allBooks'),
    browseLabel: t('taxonomy.browse'),
    exploreMoreLabel: t('taxonomy.exploreMore'),
    allBooksLink: t('taxonomy.allBooksLink'),
    tagsLink: t('taxonomy.tagsLink'),
    linkLabel: t(LINK_KEYS[TAXONOMY_TYPE]),
    booksCount: t('taxonomy.booksCount'),
    relatedGenres: t('taxonomy.relatedGenres'),
    relatedCategories: t('taxonomy.relatedCategories'),
    relatedCollections: t('taxonomy.relatedCollections'),
    relatedTags: t('taxonomy.relatedTags'),
    aboutSection: t('taxonomy.about'),
    faqTitle: t('tag.faq'),
    showMore: t('book.showMore'),
    showLess: t('book.showLess'),
    noBooks: t('taxonomy.noBooks'),
    paginationLabel: t('a11y.pagination'),
  };

  const totalPages = data?.pagination?.totalPages ?? 1;
  const total = data?.pagination?.total ?? 0;

  const siteUrl = getSiteUrl();
  const itemListJsonLd = buildItemListJsonLd(
    (data?.items ?? [])
      .filter((book) => book.slug && book.title)
      .map((book) => ({
        name: book.title,
        url: `${siteUrl}/${supportedLang}/book/${book.slug}`,
      })),
    `${siteUrl}/${supportedLang}/collection/${slug}`
  );

  return (
    <>
      {seoData?.schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(toPublicJsonLd(seoData.schema)) }}
        />
      )}
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <TaxonomyDetailPage
        lang={supportedLang}
        slug={slug}
        taxonomyType={TAXONOMY_TYPE}
        data={data}
        allCategories={allCategoriesData.data}
        translations={translations}
        path={path}
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
      />
    </>
  );
}
