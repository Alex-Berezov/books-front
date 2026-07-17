import { notFound } from 'next/navigation';
import { getCategories } from '@/api/endpoints/admin/categories';
import { getCategoryBookCards, resolveSeo } from '@/api/endpoints/public';
import { TaxonomyDetailPage } from '@/components/public/taxonomy/TaxonomyDetailPage/TaxonomyDetailPage';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isSupportedLang, type SupportedLang } from '@/lib/i18n/lang';
import type { CategoryType } from '@/types/api-schema';
import type { Metadata } from 'next';

const logError = (message: string, error: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(message, error);
  }
};

type Props = {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateStaticParams() {
  return [];
}

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const supportedLang = lang as SupportedLang;

  try {
    const seo = await resolveSeo(supportedLang, 'genre', slug);

    const alternatesLanguages: Record<string, string> = {};
    (seo.hreflangs || seo.hreflang)?.forEach((item) => {
      if (item.hreflang) {
        alternatesLanguages[item.hreflang] = item.href;
      }
    });

    return {
      title: seo.meta.title,
      description: seo.meta.description || undefined,
      robots: seo.meta.robots || undefined,
      alternates: {
        canonical: seo.meta.canonicalUrl || undefined,
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
    logError('Error generating metadata for genre:', error);
    return {
      title: 'Genre - Bibliaris',
    };
  }
}

const TAXONOMY_TYPE: CategoryType = 'genre';

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

export default async function GenreDetailPage({ params, searchParams }: Props) {
  const { lang, slug } = await params;
  const { page: pageStr } = await searchParams;
  const supportedLang = lang as SupportedLang;

  if (!isSupportedLang(supportedLang)) {
    notFound();
  }

  const currentPage = Math.max(1, parseInt(pageStr || '1', 10) || 1);

  let seoData;
  let data;
  let allCategoriesData;

  try {
    [seoData, data, allCategoriesData] = await Promise.all([
      resolveSeo(supportedLang, 'genre', slug).catch(() => null),
      getCategoryBookCards(supportedLang, slug, currentPage, 20),
      getCategories({ type: 'genre', limit: 100 }).catch(() => ({
        data: [],
        meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
      })),
    ]);
  } catch (error) {
    logError('Error loading genre page data:', error);
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

  return (
    <>
      {seoData?.schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seoData.schema) }}
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
