import { TaxonomyOverviewClient } from '@/components/public/taxonomy-overview/TaxonomyOverviewClient';
import { fetchPageBySlug } from '@/lib/utils/fetch-page';
import { buildBreadcrumbJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

const FALLBACK_TITLE = 'Book Genres | Bibliaris';
const FALLBACK_DESCRIPTION =
  'Browse literary genres on Bibliaris. Discover drama, gothic fiction, mystery, romance, adventure, satire, fantasy, horror, and more.';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  const page = await fetchPageBySlug(lang, 'taxonomy-genres-index');

  const title = page?.seo?.metaTitle || page?.h1 || page?.title || FALLBACK_TITLE;
  const description = page?.seo?.metaDescription || page?.shortDescription || FALLBACK_DESCRIPTION;

  return getPageMetadata(lang, '/genres', title, description);
}

export default async function GenresPage({ params }: Props) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  const page = await fetchPageBySlug(lang, 'taxonomy-genres-index');

  const siteUrl = getSiteUrl();
  const title = page?.h1 || page?.title || 'Genres';
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: 'Home', url: `${siteUrl}/${lang}` },
      { name: title, url: `${siteUrl}/${lang}/genres` },
    ],
    `${siteUrl}/${lang}/genres`
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <TaxonomyOverviewClient lang={lang} configKey="genre" initialPage={page ?? undefined} />
    </>
  );
}
