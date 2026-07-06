import { TaxonomyOverviewClient } from '@/components/public/taxonomy-overview/TaxonomyOverviewClient';
import { fetchPageBySlug } from '@/lib/utils/fetch-page';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

const FALLBACK_TITLE = 'Book Collections | Bibliaris';
const FALLBACK_DESCRIPTION =
  'Explore curated book collections on Bibliaris, including short reads, free books, school reading, audiobooks, summaries, and themed selections.';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  const page = await fetchPageBySlug(lang, 'taxonomy-collections-index');

  const title = page?.seo?.metaTitle || page?.h1 || page?.title || FALLBACK_TITLE;
  const description = page?.seo?.metaDescription || page?.shortDescription || FALLBACK_DESCRIPTION;

  return getPageMetadata(lang, '/collections', title, description);
}

export default async function CollectionsPage({ params }: Props) {
  const resolvedParams = await params;
  const { lang } = resolvedParams;

  return <TaxonomyOverviewClient lang={lang as SupportedLang} configKey="collection" />;
}
