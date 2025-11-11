/**
 * Categories Endpoints
 *
 * API endpoints for working with categories.
 * Categories represent a hierarchical taxonomy
 * for classifying books (e.g., Fiction → Fantasy → Epic Fantasy).
 */

import { httpDeleteAuth, httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type {
  AttachCategoryRequest,
  Category,
  CategoryTree,
  PaginatedResponse,
} from '@/types/api-schema';

/**
 * Parameters for fetching categories list
 */
export interface GetCategoriesParams {
  /** Page number (starting from 1) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Search by name */
  search?: string;
}

/**
 * Get list of categories
 *
 * @param params - Request parameters
 * @returns Paginated list of categories
 *
 * @example
 * ```ts
 * const categories = await getCategories({ page: 1, limit: 50 });
 * ```
 */
export const getCategories = async (
  params: GetCategoriesParams = {}
): Promise<PaginatedResponse<Category>> => {
  const { page = 1, limit = 50, search } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    queryParams.append('search', search);
  }

  const endpoint = `/categories?${queryParams.toString()}`;
  return httpGetAuth<PaginatedResponse<Category>>(endpoint);
};

/**
 * Get categories tree
 *
 * @returns Hierarchical tree of categories
 *
 * @example
 * ```ts
 * const tree = await getCategoriesTree();
 * ```
 */
export const getCategoriesTree = async (): Promise<CategoryTree[]> => {
  const endpoint = `/categories/tree`;
  return httpGetAuth<CategoryTree[]>(endpoint);
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
