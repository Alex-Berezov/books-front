/**
 * Types for Chapters endpoints
 *
 * Book chapters, creation, editing, reordering
 */

import type { ISODate, UUID } from './common';

/**
 * Basic chapter information
 */
export interface Chapter {
  id: UUID;
  versionId: UUID;
  orderIndex: number;
  title?: string;
  content?: string; // For text versions
  audioUrl?: string; // For audio versions
  duration?: number; // In seconds for audio
  isFree: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Detailed chapter information (for admin panel)
 */
export interface ChapterDetail {
  id: UUID;
  versionId: UUID;
  orderIndex: number;
  title?: string;
  content?: string; // For text versions (markdown)
  audioUrl?: string; // For audio versions
  duration?: number; // In seconds for audio
  isFree: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Request to create a new chapter
 */
export interface CreateChapterRequest {
  /** Chapter number in order */
  orderIndex: number;
  /** Chapter title */
  title?: string;
  /** Chapter content (markdown) for text versions */
  content?: string;
  /** Audio file URL for audio versions */
  audioUrl?: string;
  /** Duration in seconds for audio */
  duration?: number;
  /** Whether chapter is free */
  isFree: boolean;
}

/**
 * Request to update chapter
 */
export interface UpdateChapterRequest {
  /** Chapter title */
  title?: string;
  /** Chapter content (markdown) */
  content?: string;
  /** Audio file URL */
  audioUrl?: string;
  /** Duration in seconds */
  duration?: number;
  /** Whether chapter is free */
  isFree?: boolean;
}

/**
 * Request to reorder chapters
 */
export interface ReorderChaptersRequest {
  /** Array of chapter IDs in new order */
  chapterIds: UUID[];
}
