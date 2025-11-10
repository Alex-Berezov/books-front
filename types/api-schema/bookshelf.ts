/**
 * Типы для Bookshelf и Reading Progress endpoints
 *
 * Библиотека пользователя, прогресс чтения
 */

import type { VersionPreview } from './books';
import type { ISODate, UUID } from './common';

/**
 * Элемент библиотеки пользователя
 */
export interface BookshelfItem {
  id: UUID;
  userId: UUID;
  versionId: UUID;
  version: VersionPreview;
  addedAt: ISODate;
}

/**
 * Запрос на добавление книги в библиотеку
 */
export interface AddToBookshelfRequest {
  versionId: UUID;
}

/**
 * Прогресс чтения
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

/**
 * Запрос на обновление прогресса чтения
 */
export interface UpdateProgressRequest {
  versionId: UUID;
  chapterId?: UUID;
  position: number;
  percentage: number;
}
