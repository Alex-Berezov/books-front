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
  twitterCard?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
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
  seoId?: number | null; // Backend returns seoId, not seo object
  seo?: SeoData; // May be populated from relation, but not always
  createdAt: ISODate;
  updatedAt: ISODate;
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
  type: PageType; // Required field!
  content: string;
  language?: SupportedLang; // Ignored by backend, taken from :lang in URL
  seo?: SeoInput; // Nested SEO object (optional)
}

/**
 * Request to update page
 */
export interface UpdatePageRequest {
  slug?: string;
  title?: string;
  type?: PageType;
  content?: string;
  language?: SupportedLang;
  seo?: SeoInput; // Nested SEO object (optional)
  status?: PublicationStatus;
}

/**
 * Request to resolve SEO data
 */
export interface SeoResolveRequest {
  type: 'book' | 'page' | 'category' | 'tag';
  id: UUID;
}

/**
 * Response with resolved SEO data
 */
export interface SeoResolveResponse {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  canonicalUrl: string;
  alternates: Record<SupportedLang, string>;
}
