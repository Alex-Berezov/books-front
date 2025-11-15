/**
 * React Query hooks for working with CMS pages
 *
 * Page is static content (About, Privacy Policy, etc.)
 * Pages are multilingual and have publication status.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  createPage,
  deletePage,
  getPageById,
  getPages,
  publishPage,
  unpublishPage,
  updatePage,
  type GetPagesParams,
} from '@/api/endpoints/admin/pages';
import type {
  CreatePageRequest,
  PageResponse,
  PaginatedResponse,
  UpdatePageRequest,
} from '@/types/api-schema';

/**
 * Query keys for pages
 */
export const pageKeys = {
  /** All page queries */
  all: ['pages'] as const,
  /** Page lists */
  lists: () => [...pageKeys.all, 'list'] as const,
  /** Page list with parameters */
  list: (params: GetPagesParams) => [...pageKeys.lists(), params] as const,
  /** Specific page details */
  details: () => [...pageKeys.all, 'detail'] as const,
  /** Page details by ID */
  detail: (id: string) => [...pageKeys.details(), id] as const,
};

/**
 * Hook for getting pages list
 *
 * @param params - Request parameters (pagination, search, filters)
 * @param options - React Query options
 * @returns React Query result with pages list
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = usePages({
 *   page: 1,
 *   limit: 20,
 *   status: 'published',
 * });
 * ```
 */
export const usePages = (
  params: GetPagesParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<PageResponse>>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: pageKeys.list(params),
    queryFn: () => getPages(params),
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    ...options,
  });
};

/**
 * Hook for getting page details
 *
 * IMPORTANT: Uses /admin/pages/:id WITHOUT :lang (like versions)
 *
 * @param pageId - Page ID
 * @param options - React Query options
 * @returns React Query result with page details
 *
 * @example
 * ```tsx
 * const { data: page, isLoading } = usePage('page-uuid');
 * ```
 */
export const usePage = (
  pageId: string,
  options?: Omit<UseQueryOptions<PageResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: pageKeys.detail(pageId),
    queryFn: () => getPageById(pageId),
    enabled: !!pageId,
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    ...options,
  });
};

/**
 * Hook for creating a new page
 *
 * @param options - React Query mutation options
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const createMutation = useCreatePage({
 *   onSuccess: (page) => {
 *     router.push(`/admin/en/pages/${page.id}`);
 *   }
 * });
 *
 * createMutation.mutate({
 *   data: {
 *     slug: 'about-us',
 *     title: 'About Us',
 *     content: '# About Us\n\nWe are...',
 *     language: 'en'
 *   },
 *   lang: 'en'
 * });
 * ```
 */
export const useCreatePage = (
  options?: UseMutationOptions<PageResponse, Error, { data: CreatePageRequest; lang?: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, lang = 'en' }) => createPage(data, lang),
    onSuccess: () => {
      // Refetch pages list immediately for update
      queryClient.refetchQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};

/**
 * Hook for updating page
 *
 * @param options - React Query mutation options
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdatePage({
 *   onSuccess: () => {
 *     toast.success('Page updated');
 *   }
 * });
 *
 * updateMutation.mutate({
 *   pageId: 'page-uuid',
 *   data: { title: 'New Title' },
 *   lang: 'en'
 * });
 * ```
 */
export const useUpdatePage = (
  options?: UseMutationOptions<
    PageResponse,
    Error,
    { pageId: string; data: UpdatePageRequest; lang?: string }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, data, lang = 'en' }) => updatePage(pageId, data, lang),
    onSuccess: (_data, variables) => {
      // Refetch page details and list immediately
      queryClient.refetchQueries({ queryKey: pageKeys.detail(variables.pageId) });
      queryClient.refetchQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};

/**
 * Hook for publishing page
 *
 * @param options - React Query mutation options
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const publishMutation = usePublishPage({
 *   onSuccess: () => {
 *     toast.success('Page published');
 *   }
 * });
 *
 * publishMutation.mutate({ pageId: 'page-uuid', lang: 'en' });
 * ```
 */
export const usePublishPage = (
  options?: UseMutationOptions<PageResponse, Error, { pageId: string; lang?: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, lang = 'en' }) => publishPage(pageId, lang),
    onSuccess: (_data, variables) => {
      // Refetch page details and list immediately
      queryClient.refetchQueries({ queryKey: pageKeys.detail(variables.pageId) });
      queryClient.refetchQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};

/**
 * Hook for unpublishing page
 *
 * @param options - React Query mutation options
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const unpublishMutation = useUnpublishPage({
 *   onSuccess: () => {
 *     toast.success('Page unpublished');
 *   }
 * });
 *
 * unpublishMutation.mutate({ pageId: 'page-uuid', lang: 'en' });
 * ```
 */
export const useUnpublishPage = (
  options?: UseMutationOptions<PageResponse, Error, { pageId: string; lang?: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, lang = 'en' }) => unpublishPage(pageId, lang),
    onSuccess: (_data, variables) => {
      // Refetch page details and list immediately
      queryClient.refetchQueries({ queryKey: pageKeys.detail(variables.pageId) });
      queryClient.refetchQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};

/**
 * Hook for deleting page
 *
 * Deletes page from database.
 * After successful execution invalidates pages list cache.
 *
 * @param options - React Query mutation options
 * @returns React Query mutation
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeletePage({
 *   onSuccess: () => {
 *     toast.success('Page deleted successfully');
 *     router.push('/admin/en/pages');
 *   }
 * });
 *
 * deleteMutation.mutate({ pageId: 'page-uuid', lang: 'en' });
 * ```
 */
export const useDeletePage = (
  options?: UseMutationOptions<void, Error, { pageId: string; lang?: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, lang = 'en' }) => deletePage(pageId, lang),
    onSuccess: () => {
      // Refetch pages list immediately after deletion
      queryClient.refetchQueries({ queryKey: pageKeys.lists() });
      // Note: Don't refetch deleted page details
    },
    ...options,
  });
};
