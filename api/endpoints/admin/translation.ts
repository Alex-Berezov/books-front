/**
 * Сравнение моделей перевода на главе (фича F05, F05-3) — только `admin` (U6, 403 остальным).
 * Запуск ставит операцию `compare` с лимитом, модели зовёт фоновый исполнитель бэкенда; версия
 * не создаётся, глоссарий не меняется.
 *
 * Отказы с `code` в теле: 409 — версия не исходник (`NOT_ORIGINAL_VERSION`, `NOT_ENGLISH_VERSION`
 * и прочие причины D8, с `sourceVersionId`), `NOT_IN_INTAKE`, `COMPARE_CHAPTER_EMPTY`,
 * `LLM_CEILING_REACHED`, `LLM_NO_PRICE`, `LLM_STAGE_DISABLED`; 400 — `COMPARE_TARGET_IS_SOURCE`,
 * `LLM_MODEL_UNKNOWN`; 503 — `LLM_DISABLED` (только запуск), `LLM_MODELS_UNAVAILABLE`.
 */

import { httpGetAuth, httpPostAuth, httpPutAuth } from '@/lib/http-client';
import type {
  DossierEstimate,
  DossierStatus,
  EditTranslationChunkRequest,
  Glossary,
  ResumeTranslationRunRequest,
  RetryTranslationChunkRequest,
  StartTranslationCompareRequest,
  StartTranslationRunRequest,
  TranslationCompare,
  TranslationCompareEstimate,
  TranslationCompareListResponse,
  TranslationCompareParams,
  TranslationChunkEdited,
  TranslationChunkRetryStarted,
  TranslationChunks,
  TranslationRun,
  TranslationRunEstimate,
  TranslationRunEstimateParams,
  TranslationRunListParams,
  TranslationRunListResponse,
  TranslationRunReport,
  TranslationSource,
} from '@/types/api-schema';

const compareQuery = (params: TranslationCompareParams): string => {
  const query = new URLSearchParams({
    chapterNumber: String(params.chapterNumber),
    targetLanguage: params.targetLanguage,
  });
  for (const model of params.models) query.append('models', model);
  return query.toString();
};

export const getTranslationCompareEstimate = async (
  versionId: string,
  params: TranslationCompareParams
): Promise<TranslationCompareEstimate> =>
  httpGetAuth<TranslationCompareEstimate>(
    `/admin/versions/${versionId}/translation-compare/estimate?${compareQuery(params)}`
  );

export const startTranslationCompare = async (
  versionId: string,
  data: StartTranslationCompareRequest
): Promise<TranslationCompare> =>
  httpPostAuth<TranslationCompare>(`/admin/versions/${versionId}/translation-compare`, data);

export const getTranslationCompares = async (
  versionId: string,
  page = 1,
  limit = 20
): Promise<TranslationCompareListResponse> =>
  httpGetAuth<TranslationCompareListResponse>(
    `/admin/versions/${versionId}/translation-compares?page=${page}&limit=${limit}`
  );

export const getTranslationCompare = async (id: string): Promise<TranslationCompare> =>
  httpGetAuth<TranslationCompare>(`/admin/translation-compares/${id}`);

// ---------------------------------------------------------------------------
// Запуск перевода по всей книге (F05-7) — только `admin`. Оценка и старт отказывают 409
// `TRANSLATION_TARGET_UNAVAILABLE` (`languages[{language, reason}]`), `TRANSLATION_SOURCE_EMPTY`,
// `SOURCE_TOO_MANY_CHAPTERS`, `CHECK_MODEL_SAME_FAMILY`, кодом причины D8; старт — ещё 400
// `TRANSLATION_RUN_LIMIT_TOO_LOW`; кнопки — 409 `TRANSLATION_RUN_NOT_PAUSABLE`,
// `LLM_OPERATION_NOT_RESUMABLE`, `LLM_OPERATION_NOT_CANCELLABLE`, `TRANSLATION_RUN_MODELS_CHANGED`.

export const getTranslationSource = async (versionId: string): Promise<TranslationSource> =>
  httpGetAuth<TranslationSource>(`/admin/versions/${versionId}/translation-source`);

const runEstimateQuery = (params: TranslationRunEstimateParams): string => {
  const query = new URLSearchParams();
  for (const language of params.languages) query.append('languages', language);
  if (params.translateModel) query.set('translateModel', params.translateModel);
  return query.toString();
};

export const getTranslationRunEstimate = async (
  versionId: string,
  params: TranslationRunEstimateParams
): Promise<TranslationRunEstimate> =>
  httpGetAuth<TranslationRunEstimate>(
    `/admin/versions/${versionId}/translation-runs/estimate?${runEstimateQuery(params)}`
  );

