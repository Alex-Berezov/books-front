/**
 * Общие ручки решений по ходу из досье — `content-drafts/:id/*` (F07-1b, F08-4a): одни на ход
 * пересказа, ход анализа и ход мира; вид хода сервер берёт из строки, ответ — форма по виду
 * (`ContentDraftRun`, `ContentDraftAcceptAll`, `ContentDraftProposal`). Ходы зовут их под своими
 * именами (`summary-write.ts`, `analysis-write.ts`, `world-write.ts`); отказы с `code` — у них.
 */

import { httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type {
  AcceptSummaryItemRequest,
  ContentDraftAcceptAll,
  ContentDraftProposal,
  ContentDraftRun,
  RegenerateSummaryItemRequest,
} from '@/types/api-schema';

/** Содержимое предложения готового хода: в ответ хода оно не идёт; форма — по виду хода. */
export const getContentDraftProposal = async (
  id: string,
  index: number
): Promise<ContentDraftProposal> =>
  httpGetAuth<ContentDraftProposal>(
    `/admin/content-drafts/${encodeURIComponent(id)}/items/${index}`
  );

/** Перегенерация одного текста или блока своей операцией; замечание редактора уходит автору. */
export const regenerateContentDraftItem = async (
  id: string,
  index: number,
  data: RegenerateSummaryItemRequest
): Promise<ContentDraftRun> =>
  httpPostAuth<ContentDraftRun>(
    `/admin/content-drafts/${encodeURIComponent(id)}/items/${index}/regenerate`,
    data
  );

/** «Accept»: запись предложения, если поле или блок не менялись после предложения. */
export const acceptContentDraftItem = async (
  id: string,
  index: number,
  data: AcceptSummaryItemRequest
): Promise<ContentDraftRun> =>
  httpPostAuth<ContentDraftRun>(
    `/admin/content-drafts/${encodeURIComponent(id)}/items/${index}/accept`,
    data
  );

/** «Accept» блока анализа или мира: `expectedPrint` — отпечаток показанного предложения (другое — 409). */
export const acceptContentDraftBlock = async (
  id: string,
  index: number,
  expectedPrint?: string
): Promise<ContentDraftRun> =>
  acceptContentDraftItem(id, index, expectedPrint ? { expectedPrint } : {});

/** «Discard» предложения: поле или блок не трогается. */
export const discardContentDraftItem = async (
  id: string,
  index: number
): Promise<ContentDraftRun> =>
  httpPostAuth<ContentDraftRun>(
    `/admin/content-drafts/${encodeURIComponent(id)}/items/${index}/discard`,
    {}
  );

/** «Discard run»: строящийся отменяет свою операцию и перегенерации; записанное не трогается. */
export const discardContentDraftRun = async (id: string): Promise<ContentDraftRun> =>
  httpPostAuth<ContentDraftRun>(`/admin/content-drafts/${encodeURIComponent(id)}/discard-run`, {});

/** «Accept all»: предложения по одному; отказавшие по себе — в `skipped` (анализ, мир). */
export const acceptAllContentDraftItems = async (id: string): Promise<ContentDraftAcceptAll> =>
  httpPostAuth<ContentDraftAcceptAll>(
    `/admin/content-drafts/${encodeURIComponent(id)}/accept-all`,
    {}
  );
