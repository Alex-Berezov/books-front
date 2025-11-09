/**
 * Админские эндпоинты API
 *
 * Содержит типизированные функции для работы с административными данными:
 * управление книгами, страницами, категориями и т.д.
 *
 * Все функции автоматически добавляют JWT токен из NextAuth сессии.
 */

import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  AttachCategoryRequest,
  AttachTagRequest,
  BookOverview,
  BookVersionDetail,
  Category,
  CategoryTree,
  ChapterDetail,
  CreateBookRequest,
  CreateBookResponse,
  CreateBookVersionRequest,
  CreateChapterRequest,
  CreatePageRequest,
  PageResponse,
  PaginatedResponse,
  ReorderChaptersRequest,
  Tag,
  UpdateBookVersionRequest,
  UpdateChapterRequest,
  UpdatePageRequest,
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

/**
 * ===========================
 * Chapter Management
 * ===========================
 */

/**
 * Получить список глав версии книги
 *
 * @param versionId - ID версии книги
 * @returns Массив глав
 *
 * @example
 * ```ts
 * const chapters = await getChapters('version-uuid');
 * ```
 */
export const getChapters = async (versionId: string): Promise<ChapterDetail[]> => {
  const endpoint = `/versions/${versionId}/chapters`;
  return httpGetAuth<ChapterDetail[]>(endpoint);
};

/**
 * Создать новую главу
 *
 * @param versionId - ID версии книги
 * @param data - Данные новой главы
 * @returns Созданная глава
 *
 * @example
 * ```ts
 * const chapter = await createChapter('version-uuid', {
 *   orderIndex: 1,
 *   title: 'Introduction',
 *   content: '# Chapter 1\n\nContent...',
 *   isFree: true
 * });
 * ```
 */
export const createChapter = async (
  versionId: string,
  data: CreateChapterRequest
): Promise<ChapterDetail> => {
  const endpoint = `/versions/${versionId}/chapters`;
  return httpPostAuth<ChapterDetail>(endpoint, data);
};

/**
 * Обновить главу
 *
 * @param chapterId - ID главы
 * @param data - Новые данные главы
 * @returns Обновленная глава
 *
 * @example
 * ```ts
 * const chapter = await updateChapter('chapter-uuid', {
 *   title: 'Updated Title',
 *   content: 'New content...'
 * });
 * ```
 */
export const updateChapter = async (
  chapterId: string,
  data: UpdateChapterRequest
): Promise<ChapterDetail> => {
  const endpoint = `/chapters/${chapterId}`;
  return httpPatchAuth<ChapterDetail>(endpoint, data);
};

/**
 * Удалить главу
 *
 * @param chapterId - ID главы
 *
 * @example
 * ```ts
 * await deleteChapter('chapter-uuid');
 * ```
 */
export const deleteChapter = async (chapterId: string): Promise<void> => {
  const endpoint = `/chapters/${chapterId}`;
  return httpDeleteAuth<void>(endpoint);
};

/**
 * Переупорядочить главы
 *
 * @param versionId - ID версии книги
 * @param data - Новый порядок глав
 * @returns Массив глав в новом порядке
 *
 * @example
 * ```ts
 * const chapters = await reorderChapters('version-uuid', {
 *   chapterIds: ['chapter-3', 'chapter-1', 'chapter-2']
 * });
 * ```
 */
export const reorderChapters = async (
  versionId: string,
  data: ReorderChaptersRequest
): Promise<ChapterDetail[]> => {
  const endpoint = `/versions/${versionId}/chapters/reorder`;
  return httpPostAuth<ChapterDetail[]>(endpoint, data);
};

/**
 * ========================================
 * Categories API
 * ========================================
 */

/**
 * Параметры для получения списка категорий
 */
export interface GetCategoriesParams {
  /** Номер страницы (начиная с 1) */
  page?: number;
  /** Количество элементов на странице */
  limit?: number;
  /** Поиск по названию */
  search?: string;
}

/**
 * Получить список категорий
 *
 * @param params - Параметры запроса
 * @returns Пагинированный список категорий
 *
 * @example
 * ```ts
 * const categories = await getCategories({ page: 1, limit: 50 });
 * ```
 */
export const getCategories = async (
  params: GetCategoriesParams = {}
): Promise<PaginatedResponse<Category>> => {
  const { page = 1, limit = 50, search } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    queryParams.append('search', search);
  }

  const endpoint = `/categories?${queryParams.toString()}`;
  return httpGetAuth<PaginatedResponse<Category>>(endpoint);
};

/**
 * Получить дерево категорий
 *
 * @returns Иерархическое дерево категорий
 *
 * @example
 * ```ts
 * const tree = await getCategoriesTree();
 * ```
 */
export const getCategoriesTree = async (): Promise<CategoryTree[]> => {
  const endpoint = `/categories/tree`;
  return httpGetAuth<CategoryTree[]>(endpoint);
};

/**
 * Привязать категорию к версии книги
 *
 * @param versionId - ID версии книги
 * @param categoryId - ID категории
 *
 * @example
 * ```ts
 * await attachCategory('version-uuid', 'category-uuid');
 * ```
 */
export const attachCategory = async (versionId: string, categoryId: string): Promise<void> => {
  const endpoint = `/versions/${versionId}/categories`;
  const data: AttachCategoryRequest = { categoryId };
  return httpPostAuth<void>(endpoint, data);
};

/**
 * Отвязать категорию от версии книги
 *
 * @param versionId - ID версии книги
 * @param categoryId - ID категории
 *
 * @example
 * ```ts
 * await detachCategory('version-uuid', 'category-uuid');
 * ```
 */
export const detachCategory = async (versionId: string, categoryId: string): Promise<void> => {
  const endpoint = `/versions/${versionId}/categories/${categoryId}`;
  return httpDeleteAuth<void>(endpoint);
};

/**
 * ========================================
 * Tags API
 * ========================================
 */

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

/**
 * ========================================
 * CMS Pages Endpoints
 * ========================================
 */

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
