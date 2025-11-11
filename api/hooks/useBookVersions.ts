/**
 * React Query hooks for working with book versions
 *
 * Book version is a specific language version of a book.
 * Contains content, chapters, categories and tags.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  createBookVersion,
  getBookVersion,
  publishVersion,
  unpublishVersion,
  updateBookVersion,
} from '@/api/endpoints/admin/bookVersions';
import type {
  BookVersionDetail,
  CreateBookVersionRequest,
  UpdateBookVersionRequest,
} from '@/types/api-schema';
import { bookKeys } from './useBooks';

/**
 * Query keys for book versions
 */
export const versionKeys = {
  /** All version queries */
  all: ['versions'] as const,
  /** Version details */
  details: () => [...versionKeys.all, 'detail'] as const,
  /** Version details by ID */
  detail: (id: string) => [...versionKeys.details(), id] as const,
};

/**
 * Hook for getting book version details
 *
 * @param versionId - Book version ID
 * @param options - React Query options
 * @returns React Query result with version details
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useBookVersion('version-uuid');
 * ```
 */
export const useBookVersion = (
  versionId: string,
  options?: Omit<UseQueryOptions<BookVersionDetail>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: versionKeys.detail(versionId),
    queryFn: () => getBookVersion(versionId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook for creating a new book version
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for creating version
 *
 * @example
 * ```tsx
 * const createMutation = useCreateBookVersion({
 *   onSuccess: (data) => {
 *     console.log('Version created:', data.id);
 *   }
 * });
 *
 * createMutation.mutate({
 *   bookId: 'book-uuid',
 *   data: {
 *     language: 'en',
 *     title: 'Harry Potter',
 *     author: 'J.K. Rowling',
 *     type: 'text',
 *     isFree: true
 *   }
 * });
 * ```
 */
export const useCreateBookVersion = (
  options?: UseMutationOptions<
    BookVersionDetail,
    Error,
    { bookId: string; data: CreateBookVersionRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, data }) => createBookVersion(bookId, data),
    onSuccess: (data, _variables) => {
      // Invalidate books list for update
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
      // Set version data in cache
      queryClient.setQueryData(versionKeys.detail(data.id), data);
    },
    ...options,
  });
};

/**
 * Hook for updating existing book version
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for updating version
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateBookVersion({
 *   onSuccess: () => {
 *     toast.success('Version updated');
 *   }
 * });
 *
 * updateMutation.mutate({
 *   versionId: 'version-uuid',
 *   data: {
 *     title: 'Updated Title'
 *   }
 * });
 * ```
 */
export const useUpdateBookVersion = (
  options?: UseMutationOptions<
    BookVersionDetail,
    Error,
    { versionId: string; data: UpdateBookVersionRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, data }) => updateBookVersion(versionId, data),
    onSuccess: (data, variables) => {
      // Update version data in cache
      queryClient.setQueryData(versionKeys.detail(variables.versionId), data);
      // Invalidate books list
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
    ...options,
  });
};

/**
 * Hook for publishing book version
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for publishing
 *
 * @example
 * ```tsx
 * const publishMutation = usePublishVersion({
 *   onSuccess: () => {
 *     toast.success('Version published');
 *   }
 * });
 *
 * publishMutation.mutate('version-uuid');
 * ```
 */
export const usePublishVersion = (
  options?: UseMutationOptions<BookVersionDetail, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => publishVersion(versionId),
    onSuccess: (data, versionId) => {
      // Update version data in cache
      queryClient.setQueryData(versionKeys.detail(versionId), data);
      // Invalidate books list
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
    ...options,
  });
};

/**
 * Hook for unpublishing book version
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for unpublishing
 *
 * @example
 * ```tsx
 * const unpublishMutation = useUnpublishVersion({
 *   onSuccess: () => {
 *     toast.info('Version unpublished');
 *   }
 * });
 *
 * unpublishMutation.mutate('version-uuid');
 * ```
 */
export const useUnpublishVersion = (
  options?: UseMutationOptions<BookVersionDetail, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => unpublishVersion(versionId),
    onSuccess: (data, versionId) => {
      // Update version data in cache
      queryClient.setQueryData(versionKeys.detail(versionId), data);
      // Invalidate books list
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
    ...options,
  });
};
