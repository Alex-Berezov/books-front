/**
 * Types for Categories endpoints
 *
 * Book categories, category tree, linking with books
 */

import type { BookCardModel } from './books';
import type { PaginatedResponse, SupportedLang, UUID } from './common';
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
  description?: string | null;
  /**
   * Есть только там, где ручка его синтезирует: `GET /{lang}/categories/{slug}/books`
   * и `.../books/cards`. У модели `Category` такой колонки нет, списки и запись
   * категории язык не отдают.
   */
  language?: SupportedLang;
  parentId?: UUID | null;
  booksCount?: number;
  /** Cached per-language book count for the requested `?lang` (undefined without it) */
  langBookCount?: number;
  /**
   * Automatic indexability (hysteresis) for the requested `?lang`; undefined without it
   * or when the term has no translation into that language. Decide linkability with
   * `isTaxonomyLinkable`, never with `booksCount` directly.
   */
  autoIndexable?: boolean;
  /** Whether the page is indexable by search engines */
  indexable?: boolean;
  /** Whether the category is visible in public lists */
  isVisible?: boolean;
  /** Sort order in lists */
  sortOrder?: number;
  translations?: CategoryTranslation[];
  translation?: CategoryTranslation | null;
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
  category?: Category | null;
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
  /** Колонка `h1 String?`: приходит `null`, а не отсутствие ключа. */
  h1?: string | null;
  /** Short description for cards/lists */
  shortDescription?: string | null;
  /** Meta title for SEO */
  metaTitle?: string | null;
  /** Meta description for SEO */
  metaDescription?: string | null;
  /** Open Graph title */
  ogTitle?: string | null;
  /** Open Graph description */
  ogDescription?: string | null;
  /** Open Graph image URL */
  ogImageUrl?: string | null;
  /** Open Graph image alt text */
  ogImageAlt?: string | null;
  /** FAQ items */
  faq?: Array<{ question: string; answer: string }> | null;
  /** Published books attached to this term in this language (cached by the backend) */
  bookCount?: number;
  /** Automatic indexability derived from bookCount with hysteresis (close <=2, open >=5) */
  autoIndexable?: boolean;
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
  /** Колонка `h1 String?`: приходит `null`, а не отсутствие ключа. */
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
  /** Колонка `h1 String?`: приходит `null`, а не отсутствие ключа. */
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

/**
 * Элемент публичного списка категорий (`GET /{lang}/categories`).
 *
 * Жил в `api/endpoints/public.ts` до 10.09.2026: рукописные формы ответа собраны здесь,
 * чтобы гейт `check:type-sync` видел их через барель, а не только внутри модуля вызовов.
 */
export interface CategoryListItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  booksCount: number;
  translations: Array<{ language: string; name: string; slug: string }>;
}

/**
 * Страница публичного списка категорий (`GET /{lang}/categories`).
 *
 * Переехала из `api/endpoints/public.ts` 10.09.2026 вслед за `CategoryListItem`:
 * близнец `PaginatedTagsResponse` уже лежал в `types/api-schema/tags.ts`.
 */
export interface PaginatedCategoriesResponse {
  data: CategoryListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
