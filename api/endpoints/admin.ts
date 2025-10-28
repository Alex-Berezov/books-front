/**
 * Админские эндпоинты API
 *
 * Содержит типизированные функции для работы с административными данными:
 * управление книгами, страницами, категориями и т.д.
 */

import { httpGet } from '@/lib/http';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview, PaginatedResponse } from '@/types/api-schema';

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
  /** Язык для фильтрации */
  language?: SupportedLang;
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
  const { page = 1, limit = 20, search, language } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    queryParams.append('search', search);
  }

  if (language) {
    queryParams.append('language', language);
  }

  const endpoint = `/books?${queryParams.toString()}`;
  return httpGet<PaginatedResponse<BookOverview>>(endpoint, { language });
};
