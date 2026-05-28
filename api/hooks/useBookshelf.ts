import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import * as bookshelfApi from '@/api/endpoints/bookshelf';
import { queryKeys } from '@/lib/queryClient';
import type { BookshelfListResponse, BookshelfItemDto } from '@/api/endpoints/bookshelf';
import type { ApiError } from '@/types/api';

/**
 * Hook for listing user's bookshelf
 *
 * @param page - Page number
 * @param limit - Page size limit
 * @param options - Additional react-query options
 * @returns Query result containing the bookshelf items
 */
export const useBookshelf = (
  page = 1,
  limit = 10,
  options?: Omit<UseQueryOptions<BookshelfListResponse, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<BookshelfListResponse, ApiError> => {
  return useQuery<BookshelfListResponse, ApiError>({
    queryKey: queryKeys.bookshelf(page, limit),
    queryFn: () => bookshelfApi.getBookshelf(page, limit),
    ...options,
  });
};

/**
 * Hook for adding a book version to the user's bookshelf
 *
 * @returns Mutation helper for adding a book
 */
export const useAddToBookshelf = () => {
  const queryClient = useQueryClient();

  return useMutation<BookshelfItemDto, ApiError, string>({
    mutationFn: (versionId: string) => bookshelfApi.addToBookshelf(versionId),
    onSuccess: () => {
      // Invalidate all bookshelf queries
      queryClient.invalidateQueries({ queryKey: ['bookshelf'] });
    },
  });
};

/**
 * Hook for removing a book version from the user's bookshelf
 *
 * @returns Mutation helper for removing a book
 */
export const useRemoveFromBookshelf = () => {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (versionId: string) => bookshelfApi.removeFromBookshelf(versionId),
    onSuccess: () => {
      // Invalidate all bookshelf queries
      queryClient.invalidateQueries({ queryKey: ['bookshelf'] });
    },
  });
};
