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
  detachCategory,
  getCategories,
  getCategoriesTree,
  type GetCategoriesParams,
} from '@/api/endpoints/admin/categories';
import type { Category, CategoryTree, PaginatedResponse } from '@/types/api-schema';
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
  list: (params: GetCategoriesParams) => [...categoryKeys.lists(), params] as const,
  /** Category tree */
  tree: () => [...categoryKeys.all, 'tree'] as const,
};

/**
 * Hook for getting category list
 *
 * @param params - Request parameters (pagination, search)
 * @param options - React Query options
 * @returns React Query result with paginated category list
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useCategories({ page: 1, limit: 50 });
 * ```
 */
export const useCategories = (
  params: GetCategoriesParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Category>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: () => getCategories(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook for getting categories tree
 *
 * @param options - React Query options
 * @returns React Query result with categories tree
 *
 * @example
 * ```tsx
 * const { data: tree, isLoading } = useCategoriesTree();
 * ```
 */
export const useCategoriesTree = (
  options?: Omit<UseQueryOptions<CategoryTree[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: categoryKeys.tree(),
    queryFn: () => getCategoriesTree(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
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
    onSuccess: (_data, variables) => {
      // Invalidate version data for update
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
    },
    ...options,
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
    onSuccess: (_data, variables) => {
      // Invalidate version data for update
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
    },
    ...options,
  });
};
