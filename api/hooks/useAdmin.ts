/**
 * React Query хуки для админки
 *
 * Содержит хуки для работы с административными данными через React Query
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
  getBooks,
  getBookVersion,
  publishVersion,
  unpublishVersion,
  updateBookVersion,
  type GetBooksParams,
} from '@/api/endpoints/admin';
import type {
  BookOverview,
  BookVersionDetail,
  CreateBookVersionRequest,
  PaginatedResponse,
  UpdateBookVersionRequest,
} from '@/types/api-schema';

/**
 * Query ключи для книг
 */
export const bookKeys = {
  /** Все запросы книг */
  all: ['books'] as const,
  /** Списки книг */
  lists: () => [...bookKeys.all, 'list'] as const,
  /** Список книг с параметрами */
  list: (params: GetBooksParams) => [...bookKeys.lists(), params] as const,
  /** Детали конкретной книги */
  details: () => [...bookKeys.all, 'detail'] as const,
  /** Детали книги по ID */
  detail: (id: string) => [...bookKeys.details(), id] as const,
};

/**
 * Query ключи для версий книг
 */
export const versionKeys = {
  /** Все запросы версий */
  all: ['versions'] as const,
  /** Детали версий */
  details: () => [...versionKeys.all, 'detail'] as const,
  /** Детали версии по ID */
  detail: (id: string) => [...versionKeys.details(), id] as const,
};

/**
 * Хук для получения списка книг
 *
 * @param params - Параметры запроса (пагинация, поиск, фильтры)
 * @param options - Опции React Query
 * @returns React Query результат со списком книг
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
    staleTime: 5 * 60 * 1000, // 5 минут
    ...options,
  });
};

/**
 * Хук для получения детальной информации о версии книги
 *
 * @param versionId - ID версии книги
 * @param options - Опции React Query
 * @returns React Query результат с деталями версии
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
    staleTime: 5 * 60 * 1000, // 5 минут
    ...options,
  });
};

/**
 * Хук для создания новой версии книги
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для создания версии
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
      // Инвалидируем список книг для обновления
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
      // Устанавливаем данные версии в кэш
      queryClient.setQueryData(versionKeys.detail(data.id), data);
    },
    ...options,
  });
};

/**
 * Хук для обновления существующей версии книги
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для обновления версии
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
      // Обновляем данные версии в кэше
      queryClient.setQueryData(versionKeys.detail(variables.versionId), data);
      // Инвалидируем список книг
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
    ...options,
  });
};

/**
 * Хук для публикации версии книги
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для публикации
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
      // Обновляем данные версии в кэше
      queryClient.setQueryData(versionKeys.detail(versionId), data);
      // Инвалидируем список книг
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
    ...options,
  });
};

/**
 * Хук для снятия версии с публикации
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для снятия с публикации
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
      // Обновляем данные версии в кэше
      queryClient.setQueryData(versionKeys.detail(versionId), data);
      // Инвалидируем список книг
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
    ...options,
  });
};
