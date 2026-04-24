/**
 * Types for Audio Chapters endpoints
 *
 * Audio chapters of a book version. Each audio chapter = one audio file from
 * the media library. Chapters are ordered by `number` (unique within a
 * `bookVersionId`).
 *
 * Backend contract: see `books-app-docs/frontend/features/audio-feature/FRONTEND_ITER2_CONTRACT.md` §3.
 */

import type { ISODate, UUID } from './common';

/**
 * Audio chapter entity returned by the API
 */
export interface AudioChapter {
  id: UUID;
  bookVersionId: UUID;
  /** Chapter order, integer >= 1, unique within the version */
  number: number;
  /** Chapter title, 1..255 chars */
  title: string;
  /** Public URL of the audio file (http/https) */
  audioUrl: string;
  /** FK to MediaAsset.id (when the file was uploaded through the media library) */
  mediaId: UUID | null;
  /** Duration in seconds, 0..86400 */
  duration: number;
  /** Short description, <= 5000 chars */
  description: string | null;
  /** Full transcript text (no hard length limit) */
  transcript: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Detailed audio chapter (admin). Currently identical to {@link AudioChapter};
 * kept separate so the admin/public shapes can diverge without breaking consumers.
 */
export type AudioChapterDetail = AudioChapter;

/**
 * Paginated list response for audio chapters
 *
 * Matches the backend response shape: `{ items, total, page, limit }`.
 */
export interface AudioChaptersListResponse {
  items: AudioChapter[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Query parameters for listing audio chapters
 */
export interface GetAudioChaptersParams {
  /** Page number, >= 1 (default 1) */
  page?: number;
  /** Page size, 1..100 (default 50) */
  limit?: number;
}

/**
 * Request body for creating a new audio chapter
 *
 * `POST /versions/:bookVersionId/audio-chapters`
 */
export interface CreateAudioChapterRequest {
  /** Integer >= 1, must be unique within the version */
  number: number;
  /** 1..255 chars */
  title: string;
  /** http(s) URL to the audio file */
  audioUrl: string;
  /** Optional FK to MediaAsset */
  mediaId?: UUID | null;
  /** Seconds, 0..86400 */
  duration: number;
  /** Optional short description, <= 5000 chars */
  description?: string | null;
  /** Optional full transcript */
  transcript?: string | null;
}

/**
 * Request body for updating an audio chapter
 *
 * `PATCH /audio-chapters/:id`
 *
 * All fields are optional; only provided ones are updated.
 */
export interface UpdateAudioChapterRequest {
  number?: number;
  title?: string;
  audioUrl?: string;
  mediaId?: UUID | null;
  duration?: number;
  description?: string | null;
  transcript?: string | null;
}

/**
 * Request body for bulk reordering audio chapters
 *
 * `POST /versions/:bookVersionId/audio-chapters/reorder`
 *
 * The array MUST contain all chapter IDs of the version (and only them) in the
 * desired order. The backend assigns `number` starting from 1 atomically.
 */
export interface ReorderAudioChaptersRequest {
  audioChapterIds: UUID[];
}
