import { getBookCards, getPublicCategories } from '@/api/endpoints/public';
import { CatalogContent } from '@/components/public/catalog/CatalogContent/CatalogContent';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildBreadcrumbJsonLd, buildItemListJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { catalogDescriptions, catalogTitles } from '../catalog/catalog-landing-config';

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string }>;
};

const PAGE_SIZE = 24;
const LANDING_TYPE = 'audio';
const TITLE_KEY = 'audio';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const supportedLang = lang as SupportedLang;
  const title = catalogTitles[supportedLang]?.[TITLE_KEY] || catalogTitles.en[TITLE_KEY];
  const description =
    catalogDescriptions[supportedLang]?.[TITLE_KEY] || catalogDescriptions.en[TITLE_KEY];
  return getPageMetadata(supportedLang, '/audiobooks', title, description);
}

export const dynamic = 'force-dynamic';

export default async function AudiobooksPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const sParams = await searchParams;
  const supportedLang = lang as SupportedLang;

  const dict = getDictionary(supportedLang);
  const currentPage = Math.max(1, Number(sParams.page) || 1);

  const [booksRes, categoriesRes, genresRes] = await Promise.all([
    getBookCards(supportedLang, currentPage, PAGE_SIZE, { type: LANDING_TYPE }).catch(() => null),
    getPublicCategories(supportedLang, 'category').catch(() => null),
    getPublicCategories(supportedLang, 'genre').catch(() => null),
  ]);

  const books = booksRes?.items ?? [];
  const pagination = booksRes?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 };
  const categories = (categoriesRes?.data ?? []).filter((cat) => cat.booksCount > 0);
  const genres = (genresRes?.data ?? []).filter((gen) => gen.booksCount > 0);

  const siteUrl = getSiteUrl();
  const routeUrl = `${siteUrl}/${supportedLang}/audiobooks`;

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: dict.breadcrumb.home, url: `${siteUrl}/${supportedLang}` },
      { name: dict.header.audiobooks, url: routeUrl },
    ],
    routeUrl
  );

  const itemListJsonLd = buildItemListJsonLd(
    books
      .filter((book) => book.slug && book.title)
      .map((book) => ({
        name: book.title,
        url: `${siteUrl}/${supportedLang}/book/${book.slug}`,
      })),
    routeUrl
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
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
        currentType={LANDING_TYPE}
        currentPage={currentPage}
      />
    </>
  );
}
