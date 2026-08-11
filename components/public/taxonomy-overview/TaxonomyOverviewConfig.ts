import type { SystemPageKey } from '@/lib/system-pages';

export type TaxonomyType = 'category' | 'genre' | 'collection' | 'tag';

export type BreadcrumbItem = {
  labelKey: string;
  href?: string;
};

/**
 * Fallback shown when the CMS page for a hub has no content of its own.
 *
 * Keys only — no literal strings. It used to carry `metaTitle`/`metaDescription`
 * in English, which nobody read: every hub builds its metadata from the
 * dictionary (`dict.categories.metaTitle` and so on). They were removed
 * 11.08.2026 (`LEGACY-051`); an untranslated literal that looks authoritative is
 * worse than no field, because the next edit goes into it and changes nothing.
 */
export interface FallbackContent {
  h1Key: string;
  shortDescriptionKey: string;
}

export interface TaxonomyOverviewConfig {
  type: TaxonomyType;
  /**
   * Неизменяемый ключ CMS-страницы хаба. Раньше здесь лежал слаг, и то же
   * значение дублировалось литералом в самом маршруте — при этом читался только
   * литерал, а поле не читал никто. Теперь ключ живёт здесь одним экземпляром.
   */
  pageKey: SystemPageKey;
  routeBase: string;
  breadcrumbs: BreadcrumbItem[];
  fallback: FallbackContent;
}

export const TAXONOMY_OVERVIEW_CONFIGS: Record<TaxonomyType, TaxonomyOverviewConfig> = {
  category: {
    type: 'category',
    pageKey: 'taxonomy-categories',
    routeBase: 'category',
    breadcrumbs: [{ labelKey: 'breadcrumb.home', href: '/' }, { labelKey: 'categories.title' }],
    fallback: {
      h1Key: 'categories.title',
      shortDescriptionKey: 'categories.subtitle',
    },
  },
  genre: {
    type: 'genre',
    pageKey: 'taxonomy-genres',
    routeBase: 'genre',
    breadcrumbs: [{ labelKey: 'breadcrumb.home', href: '/' }, { labelKey: 'genres.title' }],
    fallback: {
      h1Key: 'genres.title',
      shortDescriptionKey: 'genres.subtitle',
    },
  },
  collection: {
    type: 'collection',
    pageKey: 'taxonomy-collections',
    routeBase: 'collection',
    breadcrumbs: [{ labelKey: 'breadcrumb.home', href: '/' }, { labelKey: 'collections.title' }],
    fallback: {
      h1Key: 'collections.title',
      shortDescriptionKey: 'collections.subtitle',
    },
  },
  tag: {
    type: 'tag',
    pageKey: 'taxonomy-tags',
    routeBase: 'tag',
    breadcrumbs: [{ labelKey: 'breadcrumb.home', href: '/' }, { labelKey: 'tags.allTags' }],
    fallback: {
      h1Key: 'tags.title',
      shortDescriptionKey: 'tags.subtitle',
    },
  },
};
