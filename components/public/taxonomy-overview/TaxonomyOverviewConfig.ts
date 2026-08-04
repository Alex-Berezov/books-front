export type TaxonomyType = 'category' | 'genre' | 'collection' | 'tag';

export type BreadcrumbItem = {
  labelKey: string;
  href?: string;
};

export interface FallbackContent {
  h1Key: string;
  shortDescriptionKey: string;
  metaTitle: string;
  metaDescription: string;
}

export interface TaxonomyOverviewConfig {
  type: TaxonomyType;
  pageKey: string;
  routeBase: string;
  breadcrumbs: BreadcrumbItem[];
  fallback: FallbackContent;
}

export const TAXONOMY_OVERVIEW_CONFIGS: Record<TaxonomyType, TaxonomyOverviewConfig> = {
  category: {
    type: 'category',
    pageKey: 'taxonomy-categories-index',
    routeBase: 'category',
    breadcrumbs: [{ labelKey: 'breadcrumb.home', href: '/' }, { labelKey: 'categories.title' }],
    fallback: {
      h1Key: 'categories.title',
      shortDescriptionKey: 'categories.subtitle',
      metaTitle: 'Book Categories | Bibliaris',
      metaDescription:
        'Browse book categories on Bibliaris. Discover classic literature, fiction, history, science, education, and more.',
    },
  },
  genre: {
    type: 'genre',
    pageKey: 'taxonomy-genres-index',
    routeBase: 'genre',
    breadcrumbs: [{ labelKey: 'breadcrumb.home', href: '/' }, { labelKey: 'genres.title' }],
    fallback: {
      h1Key: 'genres.title',
      shortDescriptionKey: 'genres.subtitle',
      metaTitle: 'Book Genres | Bibliaris',
      metaDescription:
        'Browse literary genres on Bibliaris. Discover drama, gothic fiction, mystery, romance, adventure, satire, fantasy, horror, and more.',
    },
  },
  collection: {
    type: 'collection',
    pageKey: 'taxonomy-collections-index',
    routeBase: 'collection',
    breadcrumbs: [{ labelKey: 'breadcrumb.home', href: '/' }, { labelKey: 'collections.title' }],
    fallback: {
      h1Key: 'collections.title',
      shortDescriptionKey: 'collections.subtitle',
      metaTitle: 'Book Collections | Bibliaris',
      metaDescription:
        'Explore curated book collections on Bibliaris, including short reads, free books, school reading, audiobooks, summaries, and themed selections.',
    },
  },
  tag: {
    type: 'tag',
    pageKey: 'taxonomy-tags-index',
    routeBase: 'tag',
    breadcrumbs: [{ labelKey: 'breadcrumb.home', href: '/' }, { labelKey: 'tags.allTags' }],
    fallback: {
      h1Key: 'tags.title',
      shortDescriptionKey: 'tags.subtitle',
      metaTitle: 'Literary Tags & Book Themes | Bibliaris',
      metaDescription:
        'Browse literary tags and book themes on Bibliaris. Discover books by ideas, characters, settings, moods, genres, periods, and reading interests.',
    },
  },
};
