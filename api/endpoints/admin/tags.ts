/**
 * Tags Endpoints
 *
 * API эндпоинты для работы с тегами.
 * Теги используются для простой классификации книг без иерархии
 * (например, "мотивация", "бизнес", "саморазвитие").
 */

import { httpDeleteAuth, httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type { AttachTagRequest, PaginatedResponse, Tag } from '@/types/api-schema';

/**
 * Параметры для получения списка тегов
 */
export interface GetTagsParams {
  /** Номер страницы (начиная с 1) */
  page?: number;
  /** Количество элементов на странице */
  limit?: number;
  /** Поиск по названию */
  search?: string;
}

/**
 * Получить список тегов
 *
 * @param params - Параметры запроса
 * @returns Пагинированный список тегов
 *
 * @example
 * ```ts
 * const tags = await getTags({ page: 1, limit: 50, search: 'motiv' });
 * ```
 */
export const getTags = async (params: GetTagsParams = {}): Promise<PaginatedResponse<Tag>> => {
  const { page = 1, limit = 50, search } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    queryParams.append('search', search);
  }

  const endpoint = `/tags?${queryParams.toString()}`;
  return httpGetAuth<PaginatedResponse<Tag>>(endpoint);
};

/**
 * Привязать тег к версии книги
 *
 * @param versionId - ID версии книги
 * @param tagId - ID тега
 *
 * @example
 * ```ts
 * await attachTag('version-uuid', 'tag-uuid');
 * ```
 */
export const attachTag = async (versionId: string, tagId: string): Promise<void> => {
  const endpoint = `/versions/${versionId}/tags`;
  const data: AttachTagRequest = { tagId };
  return httpPostAuth<void>(endpoint, data);
};

/**
 * Отвязать тег от версии книги
 *
 * @param versionId - ID версии книги
 * @param tagId - ID тега
 *
 * @example
 * ```ts
 * await detachTag('version-uuid', 'tag-uuid');
 * ```
 */
export const detachTag = async (versionId: string, tagId: string): Promise<void> => {
  const endpoint = `/versions/${versionId}/tags/${tagId}`;
  return httpDeleteAuth<void>(endpoint);
};
