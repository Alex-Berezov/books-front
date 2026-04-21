/**
 * Types for Tags endpoints
 *
 * Book tags, linking with books
 */

import type { ISODate, PaginatedResponse, SupportedLang, UUID } from './common';
import type { SeoData, SeoInput } from './pages';

/**
 * Book tag
 */
export interface Tag {
  id: UUID;
  slug: string;
  name: string;
  language?: SupportedLang;
  booksCount?: number;
  translations?: TagTranslation[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Tag translation
 *
 * Localized representation of a tag. In addition to name/slug may
 * contain a long-form description (shown on the public tag page) and
 * SEO metadata used for the tag listing page in the given language.
 */
export interface TagTranslation {
  language: string;
  name: string;
  slug: string;
  /** Long description/content (HTML) displayed on the public tag page */
  description?: string | null;
  /** SEO metadata for the localized tag page */
  seoId?: number | null;
  seo?: SeoData | null;
}

/**
 * Request to create tag translation
 */
export interface CreateTagTranslationRequest {
  language: string;
  name: string;
  slug: string;
  description?: string | null;
  seo?: SeoInput;
}

/**
 * Request to update tag translation
 */
export interface UpdateTagTranslationRequest {
  name?: string;
  slug?: string;
  description?: string | null;
  seo?: SeoInput;
}

/**
 * Response with list of books with tag
 *
 * NOTE: Import BookOverview from books.ts in index.ts
 */
export interface TagBooksResponse<T = unknown> extends PaginatedResponse<T> {
  tag: Tag;
}

/**
 * Request to create a new tag
 */
export interface CreateTagRequest {
  name: string;
  slug: string;
}

/**
 * Request to update an existing tag
 */
export interface UpdateTagRequest {
  name?: string;
  slug?: string;
}

/**
 * Request to attach tag to book version
 */
export interface AttachTagRequest {
  tagId: UUID;
}

/**
 * Request to detach tag from book version
 */
export interface DetachTagRequest {
  tagId: UUID;
}
