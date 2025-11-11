/**
 * Admin Endpoints Barrel Export
 *
 * Central import point for all administrative endpoints.
 * Allows importing any endpoint from '@/api/endpoints/admin'
 * instead of specifying the specific file.
 *
 * @example
 * ```ts
 * // Instead of:
 * import { getBooks } from '@/api/endpoints/admin/books';
 * import { getBookVersion } from '@/api/endpoints/admin/bookVersions';
 *
 * // You can:
 * import { getBooks, getBookVersion } from '@/api/endpoints/admin';
 * ```
 */

// Books Domain
export * from './books';
export type { GetBooksParams } from './books';

// Book Versions Domain
export * from './bookVersions';

// Chapters Domain
export * from './chapters';

// Categories Domain
export * from './categories';
export type { GetCategoriesParams } from './categories';

// Tags Domain
export * from './tags';
export type { GetTagsParams } from './tags';

// CMS Pages Domain
export * from './pages';
export type { GetPagesParams } from './pages';
