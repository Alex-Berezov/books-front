/**
 * Базовые типы и общие структуры API
 *
 * Содержит переиспользуемые типы для всех API endpoints
 */

import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Базовые типы данных
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
 * Тип страницы (согласно backend DTO)
 */
export type PageType = 'generic' | 'category_index' | 'author_index';

/**
 * Метаданные пагинации
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Пагинированный ответ от API
 *
 * Структура соответствует реальному API:
 * - data: массив элементов
 * - meta: метаданные пагинации
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Re-export SupportedLang для удобства
 */
export type { SupportedLang };
