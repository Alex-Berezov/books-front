/**
 * React Query хуки для работы с главами книг
 *
 * Глава (Chapter) - это раздел контента внутри версии книги.
 * Главы упорядочены и могут быть бесплатными или платными.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  createChapter,
  deleteChapter,
  getChapters,
  reorderChapters,
  updateChapter,
} from '@/api/endpoints/admin';
import type {
  ChapterDetail,
  CreateChapterRequest,
  ReorderChaptersRequest,
  UpdateChapterRequest,
} from '@/types/api-schema';

/**
 * Query ключи для глав
 */
export const chapterKeys = {
  /** Все запросы глав */
  all: ['chapters'] as const,
  /** Списки глав */
  lists: () => [...chapterKeys.all, 'list'] as const,
  /** Список глав конкретной версии */
  list: (versionId: string) => [...chapterKeys.lists(), versionId] as const,
  /** Детали глав */
  details: () => [...chapterKeys.all, 'detail'] as const,
  /** Детали главы по ID */
  detail: (id: string) => [...chapterKeys.details(), id] as const,
};

/**
 * Хук для получения списка глав версии книги
 *
 * @param versionId - ID версии книги
 * @param options - Опции React Query
 * @returns React Query результат со списком глав
 *
 * @example
 * ```tsx
 * const { data: chapters, isLoading } = useChapters('version-uuid');
 * ```
 */
export const useChapters = (
  versionId: string,
  options?: Omit<UseQueryOptions<ChapterDetail[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: chapterKeys.list(versionId),
    queryFn: () => getChapters(versionId),
    staleTime: 5 * 60 * 1000, // 5 минут
    ...options,
  });
};

/**
 * Хук для создания новой главы
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для создания главы
 *
 * @example
 * ```tsx
 * const createMutation = useCreateChapter({
 *   onSuccess: () => {
 *     toast.success('Chapter created');
 *   }
 * });
 *
 * createMutation.mutate({
 *   versionId: 'version-uuid',
 *   data: {
 *     orderIndex: 1,
 *     title: 'Introduction',
 *     content: '# Chapter 1\n\nContent...',
 *     isFree: true
 *   }
 * });
 * ```
 */
export const useCreateChapter = (
  options?: UseMutationOptions<
    ChapterDetail,
    Error,
    { versionId: string; data: CreateChapterRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, data }) => createChapter(versionId, data),
    onSuccess: (data, variables) => {
      // Инвалидируем список глав версии
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(variables.versionId) });
      // Устанавливаем данные главы в кэш
      queryClient.setQueryData(chapterKeys.detail(data.id), data);
    },
    ...options,
  });
};

/**
 * Хук для обновления главы
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для обновления главы
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateChapter({
 *   onSuccess: () => {
 *     toast.success('Chapter updated');
 *   }
 * });
 *
 * updateMutation.mutate({
 *   chapterId: 'chapter-uuid',
 *   data: {
 *     title: 'Updated Title',
 *     content: 'New content...'
 *   }
 * });
 * ```
 */
export const useUpdateChapter = (
  options?: UseMutationOptions<
    ChapterDetail,
    Error,
    { chapterId: string; data: UpdateChapterRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chapterId, data }) => updateChapter(chapterId, data),
    onSuccess: (data, variables) => {
      // Обновляем данные главы в кэше
      queryClient.setQueryData(chapterKeys.detail(variables.chapterId), data);
      // Инвалидируем список глав версии
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(data.versionId) });
    },
    ...options,
  });
};

/**
 * Хук для удаления главы
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для удаления главы
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteChapter({
 *   onSuccess: () => {
 *     toast.success('Chapter deleted');
 *   }
 * });
 *
 * deleteMutation.mutate({
 *   chapterId: 'chapter-uuid',
 *   versionId: 'version-uuid'
 * });
 * ```
 */
export const useDeleteChapter = (
  options?: UseMutationOptions<void, Error, { chapterId: string; versionId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chapterId }) => deleteChapter(chapterId),
    onSuccess: (_data, variables) => {
      // Инвалидируем список глав версии
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(variables.versionId) });
      // Удаляем главу из кэша
      queryClient.removeQueries({ queryKey: chapterKeys.detail(variables.chapterId) });
    },
    ...options,
  });
};

/**
 * Хук для переупорядочивания глав
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для переупорядочивания
 *
 * @example
 * ```tsx
 * const reorderMutation = useReorderChapters({
 *   onSuccess: () => {
 *     toast.success('Chapters reordered');
 *   }
 * });
 *
 * reorderMutation.mutate({
 *   versionId: 'version-uuid',
 *   data: {
 *     chapterIds: ['chapter-3', 'chapter-1', 'chapter-2']
 *   }
 * });
 * ```
 */
export const useReorderChapters = (
  options?: UseMutationOptions<
    ChapterDetail[],
    Error,
    { versionId: string; data: ReorderChaptersRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, data }) => reorderChapters(versionId, data),
    onSuccess: (_data, variables) => {
      // Инвалидируем список глав для обновления
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(variables.versionId) });
    },
    ...options,
  });
};
