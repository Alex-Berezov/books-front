import { getBookCards, getPublicCategories } from '@/api/endpoints/public';
import { CatalogContent } from '@/components/public/catalog/CatalogContent/CatalogContent';
import { isTaxonomyLinkable } from '@/lib/seo/taxonomy-linkable';
import { buildItemListJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { logError } from '@/lib/utils/log-error';
import { getPageMetadata } from '@/lib/utils/seo';
import { shouldNoindexPaginatedPage, toCountResult } from '@/lib/utils/seo-indexing';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { catalogTitles, catalogDescriptions } from './catalog-landing-config';

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string; sort?: string; type?: string; q?: string }>;
};

const PAGE_SIZE = 24;

function getTitleKey(sort?: string, type?: string, q?: string): string {
  if (q) return 'default';
  if (type === 'audio') return 'audio';
  if (sort === 'popular') return 'popular';
  if (sort === 'new') return 'new';
  return 'default';
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  const sParams = await searchParams;
  const supportedLang = lang as SupportedLang;
  const titleKey = getTitleKey(sParams.sort, sParams.type, sParams.q);

  const title = catalogTitles[supportedLang]?.[titleKey] || catalogTitles.en[titleKey];
  const description =
    catalogDescriptions[supportedLang]?.[titleKey] || catalogDescriptions.en[titleKey];

  const hasFilters = !!(sParams.q || sParams.type || sParams.sort);
  const currentPage = Math.max(1, Number(sParams.page) || 1);

  // A filtered catalog is deliberately noindex — facet combinations are duplicates
  // of the clean listing. It must not also claim that listing's canonical and
  // hreflang: the page would simultaneously say "do not index me" and "the
  // canonical version of me is this other, indexable URL". Built by hand rather
  // than through getPageMetadata, which always attaches alternates.
  if (hasFilters) {
    return {
      title,
      description,
      robots: { index: false, follow: true },
      openGraph: {
        title,
        description,
        type: 'website',
      },
    };
  }

  const countRes = await getBookCards(supportedLang, 1, 1).catch((error) => {
    logError('Error counting books for catalog metadata:', error);
    return null;
  });
  // With an unknown total, shouldNoindexPaginatedPage would read zero and call
  // every page past the first out of range — a failed request would noindex the
  // paginated catalog. Unknown means "decide nothing".
  const count = toCountResult(countRes?.pagination?.total ?? null);
  const outOfRange = count.ok
    ? shouldNoindexPaginatedPage(currentPage, count.total, PAGE_SIZE)
    : false;

  const baseMetadata = getPageMetadata(supportedLang, '/catalog', title, description, currentPage);
  if (outOfRange) {
    baseMetadata.robots = { index: false, follow: true };
  }

  return baseMetadata;
}

export const dynamic = 'force-dynamic';

export default async function CatalogPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const sParams = await searchParams;
  const supportedLang = lang as SupportedLang;

  const currentPage = Math.max(1, Number(sParams.page) || 1);
  const sort = (sParams.sort as 'popular' | 'new') || undefined;
  const type = (sParams.type as 'audio' | 'text') || undefined;
  const q = sParams.q || undefined;

  const [booksRes, categoriesRes, genresRes] = await Promise.all([
    // Deliberately uncaught, same rule as the landings: a catalog that failed to
    // load must not be served as a catalog with nothing in it.
    getBookCards(supportedLang, currentPage, PAGE_SIZE, { sort, type, q }),
    getPublicCategories(supportedLang, 'category').catch(() => null),
    getPublicCategories(supportedLang, 'genre').catch(() => null),
  ]);

  const books = booksRes?.items ?? [];
  const pagination = booksRes?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 };
  const categories = (categoriesRes?.data ?? []).filter(isTaxonomyLinkable);
  const genres = (genresRes?.data ?? []).filter(isTaxonomyLinkable);

  const hasFilters = !!(q || type || sort);
  const siteUrl = getSiteUrl();
  const itemListJsonLd = !hasFilters
    ? buildItemListJsonLd(
        books
          .filter((book) => book.slug && book.title)
          .map((book) => ({
            name: book.title,
            url: `${siteUrl}/${supportedLang}/book/${book.slug}`,
          })),
        `${siteUrl}/${supportedLang}/catalog`
      )
    : null;

  return (
    <>
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <CatalogContent
        lang={supportedLang}
        books={books}
        pagination={pagination}
        categories={categories}
        genres={genres}
        currentSort={sort}
        currentType={type}
        currentQ={q}
        currentPage={currentPage}
      />
    </>
  );
}
