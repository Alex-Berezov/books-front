import { getPublicTags } from '@/api/endpoints/public';
import { TaxonomyOverview } from '@/components/public/taxonomy-overview/TaxonomyOverview';
import { TAXONOMY_OVERVIEW_CONFIGS } from '@/components/public/taxonomy-overview/TaxonomyOverviewConfig';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { fetchPageBySystemKey } from '@/lib/utils/fetch-page';
import { buildBreadcrumbJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

export const revalidate = 300;

/** Same ceiling the client-side version used. */
const TAGS_LIMIT = 200;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  const page = await fetchPageBySystemKey(lang, TAXONOMY_OVERVIEW_CONFIGS.tag.pageKey);
  const dict = getDictionary(lang);

  const title = page?.seo?.metaTitle || page?.h1 || page?.title || dict.tags.metaTitle;
  const description =
    page?.seo?.metaDescription || page?.shortDescription || dict.tags.metaDescription;

  const meta = getPageMetadata(lang, '/tags', title, description);

  // The editorial `robots` field was fetched on every render and thrown away:
  // an editor who set `noindex, follow` on this CMS page got no effect at all,
  // and the hub stayed in the sitemap besides. This is a success-path defect —
  // no failure needed. Applied only when the field is present, so a missing or
  // unreadable bundle changes nothing here.
  return page?.seo?.robots ? { ...meta, robots: page.seo.robots } : meta;
}

export default async function TagsPage({ params }: Props) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  // Deliberately not caught: the terms *are* this page. A failed request must
  // surface as 5xx, not as a 200 that says the site has no tags.
  const [page, tags] = await Promise.all([
    fetchPageBySystemKey(lang, TAXONOMY_OVERVIEW_CONFIGS.tag.pageKey),
    getPublicTags(lang, { limit: TAGS_LIMIT }),
  ]);
  const dict = getDictionary(lang);

  const siteUrl = getSiteUrl();
  const title = page?.h1 || page?.title || dict.tags.title;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: dict.breadcrumb.home, url: `${siteUrl}/${lang}` },
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
      <TaxonomyOverview configKey="tag" items={tags.data} lang={lang} page={page} />
    </>
  );
}
