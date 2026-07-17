/**
 * Types for Categories endpoints
 *
 * Book categories, category tree, linking with books
 */

import type { BookCardModel } from './books';
import type { ISODate, PaginatedResponse, SupportedLang, UUID } from './common';
import type { SeoData, SeoInput } from './pages';

/**
 * Book category type enum
 */
export type CategoryType = 'category' | 'genre' | 'collection';

/**
 * Book category
 */
export interface Category {
  id: UUID;
  key: string;
  slug: string;
  name: string;
  type: CategoryType;
  description?: string;
  language: SupportedLang;
  parentId?: UUID | null;
  booksCount?: number;
  /** Whether the page is indexable by search engines */
  indexable?: boolean;
  /** Whether the category is visible in public lists */
  isVisible?: boolean;
  /** Sort order in lists */
  sortOrder?: number;
  translations?: CategoryTranslation[];
  translation?: CategoryTranslation | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Category with nested subcategories (for tree)
 */
export interface CategoryTree extends Category {
  children: CategoryTree[];
}

/**
 * Response with list of books in category
 *
 * NOTE: Import BookOverview from books.ts in index.ts
 */
export interface CategoryBooksResponse<T = unknown> extends PaginatedResponse<T> {
  category: Category;
}

/**
 * Compact category book cards response (from GET :lang/categories/:slug/books/cards).
 * Includes category metadata in addition to items/pagination.
 */
export interface CategoryBookCardsResponse {
  category: Category | null;
  items: BookCardModel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Request to attach category to book version
 */
export interface AttachCategoryRequest {
  categoryId: UUID;
}

/**
 * Request to detach category from book version
 */
export interface DetachCategoryRequest {
  categoryId: UUID;
}

/**
 * Category translation
 *
 * Localized representation of a category. In addition to name/slug may
 * contain a long-form description (shown on the public category page) and
 * SEO metadata used for the category listing page in the given language.
 */
export interface CategoryTranslation {
  language: string;
  name: string;
  slug: string;
  /** Long description/content (HTML) displayed on the public category page */
  description?: string | null;
  /** H1 heading for the page */
  h1?: string;
  /** Short description for cards/lists */
  shortDescription?: string | null;
  /** Meta title for SEO */
  metaTitle?: string;
  /** Meta description for SEO */
  metaDescription?: string | null;
  /** Open Graph title */
  ogTitle?: string;
  /** Open Graph description */
  ogDescription?: string | null;
  /** Open Graph image URL */
  ogImageUrl?: string | null;
  /** Open Graph image alt text */
  ogImageAlt?: string;
  /** FAQ items */
  faq?: Array<{ question: string; answer: string }>;
  /** SEO metadata for the localized category page */
  seoId?: number | null;
  seo?: SeoData | null;
}

/**
 * Request to create category translation
 */
export interface CreateCategoryTranslationRequest {
  language: string;
  name: string;
  slug: string;
  description?: string | null;
  h1?: string;
  shortDescription?: string | null;
  metaTitle?: string;
  metaDescription?: string | null;
  ogTitle?: string;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  ogImageAlt?: string;
  faq?: Array<{ question: string; answer: string }>;
  seo?: SeoInput;
}

/**
 * Request to update category translation
 */
export interface UpdateCategoryTranslationRequest {
  name?: string;
  slug?: string;
  description?: string | null;
  h1?: string;
  shortDescription?: string | null;
  metaTitle?: string;
  metaDescription?: string | null;
  ogTitle?: string;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  ogImageAlt?: string;
  faq?: Array<{ question: string; answer: string }>;
  seo?: SeoInput;
}

/**
 * Request to create a new category
 */
export interface CreateCategoryRequest {
  key: string;
  name: string;
  slug: string;
  type: CategoryType;
  description?: string;
  parentId?: UUID | null;
  indexable?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
  // language is optional/unused for base category
  language?: SupportedLang;
}

/**
 * Request to update an existing category
 */
export interface UpdateCategoryRequest {
  key?: string;
  name?: string;
  slug?: string;
  type?: CategoryType;
  description?: string;
  parentId?: UUID | null;
  indexable?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
}
