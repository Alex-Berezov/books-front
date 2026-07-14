/**
 * Types for Pages (CMS) endpoints
 *
 * Static pages, SEO metadata
 */

import type { BookOverview } from './books';
import type { ISODate, PageType, PublicationStatus, SupportedLang, UUID } from './common';

/**
 * SEO data for create/update (nested object in request)
 */
export interface SeoInput {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  ogImageAlt?: string | null;
  twitterCard?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
}

/**
 * SEO data in response from backend (full SEO entity)
 */
export interface SeoData {
  id: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  ogImageAlt?: string | null;
  twitterCard?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Page translation info
 */
export interface PageTranslation {
  id: UUID;
  language: SupportedLang;
  slug: string;
  title: string;
}

/**
 * FAQ item
 */
export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Response with page information
 */
export interface PageResponse {
  id: UUID;
  slug: string;
  title: string;
  type: PageType;
  content: string;
  language: SupportedLang;
  status: PublicationStatus;
  /** Display H1 heading (overrides title) */
  h1?: string | null;
  /** Short description for overview/preview */
  shortDescription?: string | null;
  /** FAQ structured data array */
  faq?: FaqItem[] | null;
  /** Homepage sections configuration (JSON object with block data) */
  sections?: Record<string, unknown> | null;
  seoId?: number | null;
  seo?: SeoData;
  translationGroupId?: string | null;
  translations?: PageTranslation[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Page Group (for grouped list view)
 */
export interface PageGroup {
  translationGroupId: string;
  pages: PageResponse[];
}

/**
 * Taxonomy reference within a book collection (for homepage sections)
 */
export interface BookCollectionTaxonomy {
  /** 'category' or 'tag' */
  type: 'category' | 'tag';
  /** Taxonomy slug */
  slug: string;
}

/**
 * A curated book collection for the homepage (stored in sections JSON).
 * Each collection pulls N newest books from each referenced taxonomy.
 */
export interface BookCollection {
  /** Display title (e.g. "Fiction & Stories") */
  title: string;
  /** 4 taxonomy references — 3 newest books are taken from each */
  taxonomies: BookCollectionTaxonomy[];
}

/**
 * Resolved collection with books fetched from API.
 * Used internally for passing data between server component and client.
 */
export interface BookCollectionData {
  title: string;
  books: BookOverview[];
}

/**
 * Request to create page
 *
 * IMPORTANT: Backend now accepts nested seo object (commit 869a248)
 * and automatically creates/updates SEO entity
 */
export interface CreatePageRequest {
  slug: string;
  title: string;
  type: PageType;
  content: string;
  h1?: string | null;
  shortDescription?: string | null;
  faq?: FaqItem[] | null;
  sections?: Record<string, unknown> | null;
  language?: SupportedLang;
  seo?: SeoInput;
  translationGroupId?: string | null;
}

/**
 * Request to update page
 */
export interface UpdatePageRequest {
  slug?: string;
  title?: string;
  type?: PageType;
  content?: string;
  h1?: string | null;
  shortDescription?: string | null;
  faq?: FaqItem[] | null;
  sections?: Record<string, unknown> | null;
  language?: SupportedLang;
  seo?: SeoInput;
  status?: PublicationStatus;
}

/**
 * Request to resolve SEO data
 */
export interface SeoResolveRequest {
  type: 'book' | 'page' | 'category' | 'tag';
  id: UUID;
}

export interface SeoMeta {
  title: string;
  description?: string;
  robots: string;
  canonicalUrl: string;
}

export interface SeoOpenGraphImage {
  url: string;
  alt?: string;
}

export interface SeoOpenGraph {
  title: string;
  description?: string;
  type: string;
  url: string;
  image?: SeoOpenGraphImage;
}

export interface SeoTwitter {
  card: string;
  site?: string;
  title?: string;
  description?: string;
  image?: string;
}

export interface SeoHreflang {
  rel: string;
  hreflang: string;
  href: string;
}

/**
 * Response with resolved SEO data
 */
export interface SeoResolveResponse {
  meta: SeoMeta;
  openGraph: SeoOpenGraph;
  twitter: SeoTwitter;
  hreflang?: SeoHreflang[];
  hreflangs?: SeoHreflang[];
  schema?: Record<string, unknown>;
  breadcrumbPath?: Array<{ name: string; slug: string }> | null;
}
