import { getBookCards, getPublicCategories } from '@/api/endpoints/public';
import { CatalogContent } from '@/components/public/catalog/CatalogContent/CatalogContent';
import { buildItemListJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { getPageMetadata } from '@/lib/utils/seo';
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
  const page = hasFilters ? undefined : Math.max(1, Number(sParams.page) || 1);

  const baseMetadata = getPageMetadata(supportedLang, '/catalog', title, description, page);

  if (hasFilters) {
    baseMetadata.robots = 'noindex, follow';
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
    getBookCards(supportedLang, currentPage, PAGE_SIZE, { sort, type, q }).catch(() => null),
    getPublicCategories(supportedLang, 'category').catch(() => null),
    getPublicCategories(supportedLang, 'genre').catch(() => null),
  ]);

  const books = booksRes?.items ?? [];
  const pagination = booksRes?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 };
  const categories = (categoriesRes?.data ?? []).filter((cat) => cat.booksCount > 0);
  const genres = (genresRes?.data ?? []).filter((gen) => gen.booksCount > 0);

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
