/**
 * Bookshelf Endpoints
 *
 * API endpoints for managing the user's personal bookshelf.
 */

import { httpGetAuth, httpPostAuth, httpDeleteAuth } from '@/lib/http-client';
import type { UUID, ISODate } from '@/types/api-schema/common';

export interface BookVersionPreview {
  id: UUID;
  bookId: UUID;
  language: string;
  title: string;
  author: string;
  description: string;
  coverImageUrl: string;
  type: string;
  isFree: boolean;
  chaptersCount: number;
  createdAt: ISODate;
  updatedAt: ISODate;
  book?: {
    id: UUID;
    slug: string;
  };
}

export interface BookshelfItemDto {
  id: UUID;
  addedAt: ISODate;
  bookVersion: BookVersionPreview;
}

export interface BookshelfListResponse {
  items: BookshelfItemDto[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

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
 * @returns The created bookshelf item
 */
export const addToBookshelf = async (versionId: string): Promise<BookshelfItemDto> => {
  const endpoint = `/me/bookshelf/${versionId}`;
  return httpPostAuth<BookshelfItemDto>(endpoint);
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
