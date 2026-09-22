/**
 * React Query hooks for working with categories
 *
 * Category is a taxonomy for organizing books.
 * Categories can be nested (tree structure).
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  attachCategory,
  createCategory,
  createCategoryTranslation,
  deleteCategory,
  deleteCategoryTranslation,
  detachCategory,
  getAdminCategories,
  getCategoriesTree,
  getCategoryTranslations,
  importCategories,
  updateCategory,
  updateCategoryTranslation,
} from '@/api/endpoints/admin/categories';
import type {
  Category,
  CategoryTranslation,
  CategoryTree,
  CreateCategoryRequest,
  CreateCategoryTranslationRequest,
  CategoryListItem,
  ImportResult,
  UpdateCategoryRequest,
  UpdateCategoryTranslationRequest,
} from '@/types/api-schema';
import { versionKeys } from './useBookVersions';

/**
 * Query keys for categories
 */
export const categoryKeys = {
  /** All category queries */
  all: ['categories'] as const,
  /** Category lists */
  lists: () => [...categoryKeys.all, 'list'] as const,
  /** Category list with parameters */
  list: (params: CategoryListParams) => [...categoryKeys.lists(), params] as const,
  /** Category tree (optionally by type) */
  tree: (type?: string) => [...categoryKeys.all, 'tree', type ?? 'all'] as const,
  /** Category translations */
  translations: (id: string) => [...categoryKeys.all, id, 'translations'] as const,
};

/**
 * Параметры списка категорий для пикеров админки.
 *
 * Языка нет: список ходит на безъязыкий админский `GET /admin/categories`, и без
 * языка `booksCount` остаётся сквозным по всем языкам — ровно как до переезда
 * с публичного адреса (`LEGACY-387`).
 */
export interface CategoryListParams {
  type?: 'category' | 'genre' | 'collection';
}

/**
 * Потолок обхода страниц пикера, страницами по сто.
 *
 * Назван явно по той же причине, что и потолки обхода в карте сайта: один
 * `limit` числом уже молча терял термины (категорий 133 при потолке админской
 * ручки в 100), а бесконечный цикл на отказе ручки крутился бы вечно. Сотня
 * страниц — десять тысяч терминов, на порядок больше сегодняшнего каталога.
 */
const CATEGORY_TRAVERSAL_MAX_PAGES = 100;

/**
 * Hook for getting category list
 *
 * @param params - Request parameters (language, pagination, type)
 * @param options - React Query options
 * @returns React Query result with paginated category list
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useCategories({ lang: 'en', page: 1, limit: 50 });
 * ```
 */
export const useCategories = (
  params: CategoryListParams = {},
  options?: Omit<UseQueryOptions<CategoryListItem[]>, 'queryKey' | 'queryFn'>
) => {
  const { type } = params;
  return useQuery({
    queryKey: categoryKeys.list(params),
    // Страницы добираются, а не берутся первой сотней: у админской ручки потолок
    // `limit` — 100 (`PAGINATION_MAX_LIMIT`), а терминов больше, и прежний
    // `limit: 100` молча терял хвост каталога.
    queryFn: async () => {
      const collected: CategoryListItem[] = [];
      for (let page = 1; page <= CATEGORY_TRAVERSAL_MAX_PAGES; page += 1) {
        const { items, pagination } = await getAdminCategories({ page, type });
        collected.push(...items);
        if (page >= pagination.totalPages || items.length === 0) break;
      }
      return collected;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook for getting categories tree (optionally filtered by type)
 *
 * @param type - Filter by category type (category|genre|collection). Omit for all.
 * @param options - React Query options
 * @returns React Query result with categories tree
 *
 * @example
 * ```tsx
 * const { data: categories } = useCategoriesTree('category');
 * const { data: genres } = useCategoriesTree('genre');
 * const { data: all } = useCategoriesTree();
 * ```
 */
export const useCategoriesTree = (
  type?: string,
  options?: Omit<UseQueryOptions<CategoryTree[]>, 'queryKey' | 'queryFn'>,
  lang?: string
) => {
  return useQuery({
    queryKey: [...categoryKeys.tree(type), lang],
    queryFn: () => getCategoriesTree(type, lang),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook for getting category translations
 *
 * @param id - Category ID
 * @param options - React Query options
 */
export const useCategoryTranslations = (
  id: string,
  options?: Omit<UseQueryOptions<CategoryTranslation[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: categoryKeys.translations(id),
    queryFn: () => getCategoryTranslations(id),
    enabled: !!id,
    ...options,
  });
};

/**
 * Hook for creating a new category
 */
export const useCreateCategory = (
  options?: UseMutationOptions<Category, Error, CreateCategoryRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...categoryKeys.all, 'tree'] });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for creating category translation
 */
export const useCreateCategoryTranslation = (
  options?: UseMutationOptions<
    CategoryTranslation,
    Error,
    { id: string; data: CreateCategoryTranslationRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => createCategoryTranslation(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.translations(variables.id) });
      // Also invalidate lists/tree as they might show translation info
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...categoryKeys.all, 'tree'] });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for updating an existing category
 */
export const useUpdateCategory = (
  options?: UseMutationOptions<Category, Error, { id: string; data: UpdateCategoryRequest }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateCategory(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...categoryKeys.all, 'tree'] });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for updating category translation
 */
export const useUpdateCategoryTranslation = (
  options?: UseMutationOptions<
    CategoryTranslation,
    Error,
    { id: string; language: string; data: UpdateCategoryTranslationRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, language, data }) => updateCategoryTranslation(id, language, data),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.translations(variables.id) });
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...categoryKeys.all, 'tree'] });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for attaching category to book version
 *
 * @param options - React Query mutation options
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const attachMutation = useAttachCategory({
 *   onSuccess: () => {
 *     toast.success('Category attached');
 *   }
 * });
 *
 * attachMutation.mutate({
 *   versionId: 'version-uuid',
 *   categoryId: 'category-uuid'
 * });
 * ```
 */
export const useAttachCategory = (
  options?: UseMutationOptions<void, Error, { versionId: string; categoryId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, categoryId }) => attachCategory(versionId, categoryId),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: versionKeys.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for detaching category from book version
 *
 * @param options - React Query mutation options
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const detachMutation = useDetachCategory({
 *   onSuccess: () => {
 *     toast.success('Category detached');
 *   }
 * });
 *
 * detachMutation.mutate({
 *   versionId: 'version-uuid',
 *   categoryId: 'category-uuid'
 * });
 * ```
 */
export const useDetachCategory = (
  options?: UseMutationOptions<void, Error, { versionId: string; categoryId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, categoryId }) => detachCategory(versionId, categoryId),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: versionKeys.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for deleting a category
 */
export const useDeleteCategory = (options?: UseMutationOptions<void, Error, string>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...categoryKeys.all, 'tree'] });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for importing categories/genres/collections from JSON
 */
export const useImportCategories = (
  options?: UseMutationOptions<ImportResult, Error, Record<string, unknown>[]>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importCategories,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for deleting category translation
 */
export const useDeleteCategoryTranslation = (
  options?: UseMutationOptions<void, Error, { id: string; language: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, language }) => deleteCategoryTranslation(id, language),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.translations(variables.id) });
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...categoryKeys.all, 'tree'] });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};
