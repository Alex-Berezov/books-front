/**
 * React Query hooks for working with book chapters
 *
 * Chapter is a content section inside a book version.
 * Chapters are ordered and can be free or paid.
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
} from '@/api/endpoints/admin/chapters';
import type {
  ChapterDetail,
  CreateChapterRequest,
  ReorderChaptersRequest,
  UpdateChapterRequest,
} from '@/types/api-schema';

/**
 * Query keys for chapters
 */
export const chapterKeys = {
  /** All chapter queries */
  all: ['chapters'] as const,
  /** Chapter lists */
  lists: () => [...chapterKeys.all, 'list'] as const,
  /** Chapter list for specific version */
  list: (versionId: string) => [...chapterKeys.lists(), versionId] as const,
  /** Chapter details */
  details: () => [...chapterKeys.all, 'detail'] as const,
  /** Chapter details by ID */
  detail: (id: string) => [...chapterKeys.details(), id] as const,
};

/**
 * Hook for getting book version chapters list
 *
 * @param versionId - Book version ID
 * @param options - React Query options
 * @returns React Query result with chapters list
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook for creating a new chapter
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for creating chapter
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
      // Invalidate version chapters list
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(variables.versionId) });
      // Set chapter data in cache
      queryClient.setQueryData(chapterKeys.detail(data.id), data);
    },
    ...options,
  });
};

/**
 * Hook for updating chapter
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for updating chapter
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
      // Update chapter data in cache
      queryClient.setQueryData(chapterKeys.detail(variables.chapterId), data);
      // Invalidate version chapters list
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(data.versionId) });
    },
    ...options,
  });
};

/**
 * Hook for deleting chapter
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for deleting chapter
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
      // Invalidate version chapters list
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(variables.versionId) });
      // Remove chapter from cache
      queryClient.removeQueries({ queryKey: chapterKeys.detail(variables.chapterId) });
    },
    ...options,
  });
};

/**
 * Hook for reordering chapters
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for reordering
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
      // Invalidate chapters list for update
      queryClient.invalidateQueries({ queryKey: chapterKeys.list(variables.versionId) });
    },
    ...options,
  });
};
