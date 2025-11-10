/**
 * CMS Pages Endpoints
 *
 * API эндпоинты для работы со статическими страницами (CMS).
 * Страницы используются для контента типа "О нас", "Политика конфиденциальности",
 * "Условия использования" и других информационных страниц.
 */

import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  CreatePageRequest,
  PageResponse,
  PaginatedResponse,
  UpdatePageRequest,
} from '@/types/api-schema';

/**
 * Параметры для получения списка страниц
 */
export interface GetPagesParams {
  /** Номер страницы (начиная с 1) */
  page?: number;
  /** Количество элементов на странице */
  limit?: number;
  /** Поиск по title или slug */
  search?: string;
  /** Фильтр по статусу публикации */
  status?: 'draft' | 'published' | 'archived';
  /** Язык админ-интерфейса (по умолчанию 'en') */
  lang?: string;
}

/**
 * Получить список всех страниц (для админки)
 *
 * @param params - Параметры запроса
 * @returns Пагинированный список страниц
 *
 * @example
 * ```ts
 * const pages = await getPages({ page: 1, limit: 20, status: 'published', lang: 'en' });
 * ```
 */
export const getPages = async (
  params: GetPagesParams = {}
): Promise<PaginatedResponse<PageResponse>> => {
  const { page = 1, limit = 20, search, status, lang = 'en' } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    queryParams.append('search', search);
  }

  if (status) {
    queryParams.append('status', status);
  }

  const endpoint = `/admin/${lang}/pages?${queryParams.toString()}`;
  const response = await httpGetAuth<PaginatedResponse<PageResponse> | PageResponse[]>(endpoint);

  // Временный workaround: если backend возвращает массив вместо пагинированного ответа,
  // оборачиваем его в правильный формат
  if (Array.isArray(response)) {
    return {
      data: response,
      meta: {
        page,
        limit,
        total: response.length,
        totalPages: Math.ceil(response.length / limit),
      },
    };
  }

  return response;
};

/**
 * Получить детали страницы по ID (admin endpoint)
 *
 * ВАЖНО: Использует /admin/pages/:id БЕЗ :lang (как у versions)
 *
 * @param pageId - ID страницы
 * @returns Детальная информация о странице
 *
 * @example
 * ```ts
 * const page = await getPageById('uuid-here');
 * ```
 */
export const getPageById = async (pageId: string): Promise<PageResponse> => {
  const endpoint = `/admin/pages/${pageId}`;
  return httpGetAuth<PageResponse>(endpoint);
};

/**
 * Создать новую страницу
 *
 * @param data - Данные для создания страницы
 * @param lang - Язык админ-интерфейса (по умолчанию 'en')
 * @returns Созданная страница
 *
 * @example
 * ```ts
 * const page = await createPage({
 *   slug: 'about-us',
 *   title: 'About Us',
 *   content: '# About Us\n\nWe are...',
 *   language: 'en'
 * }, 'en');
 * ```
 */
export const createPage = async (data: CreatePageRequest, lang = 'en'): Promise<PageResponse> => {
  const endpoint = `/admin/${lang}/pages`;
  return httpPostAuth<PageResponse>(endpoint, data);
};

/**
 * Обновить страницу
 *
 * @param pageId - ID страницы
 * @param data - Данные для обновления
 * @param lang - Язык админ-интерфейса (по умолчанию 'en')
 * @returns Обновленная страница
 *
 * @example
 * ```ts
 * const page = await updatePage('uuid-here', {
 *   title: 'Updated Title'
 * }, 'en');
 * ```
 */
export const updatePage = async (
  pageId: string,
  data: UpdatePageRequest,
  lang = 'en'
): Promise<PageResponse> => {
  const endpoint = `/admin/${lang}/pages/${pageId}`;
  return httpPatchAuth<PageResponse>(endpoint, data);
};

/**
 * Опубликовать страницу
 *
 * @param pageId - ID страницы
 * @param lang - Язык админ-интерфейса (по умолчанию 'en')
 * @returns Обновленная страница со статусом published
 *
 * @example
 * ```ts
 * await publishPage('uuid-here', 'en');
 * ```
 */
export const publishPage = async (pageId: string, lang = 'en'): Promise<PageResponse> => {
  const endpoint = `/admin/${lang}/pages/${pageId}/publish`;
  return httpPostAuth<PageResponse>(endpoint);
};

/**
 * Снять страницу с публикации
 *
 * @param pageId - ID страницы
 * @param lang - Язык админ-интерфейса (по умолчанию 'en')
 * @returns Обновленная страница со статусом draft
 *
 * @example
 * ```ts
 * await unpublishPage('uuid-here', 'en');
 * ```
 */
export const unpublishPage = async (pageId: string, lang = 'en'): Promise<PageResponse> => {
  const endpoint = `/admin/${lang}/pages/${pageId}/unpublish`;
  return httpPostAuth<PageResponse>(endpoint);
};

/**
 * Удалить страницу
 *
 * @param pageId - ID страницы для удаления
 * @param lang - Язык админ-интерфейса (по умолчанию 'en')
 *
 * @example
 * ```ts
 * await deletePage('uuid-here', 'en');
 * ```
 */
export const deletePage = async (pageId: string, lang = 'en'): Promise<void> => {
  const endpoint = `/admin/${lang}/pages/${pageId}`;
  return httpDeleteAuth<void>(endpoint);
};
