import { notFound } from 'next/navigation';
import { TaxonomyDetailPage } from '@/components/public/taxonomy/TaxonomyDetailPage/TaxonomyDetailPage';
import { buildLangPath, httpGet } from '@/lib/http';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isSupportedLang, type SupportedLang } from '@/lib/i18n/lang';
import { buildItemListJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { shouldNoindexPaginatedPage } from '@/lib/utils/seo-indexing';
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
    const seoParams = new URLSearchParams({ type: 'category', id: slug });
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
    ).catch(() => null);
    const totalItems = countRes?.pagination?.total ?? 0;
    const hasBooks = totalItems > 0;
    const currentPage = Math.max(1, Number(sParams.page) || 1);
    const outOfRange = shouldNoindexPaginatedPage(currentPage, totalItems, TAXONOMY_PAGE_SIZE);

    const alternatesLanguages: Record<string, string> = {};
    (seo.hreflangs || seo.hreflang)?.forEach((item) => {
      if (item.hreflang) {
        alternatesLanguages[item.hreflang] = item.href;
      }
    });

    const canonicalUrl = seo.meta.canonicalUrl
      ? currentPage > 1
        ? `${seo.meta.canonicalUrl}?page=${currentPage}`
        : seo.meta.canonicalUrl
      : undefined;

    return {
      title: seo.meta.title,
      description: seo.meta.description || undefined,
      robots:
        hasBooks && !outOfRange ? seo.meta.robots || undefined : { index: false, follow: true },
      alternates: {
        canonical: canonicalUrl,
        languages: alternatesLanguages,
      },
      openGraph: {
        title: seo.openGraph.title,
        description: seo.openGraph.description || undefined,
        type: 'website',
        url: seo.openGraph.url,
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
    logError('Error generating metadata for category:', error);
    return {
      title: 'Category - Bibliaris',
    };
  }
}

const TAXONOMY_TYPE: CategoryType = 'category';

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

export default async function CategoryDetailPage({ params, searchParams }: Props) {
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
    const seoParams = new URLSearchParams({ type: 'category', id: slug });

    const booksEndpoint = buildLangPath(supportedLang, `/categories/${slug}/books/cards`);
    const booksParams = new URLSearchParams({ page: String(currentPage), limit: '20' });

    const sidebarParams = new URLSearchParams({ type: 'category', limit: '100' });

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
    logError('Error loading category page data:', error);
    data = null;
    allCategoriesData = { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } };
  }

  if (!data && !seoData) {
    notFound();
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
    `${siteUrl}/${supportedLang}/category/${slug}`
  );

  return (
    <>
      {seoData?.schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seoData.schema) }}
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
