/**
 * Bookshelf Endpoints
 *
 * API endpoints for managing the user's personal bookshelf.
 */

import { httpGetAuth, httpPostAuth, httpDeleteAuth } from '@/lib/http-client';
import type { BookshelfEntry, BookshelfListResponse } from '@/types/api-schema';

/**
 * List user's bookshelf
 *
 * @param page - Page number
 * @param limit - Page size limit
 * @returns Paginated bookshelf items
 */
export const getBookshelf = async (page = 1, limit = 10): Promise<BookshelfListResponse> => {
  const endpoint = `/me/bookshelf?page=${page}&limit=${limit}`;
  return httpGetAuth<BookshelfListResponse>(endpoint);
};

/**
 * Add a book version to the user's bookshelf
 *
 * @param versionId - Book version ID
 * @returns The created bookshelf row — связь, а не элемент списка полки
 */
export const addToBookshelf = async (versionId: string): Promise<BookshelfEntry> => {
  const endpoint = `/me/bookshelf/${versionId}`;
  return httpPostAuth<BookshelfEntry>(endpoint);
};

/**
 * Remove a book version from the user's bookshelf
 *
 * @param versionId - Book version ID
 */
export const removeFromBookshelf = async (versionId: string): Promise<void> => {
  const endpoint = `/me/bookshelf/${versionId}`;
  return httpDeleteAuth<void>(endpoint);
};
