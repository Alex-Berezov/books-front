/**
 * Books Endpoints
 *
 * API эндпоинты для работы с книгами (контейнерами для версий книг).
 * Книга - это сущность верхнего уровня, которая может содержать
 * несколько версий на разных языках.
 */

import { httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type {
  BookOverview,
  CreateBookRequest,
  CreateBookResponse,
  PaginatedResponse,
} from '@/types/api-schema';

/**
 * Параметры для получения списка книг
 */
export interface GetBooksParams {
  /** Номер страницы (начиная с 1) */
  page?: number;
  /** Количество элементов на странице */
  limit?: number;
  /** Поиск по названию, автору или slug */
  search?: string;
}

/**
 * Получить список всех книг (для админки)
 *
 * @param params - Параметры запроса
 * @returns Пагинированный список книг
 *
 * @example
 * ```ts
 * const books = await getBooks({ page: 1, limit: 20, search: 'tolkien' });
 * ```
 */
export const getBooks = async (
  params: GetBooksParams = {}
): Promise<PaginatedResponse<BookOverview>> => {
  const { page = 1, limit = 20, search } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    queryParams.append('search', search);
  }

  const endpoint = `/books?${queryParams.toString()}`;
  return httpGetAuth<PaginatedResponse<BookOverview>>(endpoint);
};

/**
 * Создать новую книгу (контейнер)
 *
 * @param data - Данные для создания книги
 * @returns Созданная книга
 *
 * @example
 * ```ts
 * const book = await createBook({ slug: 'my-awesome-book' });
 * ```
 */
export const createBook = async (data: CreateBookRequest): Promise<CreateBookResponse> => {
  const endpoint = '/books';
  return httpPostAuth<CreateBookResponse>(endpoint, data);
};
