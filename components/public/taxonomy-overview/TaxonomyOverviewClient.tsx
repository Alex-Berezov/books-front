'use client';

import type { FC } from 'react';
import { useCategoriesTree } from '@/api/hooks/useCategories';
import { usePage, usePublicTags } from '@/api/hooks/usePublic';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';
import { PageBackButton } from '@/components/public/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { TagListItem } from '@/api/endpoints/public';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { CategoryTree, PageResponse } from '@/types/api-schema';
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
  const { t } = useTranslation();

  const { data: page } = usePage(lang, config.pageKey, {
    initialData: initialPage,
    enabled: true,
  });

  const { data: treeData, isLoading: treeLoading } = useCategoriesTree(
    configKey,
    {
      enabled: configKey !== 'tag',
    },
    lang
  );

  const { data: tagsData, isLoading: tagsLoading } = usePublicTags(
    lang,
    { limit: 200 },
    {
      enabled: configKey === 'tag',
    }
  );

  const isLoading = configKey === 'tag' ? tagsLoading : treeLoading;

  const h1 = page?.h1 || page?.title || t(config.fallback.h1Key);
  const shortDescription = page?.shortDescription || t(config.fallback.shortDescriptionKey);
  const description = page?.content || '';
  const faq = page?.faq || null;

  const breadcrumbItems = [
    {
      label: t(config.breadcrumbs[0].labelKey),
      href: `/${lang}`,
    },
    {
      label: t(config.breadcrumbs[1].labelKey),
    },
  ];

  const allItems: CategoryTree[] | TagListItem[] =
    configKey === 'tag' ? tagsData?.data || [] : treeData || [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Breadcrumbs items={breadcrumbItems} />

        <PageBackButton lang={lang} />

        <OverviewHero h1={h1} shortDescription={shortDescription} />

        <div className={styles.taxonomySection}>
          <h2 className={styles.sectionTitle}>
            {configKey === 'category' && t('taxonomy.mainCategories')}
            {configKey === 'genre' && t('taxonomy.genreGroups')}
            {configKey === 'collection' && t('taxonomy.featuredCollections')}
            {configKey === 'tag' && t('taxonomy.allTags')}
          </h2>
          <TaxonomyCardGrid
            lang={lang}
            items={allItems}
            routeBase={config.routeBase}
            emptyText={t('taxonomy.noItems')}
            isLoading={isLoading}
            itemKind={configKey === 'tag' ? 'tag' : 'category'}
            bookSingular={t('common.bookSingular')}
            bookPlural={t('common.bookPlural')}
          />
        </div>

        {description && <SeoDescription description={description} />}

        {faq && faq.length > 0 && <FaqBlock items={faq} />}
      </div>
    </div>
  );
};
