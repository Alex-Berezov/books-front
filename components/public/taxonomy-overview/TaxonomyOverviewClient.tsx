'use client';

import type { FC } from 'react';
import { useTags } from '@/api/hooks';
import { useCategoriesTree } from '@/api/hooks/useCategories';
import { usePage } from '@/api/hooks/usePublic';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CategoryTree, Tag } from '@/types/api-schema';
import { BottomInternalLinks } from './BottomInternalLinks';
import { FaqBlock } from './FaqBlock';
import { OverviewHero } from './OverviewHero';
import { SeoDescription } from './SeoDescription';
import { TaxonomyCardGrid } from './TaxonomyCardGrid';
import { TaxonomyGroupedList } from './TaxonomyGroupedList';
import styles from './TaxonomyOverviewClient.module.scss';
import { TAXONOMY_OVERVIEW_CONFIGS, type TaxonomyOverviewConfig } from './TaxonomyOverviewConfig';
import { TaxonomyTree } from './TaxonomyTree';

export interface TaxonomyOverviewClientProps {
  lang: SupportedLang;
  configKey: 'category' | 'genre' | 'collection' | 'tag';
}

export const TaxonomyOverviewClient: FC<TaxonomyOverviewClientProps> = ({ lang, configKey }) => {
  const config: TaxonomyOverviewConfig = TAXONOMY_OVERVIEW_CONFIGS[configKey];

  const { data: page } = usePage(lang, config.pageKey, {
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

  const renderTaxonomyList = () => {
    if (isLoading) {
      return <div className={styles.loading}>Loading...</div>;
    }

    if (configKey === 'tag') {
      const tags = (tagsData?.data || []) as Tag[];
      return (
        <TaxonomyCardGrid
          lang={lang}
          items={tags}
          routeBase={config.routeBase}
          emptyText={`No ${config.routeBase} available yet.`}
        />
      );
    }

    const items = (treeData || []) as CategoryTree[];

    switch (config.layout) {
      case 'tree':
        return <TaxonomyTree lang={lang} items={items} />;
      case 'grouped':
        return <TaxonomyGroupedList lang={lang} items={items} />;
      case 'cards':
        return (
          <TaxonomyCardGrid
            lang={lang}
            items={items}
            routeBase={config.routeBase}
            emptyText={`No ${config.routeBase} available yet.`}
          />
        );
      default:
        return null;
    }
  };

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
          {renderTaxonomyList()}
        </div>

        {description && <SeoDescription description={description} />}

        {faq && faq.length > 0 && <FaqBlock items={faq} />}

        <BottomInternalLinks lang={lang} currentType={configKey} />
      </div>
    </div>
  );
};
