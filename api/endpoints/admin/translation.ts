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

import { httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type {
  StartTranslationCompareRequest,
  TranslationCompare,
  TranslationCompareEstimate,
  TranslationCompareListResponse,
  TranslationCompareParams,
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
