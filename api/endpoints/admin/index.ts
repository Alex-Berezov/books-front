/**
 * Admin Endpoints Barrel Export
 *
 * Центральная точка импорта для всех административных эндпоинтов.
 * Позволяет импортировать любой эндпоинт из '@/api/endpoints/admin'
 * вместо указания конкретного файла.
 *
 * @example
 * ```ts
 * // Вместо:
 * import { getBooks } from '@/api/endpoints/admin/books';
 * import { getBookVersion } from '@/api/endpoints/admin/bookVersions';
 *
 * // Можно:
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
