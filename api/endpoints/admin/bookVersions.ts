/**
 * Book Versions Endpoints
 *
 * API эндпоинты для работы с версиями книг.
 * Версия книги - это конкретная языковая редакция книги с контентом,
 * главами, категориями и тегами.
 */

import { httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  BookVersionDetail,
  CreateBookVersionRequest,
  UpdateBookVersionRequest,
} from '@/types/api-schema';

/**
 * Получить детали версии книги по ID (admin endpoint)
 *
 * ⚠️ ВАЖНО: Использует admin endpoint `/admin/versions/{id}`,
 * который возвращает версии в ЛЮБОМ статусе (draft, published).
 *
 * Public endpoint `/versions/{id}` возвращает ТОЛЬКО published версии!
 *
 * @param versionId - ID версии книги
 * @returns Детальная информация о версии
 *
 * @example
 * ```ts
 * const version = await getBookVersion('uuid-here');
 * // Работает с черновиками (draft) ✅
 * ```
 */
export const getBookVersion = async (versionId: string): Promise<BookVersionDetail> => {
  const endpoint = `/admin/versions/${versionId}`;
  return httpGetAuth<BookVersionDetail>(endpoint);
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
  return httpPostAuth<BookVersionDetail>(endpoint, data);
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
  return httpPatchAuth<BookVersionDetail>(endpoint, data);
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
  return httpPatchAuth<BookVersionDetail>(endpoint);
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
  return httpPatchAuth<BookVersionDetail>(endpoint);
};
