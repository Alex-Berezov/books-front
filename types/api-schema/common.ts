/**
 * Basic types and common API structures
 *
 * Contains reusable types for all API endpoints
 */

import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Basic data types
 */

/** UUID as string type */
export type UUID = string;

/** ISO date in string format */
export type ISODate = string;

/**
 * User roles
 */
export type RoleName = 'user' | 'admin' | 'content_manager' | 'lawyer';

/**
 * Book version types
 */
export type VersionType = 'text' | 'audio' | 'referral';

/**
 * Publication statuses
 */
export type PublicationStatus = 'draft' | 'published';

/**
 * Page type (according to backend DTO)
 */
export type PageType = 'generic' | 'category_index' | 'author_index' | 'homepage';

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated response from API
 *
 * Structure matches real API:
 * - data: array of items
 * - meta: pagination metadata
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Пагинация единой обёртки `{items, pagination}` (`LEGACY-177`, 13.09.2026).
 *
 * Поля те же, что у `PaginationMeta`, но объявлены отдельно: `PaginationMeta` — половина
 * `PaginatedResponse`, которая осталась только внутри составных ответов-страниц
 * (`tags/:slug/books`, `categories/:slug/books`).
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Пагинация с признаком следующей страницы — для бесконечных списков
 * (`GET /users/me/activities`, `GET /me/bookshelf`).
 *
 * `hasNext` бэкенд оставил **внутри** `pagination`, а не рядом с ним: снаружи обёртки
 * у списочного ответа теперь только `items` и `pagination`.
 */
export interface PaginationInfoWithNext extends PaginationInfo {
  hasNext: boolean;
}

/**
 * Единая обёртка списочного ответа: `{ items, pagination }`.
 *
 * Источник формы — `books/src/shared/dto/paginated-response.dto.ts`. Публичные списки на ней
 * с 23.09.2026 (`LEGACY-378`); вне формы — только списки аудиоглав (плоская форма).
 */
export interface PaginatedResult<T, P extends PaginationInfo = PaginationInfo> {
  items: T[];
  pagination: P;
}

/**
 * Import result from JSON import endpoints
 */
export interface ImportResult {
  imported: number;
  updated: number;
  errors: Array<{ key: string; message: string }>;
}

/**
 * Re-export SupportedLang for convenience
 */
export type { SupportedLang };
