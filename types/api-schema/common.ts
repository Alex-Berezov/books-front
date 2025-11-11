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
export type RoleName = 'user' | 'admin' | 'content_manager';

/**
 * Book version types
 */
export type VersionType = 'text' | 'audio' | 'referral';

/**
 * Publication statuses
 */
export type PublicationStatus = 'draft' | 'published' | 'archived';

/**
 * Page type (according to backend DTO)
 */
export type PageType = 'generic' | 'category_index' | 'author_index';

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
 * Re-export SupportedLang for convenience
 */
export type { SupportedLang };