export const startTranslationRun = async (
  versionId: string,
  data: StartTranslationRunRequest
): Promise<TranslationRun> =>
  httpPostAuth<TranslationRun>(`/admin/versions/${versionId}/translation-runs`, data);

export const getBookTranslationRuns = async (
  bookId: string,
  params: TranslationRunListParams = {}
): Promise<TranslationRunListResponse> => {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  if (params.bookVersionId) query.set('bookVersionId', params.bookVersionId);
  if (params.active) query.set('active', 'true');
  return httpGetAuth<TranslationRunListResponse>(
    `/admin/books/${bookId}/translation-runs?${query.toString()}`
  );
};

export const getTranslationRun = async (id: string): Promise<TranslationRun> =>
  httpGetAuth<TranslationRun>(`/admin/translation-runs/${id}`);

export const getTranslationRunReport = async (id: string): Promise<TranslationRunReport> =>
  httpGetAuth<TranslationRunReport>(`/admin/translation-runs/${id}/report`);

export const pauseTranslationRun = async (id: string): Promise<TranslationRun> =>
  httpPostAuth<TranslationRun>(`/admin/translation-runs/${id}/pause`);

export const resumeTranslationRun = async (
  id: string,
  data: ResumeTranslationRunRequest
): Promise<TranslationRun> =>
  httpPostAuth<TranslationRun>(`/admin/translation-runs/${id}/resume`, data);

export const cancelTranslationRun = async (id: string): Promise<TranslationRun> =>
  httpPostAuth<TranslationRun>(`/admin/translation-runs/${id}/cancel`);

// ---------------------------------------------------------------------------
// Куски запуска (F05-7v) — только `admin`. Повтор и правка отказывают 409 `RUN_ACTIVE`
// (запуск идёт), `RETRY_IN_PROGRESS`, `DRAFT_MISSING`, `CHUNK_SOURCE_CHANGED`; повтор — ещё 409
// `LLM_NO_PRICE`, `LLM_STAGE_DISABLED`, `CHECK_MODEL_SAME_FAMILY`, 400 `LLM_MODEL_UNKNOWN`,
// 503 `LLM_DISABLED`; правка — 409 `CHUNK_EDIT_CONFLICT`, 400 `CHUNK_BLOCKS_INVALID` (список
// отказов массивом в `message`).

export const getTranslationChunks = async (
  runId: string,
  language: string,
  chapter: number
): Promise<TranslationChunks> =>
  httpGetAuth<TranslationChunks>(
    `/admin/translation-runs/${encodeURIComponent(runId)}/chunks?${new URLSearchParams({
      lang: language,
      chapter: String(chapter),
    }).toString()}`
  );

export const retryTranslationChunk = async (
  chunkId: string,
  data: RetryTranslationChunkRequest
): Promise<TranslationChunkRetryStarted> =>
  httpPostAuth<TranslationChunkRetryStarted>(
    `/admin/translation-chunks/${encodeURIComponent(chunkId)}/retry`,
    data
  );

export const editTranslationChunk = async (
  chunkId: string,
  data: EditTranslationChunkRequest
): Promise<TranslationChunkEdited> =>
  httpPutAuth<TranslationChunkEdited>(
    `/admin/translation-chunks/${encodeURIComponent(chunkId)}`,
    data
  );

// Досье и глоссарий — только чтение (F05-7v; построение — F05-10). Части адреса из адресной
// строки экрана (язык, запуск) кодируются: чужое значение не уводит запрос на другую ручку.

export const getVersionDossier = async (versionId: string): Promise<DossierStatus> =>
  httpGetAuth<DossierStatus>(`/admin/versions/${encodeURIComponent(versionId)}/dossier`);

export const getDossierGlossary = async (dossierId: string, language: string): Promise<Glossary> =>
  httpGetAuth<Glossary>(
    `/admin/dossiers/${encodeURIComponent(dossierId)}/glossaries/${encodeURIComponent(language)}`
  );

/** Оценка построения досье сверху (F05-10: «перестроить» при `DOSSIER_STALE`). */
export const getDossierEstimate = async (versionId: string): Promise<DossierEstimate> =>
  httpGetAuth<DossierEstimate>(`/admin/versions/${encodeURIComponent(versionId)}/dossier/estimate`);

/**
 * Построить досье фоном (устаревшее — новым поколением). 409 `DOSSIER_FRESH`, `DOSSIER_OF_RUN`,
 * `LLM_CEILING_REACHED`; 503 `LLM_DISABLED`.
 */
export const buildDossier = async (versionId: string, limitUsd?: string): Promise<DossierStatus> =>
  httpPostAuth<DossierStatus>(
    `/admin/versions/${encodeURIComponent(versionId)}/dossier`,
    limitUsd ? { limitUsd } : {}
  );
