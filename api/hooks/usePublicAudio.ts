/**
 * React Query hooks for the public audio-player flow.
 */

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  getPublicAudioChapters,
  recordView,
  updateAudioProgress,
} from '@/api/endpoints/public-audio';
import type {
  AudioChaptersListResponse,
  GetAudioChaptersParams,
  RecordViewRequest,
  UpdateAudioProgressRequest,
} from '@/types/api-schema';

export const publicAudioKeys = {
  all: ['public-audio'] as const,
  list: (bookVersionId: string, params?: GetAudioChaptersParams) =>
    [...publicAudioKeys.all, 'list', bookVersionId, params ?? {}] as const,
};

/**
 * Public list of audio chapters for a published version.
 */
export const usePublicAudioChapters = (
  bookVersionId: string,
  params?: GetAudioChaptersParams,
  options?: Omit<UseQueryOptions<AudioChaptersListResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: publicAudioKeys.list(bookVersionId, params),
    queryFn: () => getPublicAudioChapters(bookVersionId, params),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(bookVersionId),
    ...options,
  });
};

/**
 * Fire-and-forget view tracking. Errors are swallowed — view counters must
 * never block the UI.
 */
export const useRecordView = () => {
  return useMutation({
    mutationFn: (data: RecordViewRequest) => recordView(data),
    onError: (err) => {
      // Non-blocking — log only.

      console.warn('Failed to record view:', err);
    },
  });
};

/**
 * Update audio progress for the authenticated user. Errors are also
 * non-blocking (progress can be resent on next tick).
 */
export const useUpdateAudioProgress = (versionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAudioProgressRequest) => updateAudioProgress(versionId, data),
    onSuccess: () => {
      // 🔴 `readingProgress` — только пометить устаревшим, без перезапроса.
      // Плеер держит этот запрос активным всё прослушивание, а сохранение идёт
      // раз в пять секунд: с обычной инвалидацией (`refetchType: 'active'`) каждый `PUT`
      // тянул бы за собой `GET` — около 720 лишних запросов за час на слушателя,
      // и ни один из них не нужен: восстановление одноразовое. Снимок всё равно
      // обновится на следующем монтировании через `refetchOnMount`.
      queryClient.invalidateQueries({
        queryKey: ['readingProgress', versionId],
        refetchType: 'none',
      });
      queryClient.invalidateQueries({ queryKey: ['bookshelf'] });
      queryClient.invalidateQueries({ queryKey: ['readerBootstrap'] });
    },
    onError: (err) => {
      console.warn('Failed to update audio progress:', err);
    },
  });
};
