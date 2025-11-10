/**
 * React Query хуки для работы с CMS страницами
 *
 * Страница (Page) - это статический контент (About, Privacy Policy, и т.д.)
 * Страницы мультиязычные и имеют статус публикации.
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
} from '@/api/endpoints/admin';
import type {
  CreatePageRequest,
  PageResponse,
  PaginatedResponse,
  UpdatePageRequest,
} from '@/types/api-schema';

/**
 * Query ключи для страниц
 */
export const pageKeys = {
  /** Все запросы страниц */
  all: ['pages'] as const,
  /** Списки страниц */
  lists: () => [...pageKeys.all, 'list'] as const,
  /** Список страниц с параметрами */
  list: (params: GetPagesParams) => [...pageKeys.lists(), params] as const,
  /** Детали конкретной страницы */
  details: () => [...pageKeys.all, 'detail'] as const,
  /** Детали страницы по ID */
  detail: (id: string) => [...pageKeys.details(), id] as const,
};

/**
 * Хук для получения списка страниц
 *
 * @param params - Параметры запроса (пагинация, поиск, фильтры)
 * @param options - Опции React Query
 * @returns React Query результат со списком страниц
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
    ...options,
  });
};

/**
 * Хук для получения деталей страницы
 *
 * ВАЖНО: Использует /admin/pages/:id БЕЗ :lang (как у versions)
 *
 * @param pageId - ID страницы
 * @param options - Опции React Query
 * @returns React Query результат с деталями страницы
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
    ...options,
  });
};

/**
 * Хук для создания новой страницы
 *
 * @param options - Опции React Query mutation
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
      // Инвалидируем список страниц для обновления
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};

/**
 * Хук для обновления страницы
 *
 * @param options - Опции React Query mutation
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
      // Инвалидируем детали страницы и список
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(variables.pageId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};

/**
 * Хук для публикации страницы
 *
 * @param options - Опции React Query mutation
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
      // Инвалидируем детали страницы и список
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(variables.pageId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};

/**
 * Хук для снятия страницы с публикации
 *
 * @param options - Опции React Query mutation
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
      // Инвалидируем детали страницы и список
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(variables.pageId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};

/**
 * Хук для удаления страницы
 *
 * Удаляет страницу из базы данных.
 * После успешного выполнения инвалидирует кэш списка страниц.
 *
 * @param options - Опции React Query mutation
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
    onSuccess: (_data, variables) => {
      // Инвалидируем детали страницы и список
      queryClient.invalidateQueries({ queryKey: pageKeys.detail(variables.pageId) });
      queryClient.invalidateQueries({ queryKey: pageKeys.lists() });
    },
    ...options,
  });
};
