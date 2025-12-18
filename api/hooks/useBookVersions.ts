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
  upsertVersionSeo,
} from '@/api/endpoints/admin/bookVersions';
import type { ApiError } from '@/types/api';
import type {
  BookVersionDetail,
  CreateBookVersionRequest,
  UpdateBookVersionRequest,
} from '@/types/api-schema';
import type { SeoData, SeoInput } from '@/types/api-schema/pages';
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
    staleTime: 30 * 1000, // 30 seconds (reduced for better cache invalidation)
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
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate books list for update
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
      // Invalidate version details (will be fetched on redirect)
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(data.id) });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
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
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate version details to refetch with latest data
      // (SEO might be updated separately, so we need fresh data)
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
      // Invalidate books list
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
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
    ...options,
    onSuccess: (data, versionId, context) => {
      // Invalidate version details to refetch with updated status
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(versionId) });
      // Invalidate books list
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        versionId,
        context
      );
    },
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
    ...options,
    onSuccess: (data, versionId, context) => {
      // Invalidate version details to refetch with updated status
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(versionId) });
      // Invalidate books list
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        versionId,
        context
      );
    },
  });
};

/**
 * Hook for upserting SEO metadata for book version
 *
 * Creates or updates SEO data using PUT endpoint.
 * Use this to save SEO fields separately from version data.
 *
 * @param options - React Query mutation options
 * @returns React Query mutation for upserting SEO
 *
 * @example
 * ```tsx
 * const seoMutation = useUpsertVersionSeo({
 *   onSuccess: () => {
 *     toast.success('SEO updated');
 *   }
 * });
 *
 * seoMutation.mutate({
 *   versionId: 'version-uuid',
 *   data: {
 *     metaTitle: 'Harry Potter SEO',
 *     metaDescription: 'Best book',
 *     ogTitle: 'Harry Potter'
 *   }
 * });
 * ```
 */
export const useUpsertVersionSeo = (
  options?: UseMutationOptions<SeoData, ApiError, { versionId: string; data: SeoInput }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, data }) => upsertVersionSeo(versionId, data),
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate version details to refetch with updated SEO
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};
