/**
 * Books Endpoints
 *
 * API endpoints for working with books (containers for book versions).
 * Book is a top-level entity that can contain
 * multiple versions in different languages.
 */

import { httpGetAuth, httpPostAuth } from '@/lib/http-client';
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
  /** Search by title, author or slug */
  search?: string;
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
  const { page = 1, limit = 20, search } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    queryParams.append('search', search);
  }

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
