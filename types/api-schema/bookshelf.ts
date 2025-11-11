/**
 * Types for Bookshelf and Reading Progress endpoints
 *
 * User library, reading progress
 */

import type { VersionPreview } from './books';
import type { ISODate, UUID } from './common';

/**
 * User bookshelf item
 */
export interface BookshelfItem {
  id: UUID;
  userId: UUID;
  versionId: UUID;
  version: VersionPreview;
  addedAt: ISODate;
}

/**
 * Request to add book to bookshelf
 */
export interface AddToBookshelfRequest {
  versionId: UUID;
}

/**
 * Reading progress
 */
export interface ReadingProgress {
  id: UUID;
  userId: UUID;
  versionId: UUID;
  chapterId?: UUID;
  position: number; // Position in chapter (offset for text, seconds for audio)
  percentage: number; // Percentage read/listened
  lastReadAt: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Request to update reading progress
 */
export interface UpdateProgressRequest {
  versionId: UUID;
  chapterId?: UUID;
  position: number;
  percentage: number;
}
