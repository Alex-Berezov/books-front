/**
 * Types for Categories endpoints
 *
 * Book categories, category tree, linking with books
 */

import type { ISODate, PaginatedResponse, SupportedLang, UUID } from './common';

/**
 * Book category
 */
export interface Category {
  id: UUID;
  slug: string;
  name: string;
  type?: string; // genre|author|popular|etc
  description?: string;
  language: SupportedLang;
  parentId?: UUID | null;
  booksCount?: number;
  translations?: CategoryTranslation[];
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
 */
export interface CategoryTranslation {
  language: string;
  name: string;
  slug: string;
}

/**
 * Request to create category translation
 */
export interface CreateCategoryTranslationRequest {
  language: string;
  name: string;
  slug: string;
}

/**
 * Request to update category translation
 */
export interface UpdateCategoryTranslationRequest {
  name?: string;
  slug?: string;
}

/**
 * Request to create a new category
 */
export interface CreateCategoryRequest {
  name: string;
  slug: string;
  type?: string;
  description?: string;
  parentId?: UUID | null;
  // language is optional/unused for base category
  language?: SupportedLang;
}

/**
 * Request to update an existing category
 */
export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  type?: string;
  description?: string;
  parentId?: UUID | null;
}
