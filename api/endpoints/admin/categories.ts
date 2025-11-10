/**
 * Categories Endpoints
 *
 * API эндпоинты для работы с категориями.
 * Категории представляют собой иерархическую таксономию
 * для классификации книг (например, Fiction → Fantasy → Epic Fantasy).
 */

import { httpDeleteAuth, httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type {
  AttachCategoryRequest,
  Category,
  CategoryTree,
  PaginatedResponse,
} from '@/types/api-schema';

/**
 * Параметры для получения списка категорий
 */
export interface GetCategoriesParams {
  /** Номер страницы (начиная с 1) */
  page?: number;
  /** Количество элементов на странице */
  limit?: number;
  /** Поиск по названию */
  search?: string;
}

/**
 * Получить список категорий
 *
 * @param params - Параметры запроса
 * @returns Пагинированный список категорий
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
 * Получить дерево категорий
 *
 * @returns Иерархическое дерево категорий
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
 * Привязать категорию к версии книги
 *
 * @param versionId - ID версии книги
 * @param categoryId - ID категории
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
 * Отвязать категорию от версии книги
 *
 * @param versionId - ID версии книги
 * @param categoryId - ID категории
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
