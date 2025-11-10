/**
 * Типы для Books endpoints
 *
 * Книги, версии, контейнеры книг
 */

import type { Category } from './categories';
import type { Chapter } from './chapters';
import type { ISODate, PublicationStatus, SupportedLang, UUID, VersionType } from './common';
import type { Tag } from './tags';

/**
 * Превью версии книги
 */
export interface VersionPreview {
  id: UUID;
  type: VersionType;
  title?: string;
  isFree: boolean;
  chaptersCount: number;
  duration?: number; // В секундах для аудио
}

/**
 * Обзорная информация о книге
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

/**
 * Версия книги
 */
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
