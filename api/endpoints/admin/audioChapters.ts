/**
 * Audio Chapters Endpoints
 *
 * API endpoints for audio chapters of a book version. See
 * `books-app-docs/frontend/features/audio-feature/FRONTEND_ITER2_CONTRACT.md` §3 for the full contract.
 *
 * - List/detail admin endpoints are used for draft versions
 *   (`/admin/versions/:id/audio-chapters`, `/admin/audio-chapters/:id`).
 * - Mutations go through the public `/audio-chapters` / `/versions/:id/audio-chapters`
 *   routes — the backend applies role checks automatically.
 */

import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  AudioChapterDetail,
  AudioChaptersListResponse,
  CreateAudioChapterRequest,
  GetAudioChaptersParams,
  ReorderAudioChaptersRequest,
  UpdateAudioChapterRequest,
} from '@/types/api-schema';

/**
 * Get list of audio chapters for a book version (admin).
 *
 * Uses `/admin/versions/:bookVersionId/audio-chapters` so the list works for
 * draft versions too. Results are paginated (page/limit).
 */
export const getAudioChapters = async (
  bookVersionId: string,
  params: GetAudioChaptersParams = {}
): Promise<AudioChaptersListResponse> => {
  const { page = 1, limit = 50 } = params;
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const endpoint = `/admin/versions/${bookVersionId}/audio-chapters?${queryParams.toString()}`;
  return httpGetAuth<AudioChaptersListResponse>(endpoint);
};

/**
 * Get a single audio chapter by ID (admin — independent of version status).
 */
export const getAudioChapter = async (audioChapterId: string): Promise<AudioChapterDetail> => {
  const endpoint = `/admin/audio-chapters/${audioChapterId}`;
  return httpGetAuth<AudioChapterDetail>(endpoint);
};

/**
 * Create a new audio chapter.
 *
 * `POST /versions/:bookVersionId/audio-chapters`.
 */
export const createAudioChapter = async (
  bookVersionId: string,
  data: CreateAudioChapterRequest
): Promise<AudioChapterDetail> => {
  const endpoint = `/versions/${bookVersionId}/audio-chapters`;
  return httpPostAuth<AudioChapterDetail>(endpoint, data);
};

/**
 * Update an audio chapter.
 *
 * `PATCH /audio-chapters/:id`.
 */
export const updateAudioChapter = async (
  audioChapterId: string,
  data: UpdateAudioChapterRequest
): Promise<AudioChapterDetail> => {
  const endpoint = `/audio-chapters/${audioChapterId}`;
  return httpPatchAuth<AudioChapterDetail>(endpoint, data);
};

/**
 * Delete an audio chapter.
 *
 * `DELETE /audio-chapters/:id` → 204. The linked MediaAsset is NOT deleted
 * synchronously — it is cleaned up by the admin orphan-cleanup job.
 */
export const deleteAudioChapter = async (audioChapterId: string): Promise<void> => {
  const endpoint = `/audio-chapters/${audioChapterId}`;
  return httpDeleteAuth<void>(endpoint);
};

/**
 * Reorder audio chapters.
 *
 * `POST /versions/:bookVersionId/audio-chapters/reorder`.
 *
 * The `audioChapterIds` array MUST contain every chapter of the version
 * (and only them) in the desired order; otherwise the backend returns 400.
 */
export const reorderAudioChapters = async (
  bookVersionId: string,
  data: ReorderAudioChaptersRequest
): Promise<AudioChapterDetail[]> => {
  const endpoint = `/versions/${bookVersionId}/audio-chapters/reorder`;
  return httpPostAuth<AudioChapterDetail[]>(endpoint, data);
};
