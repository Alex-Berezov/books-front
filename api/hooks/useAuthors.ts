/**
 * React Query hooks for working with authors
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  getAuthors,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  type GetAuthorsParams,
} from '@/api/endpoints/admin/authors';
import { getPublicAuthorBySlug } from '@/api/endpoints/public';
import type {
  Author,
  CreateAuthorRequest,
  UpdateAuthorRequest,
  PublicAuthorDetail,
  PaginatedResponse,
  SupportedLang,
} from '@/types/api-schema';

export const authorKeys = {
  all: ['authors'] as const,
  lists: () => [...authorKeys.all, 'list'] as const,
  list: (params: GetAuthorsParams) => [...authorKeys.lists(), params] as const,
  details: () => [...authorKeys.all, 'detail'] as const,
  detail: (slug: string, lang?: string) =>
    [...authorKeys.details(), slug, lang].filter(Boolean) as string[],
};

export const useAuthors = (
  params: GetAuthorsParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Author>, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PaginatedResponse<Author>, Error>({
    queryKey: authorKeys.list(params),
    queryFn: () => getAuthors(params),
    ...options,
  });
};

export const usePublicAuthor = (
  lang: SupportedLang,
  slug: string,
  options?: Omit<UseQueryOptions<PublicAuthorDetail, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<PublicAuthorDetail, Error>({
    queryKey: authorKeys.detail(slug, lang),
    queryFn: () => getPublicAuthorBySlug(lang, slug),
    ...options,
  });
};

export const useCreateAuthor = (
  options?: UseMutationOptions<Author, Error, CreateAuthorRequest>
) => {
  const queryClient = useQueryClient();
  return useMutation<Author, Error, CreateAuthorRequest>({
    mutationFn: createAuthor,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: authorKeys.lists() });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

export const useUpdateAuthor = (
  options?: UseMutationOptions<Author, Error, { id: string; data: UpdateAuthorRequest }>
) => {
  const queryClient = useQueryClient();
  return useMutation<Author, Error, { id: string; data: UpdateAuthorRequest }>({
    mutationFn: ({ id, data }) => updateAuthor(id, data),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: authorKeys.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};

export const useDeleteAuthor = (options?: UseMutationOptions<void, Error, string>) => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteAuthor,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: authorKeys.all });
      (options?.onSuccess as ((...args: unknown[]) => unknown) | undefined)?.(
        data,
        variables,
        context
      );
    },
    ...options,
  });
};
