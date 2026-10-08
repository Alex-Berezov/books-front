/**
 * Audio Chapters Endpoints
 *
 * API endpoints for audio chapters of a book version. See
 * `books-app-docs/ai-context/api-contracts.md` («Chapters / Audio Chapters / Summaries») for the full contract.
 *
 * - List/detail admin endpoints are used for draft versions
 *   (`/admin/versions/:id/audio-chapters`, `/admin/audio-chapters/:id`).
 * - Mutations go through the public `/audio-chapters` / `/versions/:id/audio-chapters`
 *   routes — the backend applies role checks automatically.
 */

import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import { API_MAX_PAGE_SIZE } from '@/lib/http.constants';
import { fetchAllPages } from '@/lib/sitemap/utils';
import { ApiError } from '@/types/api';
import type {
  AudioChapter,
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

/** Shown when the walk itself fails: a cut page, a short walk, a malformed page, too many pages. */
const INCOMPLETE_LIST_MESSAGE = 'the audio chapter list could not be loaded in full, try again';

/**
 * Get every audio chapter of a book version (admin) by walking all pages.
 *
 * The admin tab needs the whole list: the next chapter number is derived from it,
 * and a first page of 50 would hand out an already taken number (LEGACY-441).
 * The walk is the shared `fetchAllPages`: a cut page or a short walk throws instead of
 * returning a partial list, and a failed page is retried once. Items are de-duplicated by id:
 * a chapter added while the pages are walked shifts the offsets and can repeat one, so
 * completeness is checked again on the unique rows. The walk's own diagnostics are internal
 * (kept as `cause`); the admin sees one plain message for them. A server failure (`ApiError`)
 * and a network failure (`TypeError` from `fetch`) keep their own cause.
 */
export const getAllAudioChapters = async (bookVersionId: string): Promise<AudioChapter[]> => {
  let items: AudioChapter[];
  let total = 0;
  try {
    items = await fetchAllPages(async (page) => {
      const { items: pageItems, ...pagination } = await getAudioChapters(bookVersionId, {
        page,
        limit: API_MAX_PAGE_SIZE,
      });
      if (page === 1) total = pagination.total;
      return { items: pageItems, pagination };
    }, 'admin audio chapters');
  } catch (error) {
    if (error instanceof ApiError || error instanceof TypeError) throw error;
    throw new Error(INCOMPLETE_LIST_MESSAGE, { cause: error });
  }
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  if (unique.length < total) throw new Error(INCOMPLETE_LIST_MESSAGE);
  return unique;
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
