'use client';

import type { FC } from 'react';
import { useTags } from '@/api/hooks';
import { useCategoriesTree } from '@/api/hooks/useCategories';
import { usePage } from '@/api/hooks/usePublic';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CategoryTree, PageResponse, Tag } from '@/types/api-schema';
import { FaqBlock } from './FaqBlock';
import { OverviewHero } from './OverviewHero';
import { SeoDescription } from './SeoDescription';
import { TaxonomyCardGrid } from './TaxonomyCardGrid';
import styles from './TaxonomyOverviewClient.module.scss';
import { TAXONOMY_OVERVIEW_CONFIGS, type TaxonomyOverviewConfig } from './TaxonomyOverviewConfig';

export interface TaxonomyOverviewClientProps {
  lang: SupportedLang;
  configKey: 'category' | 'genre' | 'collection' | 'tag';
  initialPage?: PageResponse;
}

export const TaxonomyOverviewClient: FC<TaxonomyOverviewClientProps> = ({
  lang,
  configKey,
  initialPage,
}) => {
  const config: TaxonomyOverviewConfig = TAXONOMY_OVERVIEW_CONFIGS[configKey];

  const { data: page } = usePage(lang, config.pageKey, {
    initialData: initialPage,
    enabled: true,
  });

  const { data: treeData, isLoading: treeLoading } = useCategoriesTree(configKey, {
    enabled: configKey !== 'tag',
  });

  const { data: tagsData, isLoading: tagsLoading } = useTags(
    { limit: 200 },
    {
      enabled: configKey === 'tag',
    }
  );

  const isLoading = configKey === 'tag' ? tagsLoading : treeLoading;

  const h1 = page?.h1 || page?.title || config.fallback.h1;
  const shortDescription = page?.shortDescription || config.fallback.shortDescription;
  const description = page?.content || '';
  const faq = page?.faq || null;

  const breadcrumbItems = [
    {
      label: config.breadcrumbs[0].label,
      href: `/${lang}`,
    },
    {
      label: config.breadcrumbs[1].label,
    },
  ];

  const allItems =
    configKey === 'tag' ? ((tagsData?.data || []) as Tag[]) : ((treeData || []) as CategoryTree[]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Breadcrumbs items={breadcrumbItems} />

        <OverviewHero h1={h1} shortDescription={shortDescription} />

        <div className={styles.taxonomySection}>
          <h2 className={styles.sectionTitle}>
            {configKey === 'category' && 'Main Categories'}
            {configKey === 'genre' && 'Genre Groups'}
            {configKey === 'collection' && 'Featured Collections'}
            {configKey === 'tag' && 'All Tags'}
          </h2>
          <TaxonomyCardGrid
            lang={lang}
            items={allItems}
            routeBase={config.routeBase}
            emptyText={`No ${config.routeBase} available yet.`}
            isLoading={isLoading}
          />
        </div>

        {description && <SeoDescription description={description} />}

        {faq && faq.length > 0 && <FaqBlock items={faq} />}
      </div>
    </div>
  );
};
