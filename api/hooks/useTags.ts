/**
 * React Query хуки для работы с тегами
 *
 * Тег (Tag) - это метка для классификации и поиска книг.
 * Теги могут быть привязаны к версиям книг.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { attachTag, detachTag, getTags, type GetTagsParams } from '@/api/endpoints/admin/tags';
import type { PaginatedResponse, Tag } from '@/types/api-schema';
import { versionKeys } from './useBookVersions';

/**
 * Query ключи для тегов
 */
export const tagKeys = {
  /** Все запросы тегов */
  all: ['tags'] as const,
  /** Списки тегов */
  lists: () => [...tagKeys.all, 'list'] as const,
  /** Список тегов с параметрами */
  list: (params: GetTagsParams) => [...tagKeys.lists(), params] as const,
};

/**
 * Хук для получения списка тегов
 *
 * @param params - Параметры запроса
 * @param options - Опции React Query
 * @returns React Query результат со списком тегов
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useTags({ page: 1, limit: 50, search: 'motiv' });
 * ```
 */
export const useTags = (
  params: GetTagsParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Tag>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: tagKeys.list(params),
    queryFn: () => getTags(params),
    staleTime: 10 * 60 * 1000, // 10 минут
    ...options,
  });
};

/**
 * Хук для привязывания тега к версии книги
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const attachMutation = useAttachTag({
 *   onSuccess: () => {
 *     toast.success('Tag attached');
 *   }
 * });
 *
 * attachMutation.mutate({
 *   versionId: 'version-uuid',
 *   tagId: 'tag-uuid'
 * });
 * ```
 */
export const useAttachTag = (
  options?: UseMutationOptions<void, Error, { versionId: string; tagId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, tagId }) => attachTag(versionId, tagId),
    onSuccess: (_data, variables) => {
      // Инвалидируем данные версии для обновления
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
    },
    ...options,
  });
};

/**
 * Хук для отвязывания тега от версии книги
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const detachMutation = useDetachTag({
 *   onSuccess: () => {
 *     toast.success('Tag detached');
 *   }
 * });
 *
 * detachMutation.mutate({
 *   versionId: 'version-uuid',
 *   tagId: 'tag-uuid'
 * });
 * ```
 */
export const useDetachTag = (
  options?: UseMutationOptions<void, Error, { versionId: string; tagId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, tagId }) => detachTag(versionId, tagId),
    onSuccess: (_data, variables) => {
      // Инвалидируем данные версии для обновления
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
    },
    ...options,
  });
};
