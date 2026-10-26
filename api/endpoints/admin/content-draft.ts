/**
 * Заготовки Summary из досье (фича F05, F05-10) — только `admin` (U6, 403 остальным). Старт ставит
 * операцию `draft` с лимитом, модель зовёт фоновый исполнитель бэкенда; в пересказ версии
 * заготовка не пишется.
 *
 * Отказы с `code` в теле: 409 — `DRAFT_IN_PROGRESS`, `SUMMARY_SECTIONS_MISSING`,
 * `SUMMARY_FULL_MISSING`, `DOSSIER_STALE`, `RUN_LANGUAGE_UNFINISHED`, `DRAFT_DOSSIER_MISSING`,
 * `LLM_CEILING_REACHED`, `SOURCE_HAS_NO_CHAPTERS`, `SOURCE_TOO_MANY_CHAPTERS`, `LLM_NO_PRICE`,
 * `LLM_STAGE_DISABLED`; отметка раздела — 409 `DRAFT_NOT_READY`, 400 `DRAFT_SECTION_UNKNOWN`;
 * 400 — `DRAFT_LIMIT_TOO_LOW`;
 * 503 — `LLM_DISABLED` (только старт).
 */

import { httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type {
  ContentDraft,
  ContentDraftEstimate,
  ContentDraftState,
  StartContentDraftRequest,
  SummaryDraftKind,
} from '@/types/api-schema';

export const getContentDraftEstimate = async (
  versionId: string,
  kind: SummaryDraftKind
): Promise<ContentDraftEstimate> =>
  httpGetAuth<ContentDraftEstimate>(
    `/admin/versions/${encodeURIComponent(versionId)}/drafts/${kind}/estimate`
  );

/** Последняя неотброшенная заготовка вида в любом статусе; нет — `draft: null`. */
export const getContentDraft = async (
  versionId: string,
  kind: SummaryDraftKind
): Promise<ContentDraftState> =>
  httpGetAuth<ContentDraftState>(`/admin/versions/${encodeURIComponent(versionId)}/drafts/${kind}`);

export const startContentDraft = async (
  versionId: string,
  kind: SummaryDraftKind,
  data: StartContentDraftRequest
): Promise<ContentDraft> =>
  httpPostAuth<ContentDraft>(
    `/admin/versions/${encodeURIComponent(versionId)}/drafts/${kind}`,
    data
  );

/** «Не нужна»: строящаяся отменяет свою операцию (досье и глоссарий — нет). */
export const discardContentDraft = async (id: string): Promise<ContentDraft> =>
  httpPostAuth<ContentDraft>(`/admin/content-drafts/${encodeURIComponent(id)}/discard`, {});

/** Раздел заготовки добавлен «Add section»: карточку больше не предлагать; повтор ничего не меняет. */
export const markContentDraftSectionAdded = async (
  id: string,
  sectionNumber: number
): Promise<ContentDraft> =>
  httpPostAuth<ContentDraft>(
    `/admin/content-drafts/${encodeURIComponent(id)}/sections/${sectionNumber}/added`,
    {}
  );
