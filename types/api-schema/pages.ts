/**
 * Types for Pages (CMS) endpoints
 *
 * Static pages, SEO metadata
 */

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
