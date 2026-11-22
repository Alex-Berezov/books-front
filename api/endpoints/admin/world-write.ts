/**
 * Ход мира «Write World» (фича F08, F08-4b) — только `admin` (403 остальным). Старт ставит операцию
 * со своим лимитом: шаг 0 выбирает формы имени главных героев анализа, дальше на героя страница
 * и внешние блоки; новые сущности и пустые блоки неопубликованной сущности ход пишет через импорт
 * мира сам, остальное — предложениями по блоку. Решения по блокам — общие ручки
 * `content-drafts/:id/*`, вид хода сервер берёт из строки.
 *
 * Отказы с `code` в теле: старт и оценка — 409 `DRAFT_IN_PROGRESS`, `WORLD_ANALYSIS_MISSING`,
 * `WORLD_LANGUAGE_UNSUPPORTED` (язык без эталона), `SOURCE_HAS_NO_CHAPTERS`, `DOSSIER_STALE`,
 * `RUN_LANGUAGE_UNFINISHED`, `DRAFT_DOSSIER_MISSING`, `LLM_CEILING_REACHED`, `DOSSIER_TOO_LONG`,
 * 400 `DRAFT_LIMIT_TOO_LOW`, 503 `LLM_DISABLED`; блоки хода — 409 `WORLD_WRITE_NOT_READY`,
 * `WORLD_REGEN_IN_PROGRESS`, `WORLD_ITEM_NOT_PROPOSED`, `WORLD_ITEM_NOT_REGENERABLE` (формы имени),
 * `WORLD_BLOCK_CHANGED` (`current`), `WORLD_PROPOSAL_CHANGED`, `WORLD_WRITE_REFUSED` (`errors`),
 * 400 `WORLD_ITEM_UNKNOWN`.
 *
 * Ответ ручек решений — `ContentDraftRun` / `ContentDraftAcceptAll`: схема отдаёт форму по виду строки.
 */

import {
  acceptAllContentDraftItems,
  acceptContentDraftBlock,
  discardContentDraftItem,
  discardContentDraftRun,
  getContentDraftProposal,
  regenerateContentDraftItem,
} from '@/api/endpoints/admin/content-draft';
import { httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type {
  StartContentDraftRequest,
  WorldWrite,
  WorldWriteEstimate,
  WorldWriteState,
  WorldWriteValue,
} from '@/types/api-schema';

export const getWorldWriteEstimate = async (versionId: string): Promise<WorldWriteEstimate> =>
  httpGetAuth<WorldWriteEstimate>(
    `/admin/versions/${encodeURIComponent(versionId)}/drafts/world_write/estimate`
  );

/** Последний неотброшенный ход в любом статусе; нет — `draft: null`. */
export const getWorldWrite = async (versionId: string): Promise<WorldWriteState> =>
  httpGetAuth<WorldWriteState>(
    `/admin/versions/${encodeURIComponent(versionId)}/drafts/world_write`
  );

/** «Write World» (202): прежний готовый или упавший ход сервер отбрасывает сам. */
export const startWorldWrite = async (
  versionId: string,
  data: StartContentDraftRequest
): Promise<WorldWrite> =>
  httpPostAuth<WorldWrite>(
    `/admin/versions/${encodeURIComponent(versionId)}/drafts/world_write`,
    data
  );

/** Содержимое предложения готового хода: в ответ хода оно не идёт. */
export const getWorldWriteProposal = async (
  id: string,
  index: number
): Promise<WorldWriteValue> => {
  const value = await getContentDraftProposal(id, index);
  // Ручка общая у ходов (форма по виду строки): предложение хода анализа — не содержимое мира.
  if ('characters' in value)
    throw new Error('The proposal belongs to an analysis run, not to the world');
  return value;
};

/** Перегенерация одного блока своей операцией; замечание редактора уходит автору. */
export const regenerateWorldItem = regenerateContentDraftItem;

/** «Accept»: запись предложения в блок сущности, если блок не менялся после предложения;
 * `expectedPrint` — отпечаток показанного предложения (другое предложение — 409). */
export const acceptWorldItem = acceptContentDraftBlock;

/** «Discard» предложения: блок не трогается. */
export const discardWorldItem = discardContentDraftItem;

/** «Discard run»: строящийся отменяет свою операцию и перегенерации; блоки не трогаются. */
export const discardWorldWriteRun = discardContentDraftRun;

/** «Accept all»: предложения по одному; отказавшие по себе — в `skipped` с причиной, ответ 200. */
export const acceptAllWorldItems = acceptAllContentDraftItems;
