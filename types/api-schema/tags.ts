/**
 * Types for Tags endpoints
 *
 * Book tags, linking with books
 */

import type { ISODate, PaginatedResponse, SupportedLang, UUID } from './common';

/**
 * Book tag
 */
export interface Tag {
  id: UUID;
  slug: string;
  name: string;
  language: SupportedLang;
  booksCount?: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Response with list of books with tag
 *
 * NOTE: Import BookOverview from books.ts in index.ts
 */
export interface TagBooksResponse<T = unknown> extends PaginatedResponse<T> {
  tag: Tag;
}

/**
 * Request to attach tag to book version
 */
export interface AttachTagRequest {
  tagId: UUID;
}

/**
 * Request to detach tag from book version
 */
export interface DetachTagRequest {
  tagId: UUID;
}
