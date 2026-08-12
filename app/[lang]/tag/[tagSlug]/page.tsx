import { notFound, permanentRedirect } from 'next/navigation';
import { TagDetailPage } from '@/components/public/taxonomy/TagDetailPage/TagDetailPage';
import { buildLangPath, httpGet } from '@/lib/http';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isSupportedLang, type SupportedLang } from '@/lib/i18n/lang';
import { noteDegraded } from '@/lib/seo/degraded';
import { resolveRetiredSlug } from '@/lib/seo/retired-slug';
import { isTaxonomyLinkable } from '@/lib/seo/taxonomy-linkable';
import { buildLangUrl, toPublicAlternates, toPublicJsonLd, toPublicUrl } from '@/lib/seo/urls';
import { handleContentFailure, isNotFoundError } from '@/lib/utils/content-failure';
import { buildItemListJsonLd, getSiteUrl, schemaContainsType } from '@/lib/utils/json-ld';
import {
  applyEditorialVisibility,
  robotsForUnreadableBundle,
  shouldNoindexPaginatedPage,
  toCountResult,
} from '@/lib/utils/seo-indexing';
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

  // Hoisted: the catch below needs it. The bundle and the count are separate
  // requests and can fail independently, so "did the count arrive" is exactly
  // what decides whether anything is known at all.
  let countRes: TagBookCardsResponse | null = null;

  try {
    // The computable half is fetched FIRST, on purpose. It is what decides the
    // branch when the bundle turns out to be unreadable, and awaiting the bundle
    // first would mean this request never runs in exactly that case — leaving
    // nothing to narrow with and turning every bundle failure into a 5xx.
    const booksEndpoint = buildLangPath(supportedLang, `/tags/${tagSlug}/books/cards`);
    // `includeTag` is what puts the tag object — and with it `isVisible` — into
    // the response; without it the field never arrives and the visibility veto
    // silently does nothing. The categories endpoint returns its term
    // unconditionally, tags do not. Existing query param, no backend change.
    const booksParams = new URLSearchParams({ page: '1', limit: '1', includeTag: 'true' });
    countRes = await httpGet<TagBookCardsResponse>(`${booksEndpoint}?${booksParams.toString()}`, {
      language: supportedLang,
      next: { revalidate: 300 },
    }).catch((error) => {
      logError('Error counting books for tag metadata:', error);
      return null;
    });

    const endpoint = buildLangPath(supportedLang, `/seo/resolve`);
    const seoParams = new URLSearchParams({ type: 'tag', id: tagSlug });
    const seo = await httpGet<SeoResolveResponse>(`${endpoint}?${seoParams.toString()}`, {
      language: supportedLang,
      next: { revalidate: 300 },
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
      // Editorial visibility is applied last and only narrows: see
      // applyEditorialVisibility. Everything inside it is the previous chain,
      // untouched.
      robots: applyEditorialVisibility(
        !count.ok
          ? // Count unknown: keep whatever the SEO bundle says, never force noindex.
            seo.meta.robots || undefined
          : count.total > 0 && !outOfRange
            ? seo.meta.robots || undefined
            : { index: false, follow: true },
        countRes?.tag?.isVisible
      ),
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
    noteDegraded({
      surface: 'tag-detail',
      reason: countRes ? 'bundle-unreadable' : 'nothing-known',
      lang: supportedLang,
      slug: tagSlug,
      outcome: 'noindex',
    });
    return {
      title: `${tagSlug} - Bibliaris`,
      // `robots` is never guessed here. The bundle is unreadable, so the only
      // thing that may narrow the verdict is the independently computable half —
      // isVisible and the live count, which arrive on /books/cards, not on the
      // bundle. Not linkable by that half -> noindex, a conclusion from data.
      // Linkable, or that half unknown too -> nothing is known -> throw -> 5xx.
      robots: robotsForUnreadableBundle(
        'tag-detail',
        countRes
          ? isTaxonomyLinkable({
              isVisible: countRes?.tag?.isVisible,
              indexable: countRes?.tag?.indexable,
              booksCount: countRes.pagination?.total,
            })
          : undefined,
        tagSlug,
        error
      ),
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
      // Deliberately NOT caught, unlike the SEO bundle beside it. This is the
      // page's content: swallowing its failure into `null` walked straight into
      // the `!data.tag -> notFound()` below, so a 403 from the rate limiter came
      // out as a hard 404 and got cached — the LEGACY-063 defect, still present
      // here after the book and taxonomy pages were fixed. handleContentFailure
      // now turns only a real 404 into notFound() and lets everything else 5xx.
      httpGet<TagBookCardsResponse>(`${booksEndpoint}?${booksParams.toString()}`, {
        language: supportedLang,
        ...cache,
      }),
    ]);
  } catch (error) {
    // Content missing, not "content is empty" — see handleContentFailure.
    logError('Error loading tag page data:', error);
    // Тот же отказ, что и ниже, но пришедший другим путём: API ответил 404, и до
    // проверки `data.tag` дело не дошло. Оба пути обязаны заглянуть в историю
    // слагов (LEGACY-062) — закрытие одного дало бы редирект «через раз», в
    // зависимости от того, каким способом API сообщил об отсутствии.
    if (isNotFoundError(error)) {
      const retired = await resolveRetiredSlug('tag', supportedLang, tagSlug);
      if (retired && retired !== tagSlug) {
        const query = currentPage > 1 ? `?page=${currentPage}` : '';
        permanentRedirect(`/${supportedLang}/tag/${retired}${query}`);
      }
    }
    handleContentFailure(error, notFound);
  }

  // `tag: null` is the API's "no such term" answer. It must be a hard 404, not a
  // 200 with an empty list — a soft 404 keeps a non-existent URL alive in the
  // index. An existing term with zero books stays 200 + noindex.
  if (!data || !data.tag) {
    // Прежде чем отдать 404 — спросить историю слагов. Порядок обязателен: сначала
    // попытка отдать живую сущность, и лишь затем история, иначе слаг, освобождённый
    // и занятый заново другим тегом, увёл бы посетителя со страницы, которая есть.
    const retired = await resolveRetiredSlug('tag', supportedLang, tagSlug);
    if (retired && retired !== tagSlug) {
      const query = currentPage > 1 ? `?page=${currentPage}` : '';
      permanentRedirect(`/${supportedLang}/tag/${retired}${query}`);
    }
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
