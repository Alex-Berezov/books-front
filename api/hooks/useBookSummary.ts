/**
 * React Query hooks for working with book summaries
 *
 * Book summary (пересказ/выжимка) is attached to a specific book version.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { getBookSummary, upsertBookSummary } from '@/api/endpoints/admin/bookSummaries';
import type { BookSummaryDetail, UpsertBookSummaryRequest } from '@/types/api-schema';

/**
 * Query keys for book summaries
 */
export const summaryKeys = {
  /** All summary queries */
  all: ['summaries'] as const,
  /** Summary details */
  details: () => [...summaryKeys.all, 'detail'] as const,
  /** Summary by version ID */
  detail: (versionId: string) => [...summaryKeys.details(), versionId] as const,
};

/**
 * Hook for loading a book version summary.
 *
 * @param versionId - Book version ID
 * @param options - React Query options
 * @returns React Query result with summary or null
 */
export const useBookSummary = (
  versionId: string,
  options?: Omit<UseQueryOptions<BookSummaryDetail | null>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: summaryKeys.detail(versionId),
    queryFn: () => getBookSummary(versionId),
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * Hook for upserting (creating/updating) a book version summary.
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for upserting summary
 */
export const useUpsertBookSummary = (
  options?: UseMutationOptions<
    BookSummaryDetail,
    Error,
    { versionId: string; data: UpsertBookSummaryRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, data }) => upsertBookSummary(versionId, data),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: summaryKeys.detail(variables.versionId) });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};
