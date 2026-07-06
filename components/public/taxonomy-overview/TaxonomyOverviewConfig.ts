export type TaxonomyType = 'category' | 'genre' | 'collection' | 'tag';

export type TaxonomyLayout = 'tree' | 'grouped' | 'cards';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export interface FallbackContent {
  h1: string;
  shortDescription: string;
  metaTitle: string;
  metaDescription: string;
}

export interface TaxonomyOverviewConfig {
  type: TaxonomyType;
  pageKey: string;
  routeBase: string;
  layout: TaxonomyLayout;
  breadcrumbs: BreadcrumbItem[];
  fallback: FallbackContent;
}

export const TAXONOMY_OVERVIEW_CONFIGS: Record<TaxonomyType, TaxonomyOverviewConfig> = {
  category: {
    type: 'category',
    pageKey: 'taxonomy-categories-index',
    routeBase: 'categories',
    layout: 'tree',
    breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'Browse Categories' }],
    fallback: {
      h1: 'Browse Book Categories',
      shortDescription: 'Explore book categories on Bibliaris.',
      metaTitle: 'Book Categories | Bibliaris',
      metaDescription:
        'Browse book categories on Bibliaris. Discover classic literature, fiction, history, science, education, and more.',
    },
  },
  genre: {
    type: 'genre',
    pageKey: 'taxonomy-genres-index',
    routeBase: 'genres',
    layout: 'grouped',
    breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'Browse Genres' }],
    fallback: {
      h1: 'Browse Book Genres',
      shortDescription: 'Discover books across every genre and literary style.',
      metaTitle: 'Book Genres | Bibliaris',
      metaDescription:
        'Browse literary genres on Bibliaris. Discover drama, gothic fiction, mystery, romance, adventure, satire, fantasy, horror, and more.',
    },
  },
  collection: {
    type: 'collection',
    pageKey: 'taxonomy-collections-index',
    routeBase: 'collections',
    layout: 'cards',
    breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'Collections' }],
    fallback: {
      h1: 'Book Collections',
      shortDescription: 'Explore curated collections of classic literature.',
      metaTitle: 'Book Collections | Bibliaris',
      metaDescription:
        'Explore curated book collections on Bibliaris, including short reads, free books, school reading, audiobooks, summaries, and themed selections.',
    },
  },
  tag: {
    type: 'tag',
    pageKey: 'taxonomy-tags-index',
    routeBase: 'tags',
    layout: 'cards',
    breadcrumbs: [{ label: 'Home', href: '/' }, { label: 'All Tags' }],
    fallback: {
      h1: 'Literary Tags & Book Themes',
      shortDescription:
        'Explore literary tags, themes, motifs, characters, settings, moods, and reading interests on Bibliaris.',
      metaTitle: 'Literary Tags & Book Themes | Bibliaris',
      metaDescription:
        'Browse literary tags and book themes on Bibliaris. Discover books by ideas, characters, settings, moods, genres, periods, and reading interests.',
    },
  },
};
