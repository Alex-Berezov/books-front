/**
 * Categories Endpoints
 *
 * API endpoints for working with categories.
 * Categories represent a hierarchical taxonomy
 * for classifying books (e.g., Fiction → Fantasy → Epic Fantasy).
 */

import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import { API_MAX_PAGE_SIZE } from '@/lib/http.constants';
import type {
  AttachCategoryRequest,
  Category,
  CategoryListItem,
  PaginatedResult,
  CategoryTranslation,
  CategoryTree,
  CreateCategoryRequest,
  CreateCategoryTranslationRequest,
  ImportResult,
  UpdateCategoryRequest,
  UpdateCategoryTranslationRequest,
} from '@/types/api-schema';

/**
 * Parameters for the admin categories list.
 */
export interface GetAdminCategoriesParams {
  /** Page number (starting from 1) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Filter by category type (category|genre|collection) */
  type?: 'category' | 'genre' | 'collection';
  /** Язык поязыковых счётчиков; без него `booksCount` сквозной по всем языкам. */
  lang?: string;
}

/**
 * Get list of categories for admin pickers.
 *
 * Ходит на `GET /admin/categories` — маршрут за `JwtAuthGuard`, а не на публичный
 * `GET /{lang}/categories`. Публичный идёт под `PublicCacheInterceptor` и отдаётся
 * с `public, s-maxage=300, stale-while-revalidate=3600`: заведённая контент-менеджером
 * категория не появлялась бы в пикере до часа — «категория не сохранилась»
 * (`LEGACY-387`, решение арбитра 22.09.2026).
 *
 * Языка нет намеренно — как и у тегов: без него `booksCount` остаётся сквозным
 * по всем языкам, ровно как до переезда.
 */
export const getAdminCategories = async (
  params: GetAdminCategoriesParams = {}
): Promise<PaginatedResult<CategoryListItem>> => {
  const { page = 1, limit = API_MAX_PAGE_SIZE, type, lang } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (type) {
    queryParams.append('type', type);
  }

  if (lang) {
    queryParams.append('lang', lang);
  }

  const endpoint = `/admin/categories?${queryParams.toString()}`;
  return httpGetAuth<PaginatedResult<CategoryListItem>>(endpoint, { requireAuth: true });
};

/**
 * Get categories tree (optionally filtered by type)
 *
 * @param type - Filter by category type (category|genre|collection)
 * @returns Root nodes of the hierarchy in `{items, pagination}`, one page (`LEGACY-379`)
 *
 * @example
 * ```ts
 * const tree = await getCategoriesTree('category');
 * const genres = await getCategoriesTree('genre');
 * ```
 */
export const getCategoriesTree = async (
  type?: string,
  lang?: string
): Promise<PaginatedResult<CategoryTree>> => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (lang) params.append('lang', lang);
  const qs = params.toString();
  const endpoint = `/categories/tree${qs ? `?${qs}` : ''}`;
  return httpGetAuth<PaginatedResult<CategoryTree>>(endpoint, {
    requireAuth: false,
  });
};

/**
 * Create a new category
 *
 * @param data - Category data
 * @returns Created category
 */
export const createCategory = async (data: CreateCategoryRequest): Promise<Category> => {
  const endpoint = `/categories`;
  return httpPostAuth<Category>(endpoint, data);
};

/**
 * Update an existing category
 *
 * @param id - Category ID
 * @param data - Category data
 * @returns Updated category
 */
export const updateCategory = async (
  id: string,
  data: UpdateCategoryRequest
): Promise<Category> => {
  const endpoint = `/categories/${id}`;
  return httpPatchAuth<Category>(endpoint, data);
};

/**
 * Get category translations
 *
 * @param id - Category ID
 * @returns List of category translations
 */
export const getCategoryTranslations = async (
  id: string
): Promise<PaginatedResult<CategoryTranslation>> => {
  const endpoint = `/categories/${id}/translations`;
  return httpGetAuth<PaginatedResult<CategoryTranslation>>(endpoint);
};

/**
 * Create category translation
 *
 * @param id - Category ID
 * @param data - Translation data
 * @returns Created translation
 */
export const createCategoryTranslation = async (
  id: string,
  data: CreateCategoryTranslationRequest
): Promise<CategoryTranslation> => {
  const endpoint = `/categories/${id}/translations`;
  return httpPostAuth<CategoryTranslation>(endpoint, data);
};

/**
 * Update category translation
 *
 * @param id - Category ID
 * @param language - Language code
 * @param data - Translation data
 * @returns Updated translation
 */
export const updateCategoryTranslation = async (
  id: string,
  language: string,
  data: UpdateCategoryTranslationRequest
): Promise<CategoryTranslation> => {
  const endpoint = `/categories/${id}/translations/${language}`;
  return httpPatchAuth<CategoryTranslation>(endpoint, data);
};

/**
 * Delete category translation
 *
 * @param id - Category ID
 * @param language - Language code
 */
export const deleteCategoryTranslation = async (id: string, language: string): Promise<void> => {
  const endpoint = `/categories/${id}/translations/${language}`;
  return httpDeleteAuth(endpoint);
};

/**
 * Attach category to book version
 *
 * @param versionId - Book version ID
 * @param categoryId - Category ID
 *
 * @example
 * ```ts
 * await attachCategory('version-uuid', 'category-uuid');
 * ```
 */
export const attachCategory = async (versionId: string, categoryId: string): Promise<void> => {
  const endpoint = `/versions/${versionId}/categories`;
  const data: AttachCategoryRequest = { categoryId };
  return httpPostAuth<void>(endpoint, data);
};

/**
 * Detach category from book version
 *
 * @param versionId - Book version ID
 * @param categoryId - Category ID
 *
 * @example
 * ```ts
 * await detachCategory('version-uuid', 'category-uuid');
 * ```
 */
export const detachCategory = async (versionId: string, categoryId: string): Promise<void> => {
  const endpoint = `/versions/${versionId}/categories/${categoryId}`;
  return httpDeleteAuth<void>(endpoint);
};

/**
 * Delete a category
 *
 * @param id - Category ID
 * @returns Promise that resolves when deletion is complete
 */
export const deleteCategory = async (id: string): Promise<void> => {
  const endpoint = `/categories/${id}`;
  return httpDeleteAuth<void>(endpoint);
};

/**
 * Import categories/genres/collections from JSON array
 *
 * @param data - Array of import category DTOs
 * @returns Import result with counts and errors
 *
 * @example
 * ```ts
 * const result = await importCategories([{ key: 'fiction', type: 'category', translations: { ... } }]);
 * ```
 */
export const importCategories = async (data: Record<string, unknown>[]): Promise<ImportResult> => {
  return httpPostAuth<ImportResult>('/import/categories', data);
};
