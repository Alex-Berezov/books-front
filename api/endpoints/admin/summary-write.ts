/**
 * Ход пересказа «Write Summary» (фича F06, F06-2) — только `admin` (403 остальным). Старт ставит
 * операцию со своим лимитом: разделы по плану досье, полный и «Очень кратко»; пустые поля
 * неопубликованной версии ход пишет сам, остальное — предложениями.
 *
 * Отказы с `code` в теле: старт и оценка — 409 `DRAFT_IN_PROGRESS`, `SOURCE_HAS_NO_CHAPTERS`,
 * `DOSSIER_STALE`, `RUN_LANGUAGE_UNFINISHED`, `DRAFT_DOSSIER_MISSING`, `LLM_CEILING_REACHED`,
 * `DOSSIER_TOO_LONG`, 400 `DRAFT_LIMIT_TOO_LOW`, 503 `LLM_DISABLED`; тексты хода — 409
 * `SUMMARY_WRITE_NOT_READY`, `SUMMARY_REGEN_IN_PROGRESS`, `SUMMARY_ITEM_NOT_PROPOSED`,
 * `SUMMARY_FIELD_CHANGED` (`current`, `expectedNumber`), `SUMMARY_CHAPTER_CHANGE` (повтор
 * с `confirmChapterChange`), `ACCEPT_ALL_CHAPTER_CHANGE`, 400 `SUMMARY_ITEM_UNKNOWN`.
 *
 * Ручки решений по ходу общие с ходом анализа (F07-1b): ответ — `ContentDraftRun` по виду строки.
 */

import { httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type {
  AcceptSummaryItemRequest,
  ContentDraftAcceptAll,
  ContentDraftRun,
  RegenerateSummaryItemRequest,
  StartContentDraftRequest,
  SummaryWrite,
  SummaryWriteEstimate,
  SummaryWriteState,
} from '@/types/api-schema';

export const getSummaryWriteEstimate = async (versionId: string): Promise<SummaryWriteEstimate> =>
  httpGetAuth<SummaryWriteEstimate>(
    `/admin/versions/${encodeURIComponent(versionId)}/drafts/summary_write/estimate`
  );

/** Последний неотброшенный ход в любом статусе; нет — `draft: null`. */
export const getSummaryWrite = async (versionId: string): Promise<SummaryWriteState> =>
  httpGetAuth<SummaryWriteState>(
    `/admin/versions/${encodeURIComponent(versionId)}/drafts/summary_write`
  );

/** «Write Summary» (202): прежний готовый или упавший ход сервер отбрасывает сам. */
export const startSummaryWrite = async (
  versionId: string,
  data: StartContentDraftRequest
): Promise<SummaryWrite> =>
  httpPostAuth<SummaryWrite>(
    `/admin/versions/${encodeURIComponent(versionId)}/drafts/summary_write`,
    data
  );

/** Перегенерация одного текста своей операцией; замечание редактора уходит автору. */
export const regenerateSummaryItem = async (
  id: string,
  index: number,
  data: RegenerateSummaryItemRequest
): Promise<ContentDraftRun> =>
  httpPostAuth<ContentDraftRun>(
    `/admin/content-drafts/${encodeURIComponent(id)}/items/${index}/regenerate`,
    data
  );

/** «Accept»: запись предложения в поле, если поле не менялось после предложения. */
export const acceptSummaryItem = async (
  id: string,
  index: number,
  data: AcceptSummaryItemRequest
): Promise<ContentDraftRun> =>
  httpPostAuth<ContentDraftRun>(
    `/admin/content-drafts/${encodeURIComponent(id)}/items/${index}/accept`,
    data
  );

/** «Discard» предложения: поле не трогается. */
export const discardSummaryItem = async (id: string, index: number): Promise<ContentDraftRun> =>
  httpPostAuth<ContentDraftRun>(
    `/admin/content-drafts/${encodeURIComponent(id)}/items/${index}/discard`,
    {}
  );

/** «Discard run»: строящийся отменяет свою операцию и перегенерации; поля не трогаются. */
export const discardSummaryWriteRun = async (id: string): Promise<ContentDraftRun> =>
  httpPostAuth<ContentDraftRun>(`/admin/content-drafts/${encodeURIComponent(id)}/discard-run`, {});

/** «Accept all»: предложения по одному — разделы по номеру, затем полный и «Очень кратко». */
export const acceptAllSummaryItems = async (id: string): Promise<ContentDraftAcceptAll> =>
  httpPostAuth<ContentDraftAcceptAll>(
    `/admin/content-drafts/${encodeURIComponent(id)}/accept-all`,
    {}
  );
