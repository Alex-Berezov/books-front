/**
 * Books Endpoints
 *
 * API endpoints for working with books (containers for book versions).
 * Book is a top-level entity that can contain
 * multiple versions in different languages.
 */

import { httpDeleteAuth, httpGetAuth, httpPatchAuth } from '@/lib/http-client';
import type { BookOverview, CreateBookResponse, PaginatedResponse } from '@/types/api-schema';

/**
 * Parameters for fetching books list
 */
export interface GetBooksParams {
  /** Page number (starting from 1) */
  page?: number;
  /** Number of items per page */
  limit?: number;
}

/**
 * Get list of all books (for admin panel)
 *
 * @param params - Request parameters
 * @returns Paginated list of books
 *
 * @example
 * ```ts
 * const books = await getBooks({ page: 1, limit: 20, search: 'tolkien' });
 * ```
 */
export const getBooks = async (
  params: GetBooksParams = {}
): Promise<PaginatedResponse<BookOverview>> => {
  const { page = 1, limit = 20 } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const endpoint = `/books?${queryParams.toString()}`;
  // ⚠️ Токен обязателен с 10.08.2026: маршрут админский и показывает черновики
  // (`LEGACY-093`). Публичной витрине нужен `getPublicBooks` — `/:lang/books`.
  return httpGetAuth<PaginatedResponse<BookOverview>>(endpoint);
};

/**
 * Delete a book (container) by ID
 *
 * @param bookId - ID of the book to delete
 * @returns void
 *
 * @example
 * ```ts
 * await deleteBook('book-uuid-123');
 * ```
 */
export const deleteBook = async (bookId: string): Promise<void> => {
  const endpoint = `/books/${bookId}`;
  return httpDeleteAuth<void>(endpoint);
};

/**
 * Update book data (e.g., slug)
 *
 * @param bookId - ID of the book to update
 * @param data - Update data
 * @returns Updated book
 *
 * @example
 * ```ts
 * const book = await updateBook('book-uuid-123', { slug: 'new-slug' });
 * ```
 */
export const updateBook = async (
  bookId: string,
  data: { slug: string }
): Promise<CreateBookResponse> => {
  const endpoint = `/books/${bookId}`;
  return httpPatchAuth<CreateBookResponse>(endpoint, data);
};

/**
 * Get book details by ID
 *
 * @param bookId - ID of the book
 * @returns Book details including versions
 *
 * @example
 * ```ts
 * const book = await getBook('book-uuid-123');
 * ```
 */
/**
 * ⚠️ `optionalAuth`, а не `requireAuth: false`. Тот же адрес обслуживает
 * публичный запрос и админский переключатель версий. С 11.08.2026 черновые
 * версии приходят только по токену модератора (`LEGACY-090`); без него редактор
 * увидел бы книгу без своего неопубликованного перевода — и решил бы, что тот
 * пропал.
 */
export const getBook = async (bookId: string): Promise<BookOverview> => {
  const endpoint = `/books/${bookId}`;
  return httpGetAuth<BookOverview>(endpoint, { optionalAuth: true });
};

/**
 * Get all unique themes across all books.
 */
export const getThemes = async (): Promise<string[]> => {
  return httpGetAuth<string[]>('/books/themes');
};
