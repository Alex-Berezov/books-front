/**
 * React Query hooks for reading progress
 */

import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { getProgress, updateTextProgress } from '@/api/endpoints/progress';
import { queryKeys } from '@/lib/queryClient';
import type { ApiError } from '@/types/api';
import type { ReadingProgress, UpdateProgressRequest } from '@/types/api-schema';

/**
 * Hook to get user reading progress for a specific version
 *
 * @param versionId - Book version ID
 * @param options - Query options
 */
export const useProgress = (
  versionId: string,
  options?: Omit<UseQueryOptions<ReadingProgress, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<ReadingProgress, ApiError> => {
  return useQuery<ReadingProgress, ApiError>({
    queryKey: queryKeys.readingProgress(versionId),
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
  return useMutation({
    mutationFn: (data: UpdateProgressRequest) => updateTextProgress(versionId, data),
    onError: (err) => {
      console.warn('Failed to update text progress:', err);
    },
  });
};
