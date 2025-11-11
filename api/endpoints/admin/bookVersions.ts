/**
 * Book Versions Endpoints
 *
 * API endpoints for working with book versions.
 * Book version is a specific language edition of a book with content,
 * chapters, categories and tags.
 */

import { httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  BookVersionDetail,
  CreateBookVersionRequest,
  UpdateBookVersionRequest,
} from '@/types/api-schema';

/**
 * Get book version details by ID (admin endpoint)
 *
 * ⚠️ IMPORTANT: Uses admin endpoint `/admin/versions/{id}`,
 * which returns versions in ANY status (draft, published).
 *
 * Public endpoint `/versions/{id}` returns ONLY published versions!
 *
 * @param versionId - Book version ID
 * @returns Detailed information about the version
 *
 * @example
 * ```ts
 * const version = await getBookVersion('uuid-here');
 * // Works with drafts ✅
 * ```
 */
export const getBookVersion = async (versionId: string): Promise<BookVersionDetail> => {
  const endpoint = `/admin/versions/${versionId}`;
  return httpGetAuth<BookVersionDetail>(endpoint);
};

/**
 * Create a new book version
 *
 * @param bookId - Book ID
 * @param data - Data for creating the version
 * @returns Created book version
 *
 * @example
 * ```ts
 * const version = await createBookVersion('book-uuid', {
 *   language: 'en',
 *   title: 'Harry Potter',
 *   author: 'J.K. Rowling',
 *   type: 'text',
 *   isFree: true
 * });
 * ```
 */
export const createBookVersion = async (
  bookId: string,
  data: CreateBookVersionRequest
): Promise<BookVersionDetail> => {
  const endpoint = `/books/${bookId}/versions`;
  return httpPostAuth<BookVersionDetail>(endpoint, data);
};

/**
 * Update existing book version
 *
 * @param versionId - Book version ID
 * @param data - Data for update
 * @returns Updated book version
 *
 * @example
 * ```ts
 * const version = await updateBookVersion('version-uuid', {
 *   title: 'Updated Title',
 *   description: 'New description'
 * });
 * ```
 */
export const updateBookVersion = async (
  versionId: string,
  data: UpdateBookVersionRequest
): Promise<BookVersionDetail> => {
  const endpoint = `/versions/${versionId}`;
  return httpPatchAuth<BookVersionDetail>(endpoint, data);
};

/**
 * Publish book version
 *
 * @param versionId - Book version ID
 * @returns Published version
 *
 * @example
 * ```ts
 * const version = await publishVersion('version-uuid');
 * ```
 */
export const publishVersion = async (versionId: string): Promise<BookVersionDetail> => {
  const endpoint = `/versions/${versionId}/publish`;
  return httpPatchAuth<BookVersionDetail>(endpoint);
};

/**
 * Unpublish book version (return to draft)
 *
 * @param versionId - Book version ID
 * @returns Version with draft status
 *
 * @example
 * ```ts
 * const version = await unpublishVersion('version-uuid');
 * ```
 */
export const unpublishVersion = async (versionId: string): Promise<BookVersionDetail> => {
  const endpoint = `/versions/${versionId}/unpublish`;
  return httpPatchAuth<BookVersionDetail>(endpoint);
};
