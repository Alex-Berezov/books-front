/**
 * Типы для Categories endpoints
 *
 * Категории книг, дерево категорий, связывание с книгами
 */

import type { ISODate, PaginatedResponse, SupportedLang, UUID } from './common';

/**
 * Категория книг
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

/**
 * Ответ со списком книг в категории
 *
 * NOTE: Импортируем BookOverview из books.ts в index.ts
 */
export interface CategoryBooksResponse<T = unknown> extends PaginatedResponse<T> {
  category: Category;
}

/**
 * Запрос на привязку категории к версии книги
 */
export interface AttachCategoryRequest {
  categoryId: UUID;
}

/**
 * Запрос на отвязку категории от версии книги
 */
export interface DetachCategoryRequest {
  categoryId: UUID;
}
