/**
 * React Query hooks for working with books (containers)
 *
 * Book is a container for different language versions.
 * Each version (BookVersion) contains content in a specific language.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { createBook, getBooks, type GetBooksParams } from '@/api/endpoints/admin/books';
import type {
  BookOverview,
  CreateBookRequest,
  CreateBookResponse,
  PaginatedResponse,
} from '@/types/api-schema';

/**
 * Query keys for books
 */
export const bookKeys = {
  /** All book queries */
  all: ['books'] as const,
  /** Book lists */
  lists: () => [...bookKeys.all, 'list'] as const,
  /** Book list with parameters */
  list: (params: GetBooksParams) => [...bookKeys.lists(), params] as const,
  /** Details of specific book */
  details: () => [...bookKeys.all, 'detail'] as const,
  /** Book details by ID */
  detail: (id: string) => [...bookKeys.details(), id] as const,
};

/**
 * Hook for getting books list
 *
 * @param params - Request parameters (pagination, search, filters)
 * @param options - React Query options
 * @returns React Query result with books list
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useBooks({
 *   page: 1,
 *   limit: 20,
 *   search: 'tolkien',
 * });
 * ```
 */
export const useBooks = (
  params: GetBooksParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<BookOverview>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: bookKeys.list(params),
    queryFn: () => getBooks(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook for creating a new book (container)
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for creating book
 *
 * @example
 * ```tsx
 * const createBookMutation = useCreateBook();
 *
 * const handleCreateBook = async () => {
 *   const book = await createBookMutation.mutateAsync({
 *     slug: 'my-awesome-book'
 *   });
 *   console.log('Created book:', book);
 * };
 * ```
 */
export const useCreateBook = (
  options?: Omit<UseMutationOptions<CreateBookResponse, Error, CreateBookRequest>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBook,
    onSuccess: () => {
      // Invalidate books list after creation
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
    ...options,
  });
};
