/**
 * React Query hooks for audio chapters.
 *
 * Audio chapter = one audio file in a book version. See
 * `FRONTEND_ITER2_CONTRACT.md` §3 for the contract.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  createAudioChapter,
  deleteAudioChapter,
  getAudioChapter,
  getAudioChapters,
  reorderAudioChapters,
  updateAudioChapter,
} from '@/api/endpoints/admin/audioChapters';
import type {
  AudioChapterDetail,
  AudioChaptersListResponse,
  CreateAudioChapterRequest,
  GetAudioChaptersParams,
  ReorderAudioChaptersRequest,
  UpdateAudioChapterRequest,
} from '@/types/api-schema';

/**
 * Query keys for audio chapters.
 */
export const audioChapterKeys = {
  all: ['audio-chapters'] as const,
  lists: () => [...audioChapterKeys.all, 'list'] as const,
  list: (bookVersionId: string, params?: GetAudioChaptersParams) =>
    [...audioChapterKeys.lists(), bookVersionId, params ?? {}] as const,
  details: () => [...audioChapterKeys.all, 'detail'] as const,
  detail: (id: string) => [...audioChapterKeys.details(), id] as const,
};

/**
 * Hook: list audio chapters of a book version (admin, works on drafts).
 */
export const useAudioChapters = (
  bookVersionId: string,
  params?: GetAudioChaptersParams,
  options?: Omit<UseQueryOptions<AudioChaptersListResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: audioChapterKeys.list(bookVersionId, params),
    queryFn: () => getAudioChapters(bookVersionId, params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook: get a single audio chapter by ID.
 */
export const useAudioChapter = (
  audioChapterId: string,
  options?: Omit<UseQueryOptions<AudioChapterDetail>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: audioChapterKeys.detail(audioChapterId),
    queryFn: () => getAudioChapter(audioChapterId),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(audioChapterId),
    ...options,
  });
};

/**
 * Hook: create a new audio chapter.
 */
export const useCreateAudioChapter = (
  options?: UseMutationOptions<
    AudioChapterDetail,
    Error,
    { bookVersionId: string; data: CreateAudioChapterRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookVersionId, data }) => createAudioChapter(bookVersionId, data),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: audioChapterKeys.lists(),
      });
      queryClient.setQueryData(audioChapterKeys.detail(data.id), data);
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook: update an audio chapter.
 */
export const useUpdateAudioChapter = (
  options?: UseMutationOptions<
    AudioChapterDetail,
    Error,
    { audioChapterId: string; data: UpdateAudioChapterRequest; bookVersionId?: string }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ audioChapterId, data }) => updateAudioChapter(audioChapterId, data),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData(audioChapterKeys.detail(variables.audioChapterId), data);
      queryClient.invalidateQueries({ queryKey: audioChapterKeys.lists() });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook: delete an audio chapter.
 */
export const useDeleteAudioChapter = (
  options?: UseMutationOptions<void, Error, { audioChapterId: string; bookVersionId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ audioChapterId }) => deleteAudioChapter(audioChapterId),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: audioChapterKeys.lists() });
      queryClient.removeQueries({
        queryKey: audioChapterKeys.detail(variables.audioChapterId),
      });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook: reorder audio chapters of a version (atomic bulk update).
 */
export const useReorderAudioChapters = (
  options?: UseMutationOptions<
    AudioChapterDetail[],
    Error,
    { bookVersionId: string; data: ReorderAudioChaptersRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookVersionId, data }) => reorderAudioChapters(bookVersionId, data),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: audioChapterKeys.lists() });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};
