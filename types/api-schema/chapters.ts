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
  /**
   * Именно `bookVersionId`: так называется колонка модели `Chapter`
   * (`books/prisma/schema.prisma`), и так её отдаёт `ChapterResponseDto`.
   * До 10.09.2026 здесь стоял выдуманный `versionId`.
   */
  bookVersionId: UUID;
  number: number;
  title?: string;
  /** Chapter content (markdown) */
  content?: string;
  createdAt: ISODate;
}

/**
 * Detailed chapter information (for admin panel)
 */
export interface ChapterDetail {
  id: UUID;
  /**
   * Именно `bookVersionId`: так называется колонка модели `Chapter`
   * (`books/prisma/schema.prisma`), и так её отдаёт `ChapterResponseDto`.
   * До 10.09.2026 здесь стоял выдуманный `versionId`.
   */
  bookVersionId: UUID;
  number: number;
  title?: string;
  /** Chapter content (markdown) */
  content?: string;
  createdAt: ISODate;
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
