/**
 * React Query hooks for working with tags
 *
 * Tag is a label for classifying and searching books.
 * Tags can be attached to book versions.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  attachTag,
  createTag,
  deleteTag,
  detachTag,
  getTags,
  updateTag,
  type GetTagsParams,
} from '@/api/endpoints/admin/tags';
import type {
  CreateTagRequest,
  PaginatedResponse,
  Tag,
  UpdateTagRequest,
} from '@/types/api-schema';
import { versionKeys } from './useBookVersions';

/**
 * Query keys for tags
 */
export const tagKeys = {
  /** All tag queries */
  all: ['tags'] as const,
  /** Tag lists */
  lists: () => [...tagKeys.all, 'list'] as const,
  /** Tag list with parameters */
  list: (params: GetTagsParams) => [...tagKeys.lists(), params] as const,
  /** Tag details */
  details: () => [...tagKeys.all, 'detail'] as const,
  /** Tag detail */
  detail: (id: string) => [...tagKeys.details(), id] as const,
};

/**
 * Hook for getting tags list
 *
 * @param params - Request parameters
 * @param options - React Query options
 * @returns React Query result with tags list
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useTags({ page: 1, limit: 50, search: 'motiv' });
 * ```
 */
export const useTags = (
  params: GetTagsParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Tag>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: tagKeys.list(params),
    queryFn: () => getTags(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook for creating a tag
 */
export const useCreateTag = (options?: UseMutationOptions<Tag, Error, CreateTagRequest>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTag,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for updating a tag
 */
export const useUpdateTag = (
  options?: UseMutationOptions<Tag, Error, { id: string; data: UpdateTagRequest }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateTag(id, data),
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tagKeys.detail(variables.id) });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for deleting a tag
 */
export const useDeleteTag = (options?: UseMutationOptions<void, Error, string>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTag,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for attaching tag to book version
 *
 * @param options - React Query mutation options
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const attachMutation = useAttachTag({
 *   onSuccess: () => {
 *     toast.success('Tag attached');
 *   }
 * });
 *
 * attachMutation.mutate({
 *   versionId: 'version-uuid',
 *   tagId: 'tag-uuid'
 * });
 * ```
 */
export const useAttachTag = (
  options?: UseMutationOptions<void, Error, { versionId: string; tagId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, tagId }) => attachTag(versionId, tagId),
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate version data for update
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};

/**
 * Hook for detaching tag from book version
 *
 * @param options - React Query mutation options
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const detachMutation = useDetachTag({
 *   onSuccess: () => {
 *     toast.success('Tag detached');
 *   }
 * });
 *
 * detachMutation.mutate({
 *   versionId: 'version-uuid',
 *   tagId: 'tag-uuid'
 * });
 * ```
 */
export const useDetachTag = (
  options?: UseMutationOptions<void, Error, { versionId: string; tagId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, tagId }) => detachTag(versionId, tagId),
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate version data for update
      queryClient.invalidateQueries({ queryKey: versionKeys.detail(variables.versionId) });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
  });
};
