import type { FC } from 'react';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { PageBackButton } from '@/components/public/navigation';
import { createTranslator } from '@/lib/i18n/translate';
import type { TagListItem } from '@/api/endpoints/public';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CategoryTree, PageResponse } from '@/types/api-schema';
import { FaqBlock } from './FaqBlock';
import { OverviewHero } from './OverviewHero';
import { SeoDescription } from './SeoDescription';
import { TaxonomyCardGrid } from './TaxonomyCardGrid';
import styles from './TaxonomyOverview.module.scss';
import { TAXONOMY_OVERVIEW_CONFIGS, type TaxonomyOverviewConfig } from './TaxonomyOverviewConfig';

export interface TaxonomyOverviewProps {
  lang: SupportedLang;
  configKey: 'category' | 'genre' | 'collection' | 'tag';
  page: PageResponse | null;
  items: CategoryTree[] | TagListItem[];
}

const SECTION_TITLE_KEY: Record<TaxonomyOverviewProps['configKey'], string> = {
  category: 'taxonomy.mainCategories',
  genre: 'taxonomy.genreGroups',
  collection: 'taxonomy.featuredCollections',
  tag: 'taxonomy.allTags',
};

/**
 * The four taxonomy hubs — server-rendered.
 *
 * This used to be a client component that fetched its terms through React Query,
 * which meant the server HTML of `/:lang/{categories,genres,collections,tags}`
 * contained **no link to any term at all**. Every taxonomy URL in the sitemap was
 * therefore advertised but reachable only by executing JavaScript — the 25
 * findings rule 7.6 reported. Nothing about these pages is interactive, so the
 * fetch belongs on the server; the only client parts left are leaf components
 * (breadcrumbs, back button, FAQ accordion) that receive plain props.
 */
export const TaxonomyOverview: FC<TaxonomyOverviewProps> = ({ lang, configKey, page, items }) => {
  const config: TaxonomyOverviewConfig = TAXONOMY_OVERVIEW_CONFIGS[configKey];
  const t = createTranslator(lang);

  const h1 = page?.h1 || page?.title || t(config.fallback.h1Key);
  const shortDescription = page?.shortDescription || t(config.fallback.shortDescriptionKey);
  const description = page?.content || '';
  const faq = page?.faq || null;

  const breadcrumbItems = [
    { label: t(config.breadcrumbs[0].labelKey), href: `/${lang}` },
    { label: t(config.breadcrumbs[1].labelKey) },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Breadcrumbs items={breadcrumbItems} />

        <PageBackButton lang={lang} />

        <OverviewHero h1={h1} shortDescription={shortDescription} />

        <div className={styles.taxonomySection}>
          <h2 className={styles.sectionTitle}>{t(SECTION_TITLE_KEY[configKey])}</h2>
          <TaxonomyCardGrid
            bookPlural={t('common.bookPlural')}
            bookSingular={t('common.bookSingular')}
            emptyText={t('taxonomy.noItems')}
            itemKind={configKey === 'tag' ? 'tag' : 'category'}
            items={items}
            lang={lang}
            routeBase={config.routeBase}
          />
        </div>

        {description && <SeoDescription description={description} />}

        {faq && faq.length > 0 && <FaqBlock items={faq} />}
      </div>
    </div>
  );
};
