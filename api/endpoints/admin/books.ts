/**
 * Books Endpoints
 *
 * API endpoints for working with books (containers for book versions).
 * Book is a top-level entity that can contain
 * multiple versions in different languages.
 */

import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  BookOverview,
  CreateBookRequest,
  CreateBookResponse,
  PaginatedResponse,
} from '@/types/api-schema';

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
  return httpGetAuth<PaginatedResponse<BookOverview>>(endpoint);
};

/**
 * Create a new book (container)
 *
 * @param data - Data for creating the book
 * @returns Created book
 *
 * @example
 * ```ts
 * const book = await createBook({ slug: 'my-awesome-book' });
 * ```
 */
export const createBook = async (data: CreateBookRequest): Promise<CreateBookResponse> => {
  const endpoint = '/books';
  return httpPostAuth<CreateBookResponse>(endpoint, data);
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
export const getBook = async (bookId: string): Promise<BookOverview> => {
  const endpoint = `/books/${bookId}`;
  return httpGetAuth<BookOverview>(endpoint);
};
