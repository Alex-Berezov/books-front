/**
 * Types for Chapters endpoints
 *
 * Text chapters of a book version. Audio chapters live in a separate entity —
 * see `./audioChapters.ts`.
 */

import type { ISODate, UUID } from './common';

/**
 * Basic chapter information
 */
export interface Chapter {
  id: UUID;
  versionId: UUID;
  number: number;
  title?: string;
  /** Chapter content (markdown) */
  content?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Detailed chapter information (for admin panel)
 */
export interface ChapterDetail {
  id: UUID;
  versionId: UUID;
  number: number;
  title?: string;
  /** Chapter content (markdown) */
  content?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Request to create a new chapter
 */
export interface CreateChapterRequest {
  /** Chapter number in order */
  number: number;
  /** Chapter title */
  title?: string;
  /** Chapter content (markdown) */
  content?: string;
}

/**
 * Request to update chapter
 */
export interface UpdateChapterRequest {
  /** Chapter number in order */
  number?: number;
  /** Chapter title */
  title?: string;
  /** Chapter content (markdown) */
  content?: string;
}

/**
 * Request to reorder chapters
 */
export interface ReorderChaptersRequest {
  /** Array of chapter IDs in new order */
  chapterIds: UUID[];
}
