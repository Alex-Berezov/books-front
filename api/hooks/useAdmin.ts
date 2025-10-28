/**
 * React Query хуки для админки
 *
 * Содержит хуки для работы с административными данными через React Query
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getBooks, type GetBooksParams } from '@/api/endpoints/admin';
import type { BookOverview, PaginatedResponse } from '@/types/api-schema';

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
