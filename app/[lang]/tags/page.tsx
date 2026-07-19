import { TaxonomyOverviewClient } from '@/components/public/taxonomy-overview/TaxonomyOverviewClient';
import { fetchPageBySlug } from '@/lib/utils/fetch-page';
import { buildBreadcrumbJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

const FALLBACK_TITLE = 'Literary Tags & Book Themes | Bibliaris';
const FALLBACK_DESCRIPTION =
  'Browse literary tags and book themes on Bibliaris. Discover books by ideas, characters, settings, moods, genres, periods, and reading interests.';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  const page = await fetchPageBySlug(lang, 'taxonomy-tags-index');

  const title = page?.seo?.metaTitle || page?.h1 || page?.title || FALLBACK_TITLE;
  const description = page?.seo?.metaDescription || page?.shortDescription || FALLBACK_DESCRIPTION;

  return getPageMetadata(lang, '/tags', title, description);
}

export default async function TagsPage({ params }: Props) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  const page = await fetchPageBySlug(lang, 'taxonomy-tags-index');

  const siteUrl = getSiteUrl();
  const title = page?.h1 || page?.title || 'Tags';
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: 'Home', url: `${siteUrl}/${lang}` },
      { name: title, url: `${siteUrl}/${lang}/tags` },
    ],
    `${siteUrl}/${lang}/tags`
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <TaxonomyOverviewClient lang={lang} configKey="tag" initialPage={page ?? undefined} />
    </>
  );
}
