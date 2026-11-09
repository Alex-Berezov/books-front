/**
 * Ход анализа «Write Analysis» (фича F07, F07-3a) — только `admin` (403 остальным). Старт ставит
 * операцию со своим лимитом: пять шагов пишут блоки анализа; пустые блоки неопубликованной версии
 * ход пишет сам, остальное — предложениями по блоку (у `facts` — по подполю). Решения по блокам —
 * общие ручки `content-drafts/:id/*`, вид хода сервер берёт из строки.
 *
 * Отказы с `code` в теле: старт и оценка — 409 `DRAFT_IN_PROGRESS`, `SOURCE_HAS_NO_CHAPTERS`,
 * `DOSSIER_STALE`, `RUN_LANGUAGE_UNFINISHED`, `DRAFT_DOSSIER_MISSING`, `LLM_CEILING_REACHED`,
 * `DOSSIER_TOO_LONG`, 400 `DRAFT_LIMIT_TOO_LOW`, 503 `LLM_DISABLED`; блоки хода — 409
 * `ANALYSIS_WRITE_NOT_READY`, `ANALYSIS_REGEN_IN_PROGRESS`, `ANALYSIS_ITEM_NOT_PROPOSED`,
 * `ANALYSIS_ITEM_NOT_REGENERABLE` (связи тем и `sources`), `ANALYSIS_BLOCK_CHANGED` (`current`),
 * `ANALYSIS_WRITE_REFUSED` (`errors`), 400 `ANALYSIS_ITEM_UNKNOWN`.
 *
 * Ответ ручек решений — `ContentDraftRun` / `ContentDraftAcceptAll`: схема отдаёт форму по виду строки.
 */

import { httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type {
  AnalysisWrite,
  AnalysisWriteEstimate,
  AnalysisWriteState,
  AnalysisWriteValue,
  ContentDraftAcceptAll,
  ContentDraftRun,
  AcceptSummaryItemRequest,
  RegenerateSummaryItemRequest,
  StartContentDraftRequest,
} from '@/types/api-schema';

export const getAnalysisWriteEstimate = async (versionId: string): Promise<AnalysisWriteEstimate> =>
  httpGetAuth<AnalysisWriteEstimate>(
    `/admin/versions/${encodeURIComponent(versionId)}/drafts/analysis_write/estimate`
  );

/** Последний неотброшенный ход в любом статусе; нет — `draft: null`. */
export const getAnalysisWrite = async (versionId: string): Promise<AnalysisWriteState> =>
  httpGetAuth<AnalysisWriteState>(
    `/admin/versions/${encodeURIComponent(versionId)}/drafts/analysis_write`
  );

/** «Write Analysis» (202): прежний готовый или упавший ход сервер отбрасывает сам. */
export const startAnalysisWrite = async (
  versionId: string,
  data: StartContentDraftRequest
): Promise<AnalysisWrite> =>
  httpPostAuth<AnalysisWrite>(
    `/admin/versions/${encodeURIComponent(versionId)}/drafts/analysis_write`,
    data
  );

/** Содержимое предложения готового хода: в ответ хода оно не идёт. */
export const getAnalysisWriteProposal = async (
  id: string,
  index: number
): Promise<AnalysisWriteValue> =>
  httpGetAuth<AnalysisWriteValue>(`/admin/content-drafts/${encodeURIComponent(id)}/items/${index}`);

/** Перегенерация одного блока своей операцией; замечание редактора уходит автору. */
export const regenerateAnalysisItem = async (
  id: string,
  index: number,
  data: RegenerateSummaryItemRequest
): Promise<ContentDraftRun> =>
  httpPostAuth<ContentDraftRun>(
    `/admin/content-drafts/${encodeURIComponent(id)}/items/${index}/regenerate`,
    data
  );

/** «Accept»: запись предложения в блок, если содержимое блока не менялось после предложения;
 * `expectedPrint` — отпечаток показанного предложения (другое предложение — 409). */
export const acceptAnalysisItem = async (
  id: string,
  index: number,
  expectedPrint?: string
): Promise<ContentDraftRun> => {
  const body: AcceptSummaryItemRequest = expectedPrint ? { expectedPrint } : {};
  return httpPostAuth<ContentDraftRun>(
    `/admin/content-drafts/${encodeURIComponent(id)}/items/${index}/accept`,
    body
  );
};

/** «Discard» предложения: блок не трогается. */
export const discardAnalysisItem = async (id: string, index: number): Promise<ContentDraftRun> =>
  httpPostAuth<ContentDraftRun>(
    `/admin/content-drafts/${encodeURIComponent(id)}/items/${index}/discard`,
    {}
  );

/** «Discard run»: строящийся отменяет свою операцию и перегенерации; блоки не трогаются. */
export const discardAnalysisWriteRun = async (id: string): Promise<ContentDraftRun> =>
  httpPostAuth<ContentDraftRun>(`/admin/content-drafts/${encodeURIComponent(id)}/discard-run`, {});

/** «Accept all»: предложения по одному; отказавшие по себе — в `skipped` с причиной, ответ 200. */
export const acceptAllAnalysisItems = async (id: string): Promise<ContentDraftAcceptAll> =>
  httpPostAuth<ContentDraftAcceptAll>(
    `/admin/content-drafts/${encodeURIComponent(id)}/accept-all`,
    {}
  );
