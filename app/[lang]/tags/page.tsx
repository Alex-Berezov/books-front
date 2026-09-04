import { getPublicTags, type TagListItem } from '@/api/endpoints/public';
import { TaxonomyOverview } from '@/components/public/taxonomy-overview/TaxonomyOverview';
import { TAXONOMY_OVERVIEW_CONFIGS } from '@/components/public/taxonomy-overview/TaxonomyOverviewConfig';
import { API_MAX_PAGE_SIZE } from '@/lib/http.constants';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { fetchAllPages } from '@/lib/sitemap/utils';
import { fetchPageBySystemKey } from '@/lib/utils/fetch-page';
import { buildBreadcrumbJsonLd, getSiteUrl } from '@/lib/utils/json-ld';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

export const revalidate = 300;

/**
 * Потолок обхода, страницами по сто - та же арифметика и та же причина,
 * что у `TAGS_TRAVERSAL_MAX_PAGES` в `app/sitemaps/[filename]/route.ts`:
 * размер страницы `GET /:lang/tags` упал с двухсот до ста (`LEGACY-298`),
 * и на умолчании `fetchAllPages` в пятьдесят страниц запас обхода тихо упал
 * бы вдвое - с десяти тысяч тегов до пяти. Явный потолок возвращает прежний
 * запас, а превышение - громкий отказ страницы вместо тихой недостачи плитки.
 */
const TAGS_TRAVERSAL_MAX_PAGES = 100;

/**
 * До 04.09.2026 хаб забирал теги одним запросом `limit: 200` — плитка рисует
 * их все сразу, без клиентской пагинации. `GET /:lang/tags` тогда потолка не
 * имел вовсе (`LEGACY-298`), и число подобрали по факту. Маршрут теперь зажат
 * `API_MAX_PAGE_SIZE`, поэтому хаб листает бэкенд-страницы этим же размером.
 *
 * Обход - готовый `fetchAllPages` (`lib/sitemap/utils.ts`), а не свой цикл:
 * ручной перебор `page`/`totalPages` не отличил бы усечённую страницу
 * (`LEGACY-098`) от полной и не пережил бы единичный `429` от лимитера
 * (`LEGACY-064`, у фронта общий IP на все запросы к API) - обе гонки молча
 * дали бы неполную плитку тегов с кодом 200. Ревью нашло эту дыру в первой
 * версии функции с ручным циклом.
 */
async function getAllPublicTags(lang: SupportedLang): Promise<TagListItem[]> {
  return fetchAllPages(
    (page) => getPublicTags(lang, { page, limit: API_MAX_PAGE_SIZE }),
    `tags ${lang}`,
    TAGS_TRAVERSAL_MAX_PAGES
  );
}

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
    getAllPublicTags(lang),
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
      <TaxonomyOverview configKey="tag" items={tags} lang={lang} page={page} />
    </>
  );
}
