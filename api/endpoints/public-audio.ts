/**
 * Public audio endpoints.
 *
 * See `books-app-docs/ai-context/api-contracts.md` («Chapters / Audio Chapters / Summaries»: public list; «User-facing data endpoints»: `POST /views`,
 * `PUT /me/progress/:versionId` audio variant).
 */

import { UNKNOWN_COUNTRY, VISITOR_COUNTRY_HEADER } from '@/lib/backend-proxy.constants';
import { PUBLIC_REVALIDATE_SECONDS } from '@/lib/constants/cache';
import { httpGet } from '@/lib/http';
import { httpPostAuth, httpPutAuth } from '@/lib/http-client';
import type {
  AudioChaptersListResponse,
  CreateViewResponse,
  GetAudioChaptersParams,
  ReadingProgress,
  RecordViewRequest,
  UpdateAudioProgressRequest,
} from '@/types/api-schema';

/**
 * Сколько аудиоглав плеер берёт одним запросом - и он же наибольший `limit` ручки
 * (`audio-chapter.controller.ts`, `maximum: 100`). Плеер (`usePublicAudioChapters` без параметров)
 * грузит только эту первую страницу, поэтому ссылки «Слушать» мира книги берут тот же набор
 * (`getPublicAudioChaptersForPage`): ссылка не ведёт туда, куда плеер не откроет.
 */
export const AUDIO_CHAPTERS_PAGE_LIMIT = 100;

const audioChaptersQuery = (page: number, limit: number): string =>
  new URLSearchParams({ page: String(page), limit: String(limit) }).toString();

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
  const { page = 1, limit = AUDIO_CHAPTERS_PAGE_LIMIT } = params;
  // 🔴 `LEGACY-369`. Режим кэша обязателен, даже когда единственный вызывающий —
  // клиентский хук (`api/hooks/usePublicAudio.ts`): в браузере кэша данных Next нет,
  // и опция инертна, но стоит позвать эту функцию из серверного компонента, как
  // умолчание Next 14 (`force-cache`, `revalidate = false`) заморозило бы список аудиоглав
  // навсегда, а умолчание Next 15 (без кэша) гоняло бы бэкенд на каждый рендер.
  // `cache: 'no-store'` здесь не годится — его браузер исполняет и выключил бы HTTP-кэш
  // живому вызову. Решение арбитра 13.09.2026, вариант D.
  return httpGet<AudioChaptersListResponse>(
    `/versions/${bookVersionId}/audio-chapters?${audioChaptersQuery(page, limit)}`,
    {
      next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
    }
  );
};

/**
 * Аудиоглавы версии для серверной страницы (мир книги, «Слушать» у сцены, F08-3b) - тот же набор,
 * что открывает плеер: первая страница по `AUDIO_CHAPTERS_PAGE_LIMIT`. Ответ ложится в общий
 * ISR-кэш, поэтому страна посетителя не передаётся - «неизвестна» (`XX`), как у анализа: иначе
 * в кэш лёг бы список по стране сервера. В браузере страну ставит прокси.
 */
export const getPublicAudioChaptersForPage = async (
  bookVersionId: string
): Promise<AudioChaptersListResponse['items']> => {
  const response = await httpGet<AudioChaptersListResponse>(
    `/versions/${bookVersionId}/audio-chapters?${audioChaptersQuery(1, AUDIO_CHAPTERS_PAGE_LIMIT)}`,
    {
      next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
      headers: { [VISITOR_COUNTRY_HEADER]: UNKNOWN_COUNTRY },
    }
  );
  return response.items;
};

/**
 * Record a view. Auth is optional — anonymous views are allowed by the
 * backend and attributed to `null` user.
 */
export const recordView = async (data: RecordViewRequest): Promise<void> => {
  await httpPostAuth<CreateViewResponse>('/views', data, { requireAuth: false });
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
  await httpPutAuth<ReadingProgress>(`/me/progress/${versionId}`, data);
};
