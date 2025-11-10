/**
 * Типы для Chapters endpoints
 *
 * Главы книг, создание, редактирование, переупорядочивание
 */

import type { ISODate, UUID } from './common';

/**
 * Базовая информация о главе
 */
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
