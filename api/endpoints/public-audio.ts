/**
 * Public audio endpoints.
 *
 * See FRONTEND_ITER2_CONTRACT.md §3 (public list), §7.1 (`POST /views`),
 * §7.3 (`PUT /me/progress/:versionId` audio variant).
 */

import { httpGet } from '@/lib/http';
import { httpPostAuth, httpPutAuth } from '@/lib/http-client';
import type {
  AudioChaptersListResponse,
  GetAudioChaptersParams,
  RecordViewRequest,
  UpdateAudioProgressRequest,
} from '@/types/api-schema';

/**
 * Public list of audio chapters for a published book version.
 *
 * `GET /versions/:bookVersionId/audio-chapters`. Returns 404 if the version
 * is not published. Sorted by `number ASC`.
 */
export const getPublicAudioChapters = async (
  bookVersionId: string,
  params: GetAudioChaptersParams = {}
): Promise<AudioChaptersListResponse> => {
  const { page = 1, limit = 100 } = params;
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const endpoint = `/versions/${bookVersionId}/audio-chapters?${queryParams.toString()}`;
  return httpGet<AudioChaptersListResponse>(endpoint);
};

/**
 * Record a view. Auth is optional — anonymous views are allowed by the
 * backend and attributed to `null` user.
 */
export const recordView = async (data: RecordViewRequest): Promise<void> => {
  await httpPostAuth<void>('/views', data, { requireAuth: false });
};

/**
 * Update the authenticated user's audio progress for a version.
 *
 * Requires auth. Backend validates that `audioChapterNumber` exists in the
 * version and that `position >= 0`.
 */
export const updateAudioProgress = async (
  versionId: string,
  data: UpdateAudioProgressRequest
): Promise<void> => {
  await httpPutAuth<void>(`/me/progress/${versionId}`, data);
};
