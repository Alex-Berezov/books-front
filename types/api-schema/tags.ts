/**
 * Типы для Tags endpoints
 *
 * Теги книг, связывание с книгами
 */

import type { ISODate, PaginatedResponse, SupportedLang, UUID } from './common';

/**
 * Тег книги
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

/**
 * Ответ со списком книг с тегом
 *
 * NOTE: Импортируем BookOverview из books.ts в index.ts
 */
export interface TagBooksResponse<T = unknown> extends PaginatedResponse<T> {
  tag: Tag;
}

/**
 * Запрос на привязку тега к версии книги
 */
export interface AttachTagRequest {
  tagId: UUID;
}

/**
 * Запрос на отвязку тега от версии книги
 */
export interface DetachTagRequest {
  tagId: UUID;
}
