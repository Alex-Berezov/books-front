/**
 * React Query хуки для работы с книгами (контейнерами)
 *
 * Книга (Book) - это контейнер для разных языковых версий.
 * Каждая версия (BookVersion) содержит контент на определённом языке.
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
 * Хук для создания новой книги (контейнера)
 *
 * @param options - Опции React Query mutation
 * @returns React Query mutation для создания книги
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
      // Инвалидируем список книг после создания
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
    ...options,
  });
};
