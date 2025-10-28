/**
 * Админские эндпоинты API
 *
 * Содержит типизированные функции для работы с административными данными:
 * управление книгами, страницами, категориями и т.д.
 */

import { httpGet, httpPost, httpPatch } from '@/lib/http';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  BookOverview,
  BookVersionDetail,
  CreateBookVersionRequest,
  PaginatedResponse,
  UpdateBookVersionRequest,
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

/**
 * Получить детали версии книги по ID
 *
 * @param versionId - ID версии книги
 * @returns Детальная информация о версии
 *
 * @example
 * ```ts
 * const version = await getBookVersion('uuid-here');
 * ```
 */
export const getBookVersion = async (versionId: string): Promise<BookVersionDetail> => {
  const endpoint = `/versions/${versionId}`;
  return httpGet<BookVersionDetail>(endpoint);
};

/**
 * Создать новую версию книги
 *
 * @param bookId - ID книги
 * @param data - Данные для создания версии
 * @returns Созданная версия книги
 *
 * @example
 * ```ts
 * const version = await createBookVersion('book-uuid', {
 *   language: 'en',
 *   title: 'Harry Potter',
 *   author: 'J.K. Rowling',
 *   type: 'text',
 *   isFree: true
 * });
 * ```
 */
export const createBookVersion = async (
  bookId: string,
  data: CreateBookVersionRequest
): Promise<BookVersionDetail> => {
  const endpoint = `/books/${bookId}/versions`;
  return httpPost<BookVersionDetail>(endpoint, data);
};

/**
 * Обновить существующую версию книги
 *
 * @param versionId - ID версии книги
 * @param data - Данные для обновления
 * @returns Обновлённая версия книги
 *
 * @example
 * ```ts
 * const version = await updateBookVersion('version-uuid', {
 *   title: 'Updated Title',
 *   description: 'New description'
 * });
 * ```
 */
export const updateBookVersion = async (
  versionId: string,
  data: UpdateBookVersionRequest
): Promise<BookVersionDetail> => {
  const endpoint = `/versions/${versionId}`;
  return httpPatch<BookVersionDetail>(endpoint, data);
};

/**
 * Опубликовать версию книги
 *
 * @param versionId - ID версии книги
 * @returns Опубликованная версия
 *
 * @example
 * ```ts
 * const version = await publishVersion('version-uuid');
 * ```
 */
export const publishVersion = async (versionId: string): Promise<BookVersionDetail> => {
  const endpoint = `/versions/${versionId}/publish`;
  return httpPatch<BookVersionDetail>(endpoint);
};

/**
 * Снять с публикации версию книги (вернуть в draft)
 *
 * @param versionId - ID версии книги
 * @returns Версия со статусом draft
 *
 * @example
 * ```ts
 * const version = await unpublishVersion('version-uuid');
 * ```
 */
export const unpublishVersion = async (versionId: string): Promise<BookVersionDetail> => {
  const endpoint = `/versions/${versionId}/unpublish`;
  return httpPatch<BookVersionDetail>(endpoint);
};
