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
  PaginatedResponse,
  ReorderChaptersRequest,
  Tag,
  UpdateBookVersionRequest,
  UpdateChapterRequest,
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
