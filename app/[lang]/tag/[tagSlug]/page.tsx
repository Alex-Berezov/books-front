import { notFound } from 'next/navigation';
import { TagDetailPage } from '@/components/public/taxonomy/TagDetailPage/TagDetailPage';
import { buildLangPath, httpGet } from '@/lib/http';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isSupportedLang, type SupportedLang } from '@/lib/i18n/lang';
import { buildLangUrl, toPublicAlternates, toPublicJsonLd, toPublicUrl } from '@/lib/seo/urls';
import { buildItemListJsonLd, getSiteUrl, schemaContainsType } from '@/lib/utils/json-ld';
import { shouldNoindexPaginatedPage, toCountResult } from '@/lib/utils/seo-indexing';
import type { SeoResolveResponse, TagBookCardsResponse } from '@/types/api-schema';
import type { Metadata } from 'next';

const TAXONOMY_PAGE_SIZE = 20;

const logError = (message: string, error: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(message, error);
  }
};

type Props = {
  params: Promise<{ lang: string; tagSlug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang, tagSlug } = await params;
  const sParams = await searchParams;
  const supportedLang = lang as SupportedLang;

  try {
    const endpoint = buildLangPath(supportedLang, `/seo/resolve`);
    const seoParams = new URLSearchParams({ type: 'tag', id: tagSlug });
    const seo = await httpGet<SeoResolveResponse>(`${endpoint}?${seoParams.toString()}`, {
      language: supportedLang,
      next: { revalidate: 300 },
    });

    const booksEndpoint = buildLangPath(supportedLang, `/tags/${tagSlug}/books/cards`);
    const booksParams = new URLSearchParams({ page: '1', limit: '1' });
    const countRes = await httpGet<TagBookCardsResponse>(
      `${booksEndpoint}?${booksParams.toString()}`,
      {
        language: supportedLang,
        next: { revalidate: 300 },
      }
    ).catch((error) => {
      logError('Error counting books for tag metadata:', error);
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
    logError('Error generating metadata for tag:', error);
    return {
      title: `${tagSlug} - Bibliaris`,
    };
  }
}

export default async function TagDetailPageRoute({ params, searchParams }: Props) {
  const { lang, tagSlug } = await params;
  const { page: pageStr } = await searchParams;
  const supportedLang = lang as SupportedLang;

  if (!isSupportedLang(supportedLang)) {
    notFound();
  }

  const currentPage = Math.max(1, parseInt(pageStr || '1', 10) || 1);
  const cache = { next: { revalidate: 300 } };

  let seoData;
  let data: TagBookCardsResponse | null = null;

  try {
    const seoEndpoint = buildLangPath(supportedLang, `/seo/resolve`);
    const seoParams = new URLSearchParams({ type: 'tag', id: tagSlug });

    const booksEndpoint = buildLangPath(supportedLang, `/tags/${tagSlug}/books/cards`);
    const booksParams = new URLSearchParams({
      page: String(currentPage),
      limit: '20',
      includeTag: 'true',
    });

    [seoData, data] = await Promise.all([
      httpGet<SeoResolveResponse>(`${seoEndpoint}?${seoParams.toString()}`, {
        language: supportedLang,
        ...cache,
      }).catch(() => null),
      httpGet<TagBookCardsResponse>(`${booksEndpoint}?${booksParams.toString()}`, {
        language: supportedLang,
        ...cache,
      }).catch(() => null),
    ]);
  } catch (error) {
    logError('Error loading tag page data:', error);
    data = null;
  }

  // `tag: null` is the API's "no such term" answer. It must be a hard 404, not a
  // 200 with an empty list — a soft 404 keeps a non-existent URL alive in the
  // index. An existing term with zero books stays 200 + noindex.
  if (!data || !data.tag) {
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

  const totalPages = data?.pagination?.totalPages ?? 1;
  const total = data?.pagination?.total ?? 0;

  const translations = {
    breadcrumbHome: t('breadcrumb.home'),
    allTags: t('tags.allTags'),
    browse: t('taxonomy.browse'),
    allBooks: t('taxonomy.allBooks'),
    allBooksLink: t('taxonomy.allBooksLink'),
    tagsLink: t('taxonomy.tagsLink'),
    exploreMore: t('taxonomy.exploreMore'),
    books: t('tag.books'),
    noBooks: t('tag.noBooks'),
    showMore: t('book.showMore'),
    showLess: t('book.showLess'),
    about: t('taxonomy.about'),
    faqTitle: t('tag.faq'),
    relatedTags: t('tag.relatedTags'),
    relatedGenres: t('tag.relatedGenres'),
    relatedCategories: t('tag.relatedCategories'),
    relatedCollections: t('tag.relatedCollections'),
    paginationLabel: t('a11y.pagination'),
  };

  const siteUrl = getSiteUrl();
  const itemListJsonLd = buildItemListJsonLd(
    (data?.items ?? [])
      .filter((book) => book.slug && book.title)
      .map((book) => ({
        name: book.title,
        url: `${siteUrl}/${supportedLang}/book/${book.slug}`,
      })),
    `${siteUrl}/${supportedLang}/tag/${tagSlug}`
  );

  const backendSchemaPresent = !!seoData?.schema;
  const backendHasCollection = schemaContainsType(seoData?.schema, 'CollectionPage');

  const breadcrumbSchema = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: translations.breadcrumbHome,
        item: buildLangUrl(supportedLang),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: translations.allTags,
        item: buildLangUrl(supportedLang, '/tags'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: tagSlug,
        item: buildLangUrl(supportedLang, `/tag/${tagSlug}`),
      },
    ],
  };

  const collectionPageSchema = {
    '@type': 'CollectionPage',
    name: tagSlug,
    url: buildLangUrl(supportedLang, `/tag/${tagSlug}`),
    numberOfItems: total,
  };

  const backendGraph = toPublicJsonLd(seoData?.schema) as Record<string, unknown> | undefined;
  const backendGraphItems =
    backendGraph && Array.isArray(backendGraph['@graph'])
      ? (backendGraph['@graph'] as Record<string, unknown>[])
      : [];

  const combinedItems: Record<string, unknown>[] = [...backendGraphItems];

  if (!backendSchemaPresent) {
    combinedItems.push(breadcrumbSchema);
  }

  if (!backendHasCollection) {
    combinedItems.push(collectionPageSchema);
  }

  if (itemListJsonLd) {
    combinedItems.push(itemListJsonLd as Record<string, unknown>);
  }

  return (
    <>
      {combinedItems.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': combinedItems,
            }),
          }}
        />
      )}
      <TagDetailPage
        lang={supportedLang}
        tagSlug={tagSlug}
        data={data}
        translations={translations}
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
      />
    </>
  );
}
