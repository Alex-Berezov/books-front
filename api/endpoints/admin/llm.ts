/**
 * Настройки LLM-конвейера (фича F05, F05-1s): состояние ключа и бюджета, каталог моделей
 * OpenRouter, модели этапов. Все пять ручек — только `admin` (U6, 403 остальным), ни одна
 * модель не зовёт и денег не тратит (Р25).
 *
 * 503 с `code: 'LLM_MODELS_UNAVAILABLE'` — каталога OpenRouter нет и кэша тоже (Р-Е): так
 * отвечают каталог и `PUT` этапа. `LLM_DISABLED` эти ручки не отдают никогда: ключ виден
 * из `state` ответа `getLlmStatus` (решение арбитра `F05 | F05-1s`).
 *
 * Списки — без `toPaginated`: маршруты родились в форме `{items, pagination}` (F05-1,
 * `v1.0.241`), прежней формы и окна выката с ней у них не было (`LEGACY-177`).
 */

import { httpGetAuth, httpPutAuth } from '@/lib/http-client';
import type {
  LlmBudget,
  LlmModelsResponse,
  LlmStageSetting,
  LlmStageSettingsResponse,
  LlmStatus,
  UpdateLlmBudgetRequest,
  UpdateLlmStageSettingRequest,
} from '@/types/api-schema';

/** Код 503, когда каталога OpenRouter нет и кэша тоже (Р-Е): так отвечают каталог и `PUT` этапа. */
export const LLM_MODELS_UNAVAILABLE = 'LLM_MODELS_UNAVAILABLE';

export const getLlmStatus = async (): Promise<LlmStatus> =>
  httpGetAuth<LlmStatus>('/admin/llm/status');

/** Весь каталог одной страницей: выпадающему списку экрана нужен он целиком. */
export const getLlmModels = async (): Promise<LlmModelsResponse> =>
  httpGetAuth<LlmModelsResponse>('/admin/llm/models');

export const getLlmStageSettings = async (): Promise<LlmStageSettingsResponse> =>
  httpGetAuth<LlmStageSettingsResponse>('/admin/llm/stage-settings');

/** PUT заменяет строку целиком: непереданное поле сбрасывается к умолчанию реестра. */
export const updateLlmStageSetting = async (
  stage: string,
  data: UpdateLlmStageSettingRequest
): Promise<LlmStageSetting> =>
  httpPutAuth<LlmStageSetting>(`/admin/llm/stage-settings/${encodeURIComponent(stage)}`, data);

/** 404, если строки бюджета нет. */
export const updateLlmBudget = async (data: UpdateLlmBudgetRequest): Promise<LlmBudget> =>
  httpPutAuth<LlmBudget>('/admin/llm/budget', data);
