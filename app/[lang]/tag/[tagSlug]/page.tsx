import { notFound } from 'next/navigation';
import { TagDetailPage } from '@/components/public/taxonomy/TagDetailPage/TagDetailPage';
import { buildLangPath, httpGet } from '@/lib/http';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isSupportedLang, type SupportedLang } from '@/lib/i18n/lang';
import type { SeoResolveResponse, TagBookCardsResponse } from '@/types/api-schema';
import type { Metadata } from 'next';

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, tagSlug } = await params;
  const supportedLang = lang as SupportedLang;

  try {
    const endpoint = buildLangPath(supportedLang, `/seo/resolve`);
    const seoParams = new URLSearchParams({ type: 'tag', id: tagSlug });
    const seo = await httpGet<SeoResolveResponse>(`${endpoint}?${seoParams.toString()}`, {
      language: supportedLang,
      next: { revalidate: 300 },
    });

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

  if (!data) {
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
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: translations.breadcrumbHome,
            item: `https://bibliaris.com/${supportedLang}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: translations.allTags,
            item: `https://bibliaris.com/${supportedLang}/tags`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: tagSlug,
            item: `https://bibliaris.com/${supportedLang}/tag/${tagSlug}`,
          },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: tagSlug,
        url: `https://bibliaris.com/${supportedLang}/tag/${tagSlug}`,
        numberOfItems: total,
      },
    ],
  };

  return (
    <>
      {seoData?.schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seoData.schema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
