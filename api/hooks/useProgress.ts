/**
 * React Query hooks for reading progress
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { getProgress, updateTextProgress } from '@/api/endpoints/progress';
import { queryKeys } from '@/lib/queryClient';
import type { ApiError } from '@/types/api';
import type { ReadingProgress, UpdateProgressRequest } from '@/types/api-schema';

/**
 * Hook to get user reading progress for a specific version.
 *
 * Данные могут быть `null` — это не отказ, а первое обращение к книге.
 * Отличать его от `isError` обязательно: восстанавливать позицию «с нуля»
 * после неудавшегося запроса значит затереть человеку реальное место.
 *
 * @param versionId - Book version ID
 * @param options - Query options
 */
export const useProgress = (
  versionId: string,
  userId?: string,
  options?: Omit<UseQueryOptions<ReadingProgress | null, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<ReadingProgress | null, ApiError> => {
  return useQuery<ReadingProgress | null, ApiError>({
    queryKey: queryKeys.readingProgress(versionId, userId),
    queryFn: () => getProgress(versionId),
    ...options,
  });
};

/**
 * Hook to update text reading progress
 *
 * @param versionId - Book version ID
 */
export const useUpdateTextProgress = (versionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProgressRequest) => updateTextProgress(versionId, data),
    onSuccess: () => {
      // По префиксу, без `userId`: гасит запись любого владельца по этой версии.
      queryClient.invalidateQueries({ queryKey: ['readingProgress', versionId] });
      queryClient.invalidateQueries({ queryKey: ['bookshelf'] });
      queryClient.invalidateQueries({ queryKey: ['readerBootstrap'] });
    },
    onError: (err) => {
      console.warn('Failed to update text progress:', err);
    },
  });
};
