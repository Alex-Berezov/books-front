/**
 * API Schema Types
 *
 * Временные типы для работы с API до генерации из OpenAPI.
 * TODO (M2): Заменить на автогенерированные типы из production API
 *
 * @see https://api.bibliaris.com/api/docs-json (когда станет доступен)
 */

import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Базовые типы
 */

/** UUID типа string */
export type UUID = string;

/** ISO дата в формате строки */
export type ISODate = string;

/**
 * Роли пользователей
 */
export type RoleName = 'user' | 'admin' | 'content_manager';

/**
 * Типы версий книг
 */
export type VersionType = 'text' | 'audio' | 'referral';

/**
 * Статусы публикации
 */
export type PublicationStatus = 'draft' | 'published' | 'archived';

/**
 * Пагинированный ответ
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Auth endpoints
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: UUID;
    email: string;
    displayName?: string;
    roles: RoleName[];
  };
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * User endpoints
 */

export interface UserMeResponse {
  id: UUID;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  languagePreference?: SupportedLang;
  roles: RoleName[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Books endpoints
 */

export interface BookOverview {
  id: UUID;
  slug: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  rating?: number;
  publicationYear?: number;
  language: SupportedLang;
  categories: Category[];
  tags: Tag[];
  versions: VersionPreview[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Запрос на создание новой книги (контейнера)
 */
export interface CreateBookRequest {
  slug: string;
}

/**
 * Ответ при создании книги
 */
export interface CreateBookResponse {
  id: UUID;
  slug: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface VersionPreview {
  id: UUID;
  type: VersionType;
  title?: string;
  isFree: boolean;
  chaptersCount: number;
  duration?: number; // В секундах для аудио
}

export interface BookVersion {
  id: UUID;
  bookId: UUID;
  type: VersionType;
  title?: string;
  description?: string;
  isFree: boolean;
  status: PublicationStatus;
  chapters: Chapter[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Chapter {
  id: UUID;
  versionId: UUID;
  orderIndex: number;
  title?: string;
  content?: string; // Для text версий
  audioUrl?: string; // Для audio версий
  duration?: number; // В секундах для аудио
  isFree: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Pages (CMS) endpoints
 */

export interface PageResponse {
  id: UUID;
  slug: string;
  title: string;
  content: string;
  language: SupportedLang;
  status: PublicationStatus;
  seo?: SeoData;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Categories endpoints
 */

export interface Category {
  id: UUID;
  slug: string;
  name: string;
  type?: string; // genre|author|popular|etc
  description?: string;
  language: SupportedLang;
  parentId?: UUID | null;
  booksCount?: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Категория с вложенными подкатегориями (для дерева)
 */
export interface CategoryTree extends Category {
  children: CategoryTree[];
}

export interface CategoryBooksResponse extends PaginatedResponse<BookOverview> {
  category: Category;
}

/**
 * Запросы для связывания категорий с версиями книг
 */
export interface AttachCategoryRequest {
  categoryId: UUID;
}

export interface DetachCategoryRequest {
  categoryId: UUID;
}

/**
 * Tags endpoints
 */

export interface Tag {
  id: UUID;
  slug: string;
  name: string;
  language: SupportedLang;
  booksCount?: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface TagBooksResponse extends PaginatedResponse<BookOverview> {
  tag: Tag;
}

/**
 * Запросы для связывания тегов с версиями книг
 */
export interface AttachTagRequest {
  tagId: UUID;
}

export interface DetachTagRequest {
  tagId: UUID;
}

/**
 * SEO endpoints
 */

export interface SeoData {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
}

export interface SeoResolveRequest {
  type: 'book' | 'page' | 'category' | 'tag';
  id: UUID;
}

export interface SeoResolveResponse {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  canonicalUrl: string;
  alternates: Record<SupportedLang, string>;
}

/**
 * Bookshelf endpoints
 */

export interface BookshelfItem {
  id: UUID;
  userId: UUID;
  versionId: UUID;
  version: VersionPreview;
  addedAt: ISODate;
}

export interface AddToBookshelfRequest {
  versionId: UUID;
}

/**
 * Reading progress endpoints
 */

export interface ReadingProgress {
  id: UUID;
  userId: UUID;
  versionId: UUID;
  chapterId?: UUID;
  position: number; // Позиция в главе (offset для текста, секунды для аудио)
  percentage: number; // Процент прочитанного/прослушанного
  lastReadAt: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface UpdateProgressRequest {
  versionId: UUID;
  chapterId?: UUID;
  position: number;
  percentage: number;
}

/**
 * Admin: Book Version Management
 */

/**
 * Детальная информация о версии книги (для админки)
 */
export interface BookVersionDetail {
  id: UUID;
  bookId: UUID;
  language: SupportedLang;
  title: string;
  author: string;
  description?: string;
  coverImageUrl?: string;
  type: VersionType;
  isFree: boolean;
  status: PublicationStatus;
  publishedAt?: ISODate;
  referralUrl?: string;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
  };
  /** Привязанные категории */
  categories?: Category[];
  /** Привязанные теги */
  tags?: Tag[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Запрос на создание новой версии книги
 */
export interface CreateBookVersionRequest {
  /** Язык версии книги */
  language: SupportedLang;
  /** Название книги */
  title: string;
  /** Автор книги */
  author: string;
  /** Описание книги (обязательное) */
  description: string;
  /** URL обложки книги (обязательное) */
  coverImageUrl: string;
  /** Тип версии (текстовая, аудио или реферальная) */
  type: VersionType;
  /** Бесплатная ли версия */
  isFree: boolean;
  /** URL для реферальных ссылок (опционально) */
  referralUrl?: string;
  /** SEO мета-заголовок */
  seoMetaTitle?: string;
  /** SEO мета-описание */
  seoMetaDescription?: string;
}

/**
 * Запрос на обновление версии книги
 */
export interface UpdateBookVersionRequest {
  /** Название книги */
  title?: string;
  /** Автор книги */
  author?: string;
  /** Описание книги */
  description?: string;
  /** URL обложки книги */
  coverImageUrl?: string;
  /** Тип версии (текстовая или аудио) */
  type?: VersionType;
  /** Бесплатная ли версия */
  isFree?: boolean;
  /** URL для реферальных ссылок */
  referralUrl?: string;
  /** SEO мета-заголовок */
  seoMetaTitle?: string;
  /** SEO мета-описание */
  seoMetaDescription?: string;
}

/**
 * Admin: Chapter Management
 */

/**
 * Детальная информация о главе (для админки)
 */
export interface ChapterDetail {
  id: UUID;
  versionId: UUID;
  orderIndex: number;
  title?: string;
  content?: string; // Для text версий (markdown)
  audioUrl?: string; // Для audio версий
  duration?: number; // В секундах для аудио
  isFree: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Запрос на создание новой главы
 */
export interface CreateChapterRequest {
  /** Номер главы в порядке следования */
  orderIndex: number;
  /** Название главы */
  title?: string;
  /** Контент главы (markdown) для текстовых версий */
  content?: string;
  /** URL аудио файла для аудио версий */
  audioUrl?: string;
  /** Длительность в секундах для аудио */
  duration?: number;
  /** Бесплатная ли глава */
  isFree: boolean;
}

/**
 * Запрос на обновление главы
 */
export interface UpdateChapterRequest {
  /** Название главы */
  title?: string;
  /** Контент главы (markdown) */
  content?: string;
  /** URL аудио файла */
  audioUrl?: string;
  /** Длительность в секундах */
  duration?: number;
  /** Бесплатная ли глава */
  isFree?: boolean;
}

/**
 * Запрос на переупорядочивание глав
 */
export interface ReorderChaptersRequest {
  /** Массив ID глав в новом порядке */
  chapterIds: UUID[];
}
