/**
 * Public audio endpoints.
 *
 * See books-app-docs/frontend/features/audio-feature/FRONTEND_ITER2_CONTRACT.md §3 (public list), §7.1 (`POST /views`),
 * §7.3 (`PUT /me/progress/:versionId` audio variant).
 */

import { PUBLIC_REVALIDATE_SECONDS } from '@/lib/constants/cache';
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
  // 🔴 `LEGACY-369`. Режим кэша обязателен, даже когда единственный вызывающий —
  // клиентский хук (`api/hooks/usePublicAudio.ts`): в браузере кэша данных Next нет,
  // и опция инертна, но стоит позвать эту функцию из серверного компонента, как
  // умолчание Next 14 (`force-cache`, `revalidate = false`) заморозит список аудиоглав
  // навсегда. `cache: 'no-store'` здесь не годится — его браузер
  // исполняет и выключил бы HTTP-кэш живому вызову. Решение арбитра 13.09.2026, вариант D.
  return httpGet<AudioChaptersListResponse>(endpoint, {
    next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
  });
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
