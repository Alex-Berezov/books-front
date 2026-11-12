/**
 * Отметка редактора «прочитано» вкладок Summary и Analysis (T184) — только `admin`. Без
 * действующей отметки публикация версии с текстом модели в полях вкладки отказывает
 * `AUTO_TEXT_NOT_READ`; текст модели, легший после отметки, снимает её сам.
 *
 * Отказы отметки с `code` в теле: 409 `AUTO_TEXT_RUN_BUILDING` (ход вкладки ещё пишет),
 * 409 `AUTO_TEXT_NONE` (текст модели в поля не ложился), 409 `AUTO_TEXT_CHANGED` (после показа
 * вкладки лёг новый текст — отметка его не покрывает).
 */

import { httpDeleteAuth, httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type { AutoTextRead, AutoTextRunKind, MarkAutoTextReadRequest } from '@/types/api-schema';

export const getAutoTextRead = async (
  versionId: string,
  kind: AutoTextRunKind
): Promise<AutoTextRead> =>
  httpGetAuth<AutoTextRead>(`/admin/versions/${encodeURIComponent(versionId)}/drafts/${kind}/read`);

/** «Mark as read» того текста модели, который редактор видел: его `autoTextAt` из GET отметки. */
export const markAutoTextRead = async (
  versionId: string,
  kind: AutoTextRunKind,
  data: MarkAutoTextReadRequest
): Promise<AutoTextRead> =>
  httpPostAuth<AutoTextRead>(
    `/admin/versions/${encodeURIComponent(versionId)}/drafts/${kind}/read`,
    data
  );

/** 204: отметка снята. */
export const unmarkAutoTextRead = async (versionId: string, kind: AutoTextRunKind): Promise<void> =>
  httpDeleteAuth<void>(`/admin/versions/${encodeURIComponent(versionId)}/drafts/${kind}/read`);
