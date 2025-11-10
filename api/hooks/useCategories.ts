/**
 * React Query хуки для работы с категориями
 *
 * Категория (Category) - это таксономия для организации книг.
 * Категории могут быть вложенными (древовидная структура).
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
} from '@/api/endpoints/admin';
import type { Category, CategoryTree, PaginatedResponse } from '@/types/api-schema';
import { versionKeys } from './useBookVersions';

/**
 * Query ключи для категорий
 */
export const categoryKeys = {
  /** Все запросы категорий */
  all: ['categories'] as const,
  /** Списки категорий */
  lists: () => [...categoryKeys.all, 'list'] as const,
  /** Список категорий с параметрами */
  list: (params: GetCategoriesParams) => [...categoryKeys.lists(), params] as const,
  /** Дерево категорий */
  tree: () => [...categoryKeys.all, 'tree'] as const,
};

/**
 * Хук для получения списка категорий
 *
 * @param params - Параметры запроса
 * @param options - Опции React Query
 * @returns React Query результат со списком категорий
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
    staleTime: 10 * 60 * 1000, // 10 минут
    ...options,
  });
};

/**
 * Хук для получения дерева категорий
 *
 * @param options - Опции React Query
 * @returns React Query результат с деревом категорий
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
    staleTime: 10 * 60 * 1000, // 10 минут
    ...options,
  });
};

/**
 * Хук для привязывания категории к версии книги
 *
 * @param options - Опции React Query mutation
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
      // Инвалидируем данные версии для обновления
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
    },
    ...options,
  });
};

/**
 * Хук для отвязывания категории от версии книги
 *
 * @param options - Опции React Query mutation
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
      // Инвалидируем данные версии для обновления
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
    },
    ...options,
  });
};
