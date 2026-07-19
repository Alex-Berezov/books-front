import { TaxonomyOverviewClient } from '@/components/public/taxonomy-overview/TaxonomyOverviewClient';
import { fetchPageBySlug } from '@/lib/utils/fetch-page';
import { buildBreadcrumbJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

const FALLBACK_TITLE = 'Book Categories | Bibliaris';
const FALLBACK_DESCRIPTION =
  'Browse book categories on Bibliaris. Discover classic literature, fiction, history, science, education, and more.';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  const page = await fetchPageBySlug(lang, 'taxonomy-categories-index');

  const title = page?.seo?.metaTitle || page?.h1 || page?.title || FALLBACK_TITLE;
  const description = page?.seo?.metaDescription || page?.shortDescription || FALLBACK_DESCRIPTION;

  return getPageMetadata(lang, '/categories', title, description);
}

export default async function CategoriesIndexPage({ params }: Props) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  const page = await fetchPageBySlug(lang, 'taxonomy-categories-index');

  const siteUrl = getSiteUrl();
  const title = page?.h1 || page?.title || 'Categories';
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: 'Home', url: `${siteUrl}/${lang}` },
      { name: title, url: `${siteUrl}/${lang}/categories` },
    ],
    `${siteUrl}/${lang}/categories`
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <TaxonomyOverviewClient lang={lang} configKey="category" initialPage={page ?? undefined} />
    </>
  );
}
