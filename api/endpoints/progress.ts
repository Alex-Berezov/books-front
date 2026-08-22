/**
 * Progress Endpoints
 *
 * API endpoints for saving and updating user reading/listening progress.
 */

import { httpPutAuth, httpGetAuth } from '@/lib/http-client';
import type { UpdateProgressRequest, ReadingProgress } from '@/types/api-schema';

/**
 * Get user reading/listening progress for a specific book version.
 *
 * 🔴 «Прогресса ещё нет» — это **200 с пустым телом**, а не 404:
 * `ReadingProgressService.get` возвращает `null`, Nest отдаёт его пустым
 * ответом, а `lib/http.ts` превращает пустое тело в `undefined`. Нормализуем
 * его в `null` здесь по двум причинам: `undefined` из `queryFn` react-query 5
 * считает ошибкой, а вызывающий код обязан отличать «пусто» от
 * «запрос не удался» — второе остаётся исключением.
 *
 * @param versionId - Book version ID
 * @returns Progress data либо `null`, если прогресса по этой версии нет
 */
export const getProgress = async (versionId: string): Promise<ReadingProgress | null> => {
  const endpoint = `/me/progress/${versionId}`;
  const progress = await httpGetAuth<ReadingProgress | null | undefined>(endpoint);

  return progress ?? null;
};

/**
 * Update user reading progress for a specific book version
 *
 * @param versionId - Book version ID
 * @param data - Progress updates (chapterId, position, percentage)
 */
export const updateTextProgress = async (
  versionId: string,
  data: UpdateProgressRequest
): Promise<void> => {
  const endpoint = `/me/progress/${versionId}`;
  return httpPutAuth<void>(endpoint, data);
};
