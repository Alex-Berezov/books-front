/**
 * Настройки LLM-конвейера в админке (фича F05, пачка F05-1s) — только `admin` (U6).
 *
 * 🔴 Деньги — строкой с восемью знаками после точки (`"12.34567800"`), а не числом
 * (решение арбитра `F05 | F05-1`, В2): float не держит сумму до цента. На вход сервер ждёт
 * ту же строку, `/^\d{1,6}(\.\d{1,8})?$/`; на экране она не округляется и в число не переводится.
 */

import type { PaginatedResult } from './common';

/** Деньги в долларах — строка с восемью знаками после точки (В2). */
export type LlmMoney = string;

/** Ответ `GET /admin/llm/status`. Деньги `null`, пока строки бюджета нет. */
export interface LlmStatus {
  /** `DISABLED` — ключ `OPENROUTER_API_KEY` не задан: ни один вызов модели не пройдёт. */
  state: 'ENABLED' | 'DISABLED';
  /** Есть ли ключ; сам ключ не отдаётся никогда. */
  keyConfigured: boolean;
  /** Есть ли строка потолка; без неё каждый вызов отказывает. */
  budgetConfigured: boolean;
  ceilingUsd: LlmMoney | null;
  spentUsd: LlmMoney | null;
  reservedUsd: LlmMoney | null;
  defaultRunLimitUsd: LlmMoney | null;
}

/** Ответ `PUT /admin/llm/budget`. */
export interface LlmBudget {
  ceilingUsd: LlmMoney;
  spentUsd: LlmMoney;
  reservedUsd: LlmMoney;
  defaultRunLimitUsd: LlmMoney;
  updatedAt: string;
}

/** Тело `PUT /admin/llm/budget`; лимит запуска может быть выше потолка (В1), потолок 0 — стоп. */
export interface UpdateLlmBudgetRequest {
  ceilingUsd?: LlmMoney;
  defaultRunLimitUsd?: LlmMoney;
}

/** Модель каталога OpenRouter; цена `null` — у модели нет фиксированной цены. */
export interface LlmModel {
  id: string;
  name: string;
  contextLength: number | null;
  inputPerMTokUsd: LlmMoney | null;
  outputPerMTokUsd: LlmMoney | null;
  structuredOutputs: boolean;
}

/** Ответ `GET /admin/llm/models`: весь каталог одной страницей. */
export type LlmModelsResponse = PaginatedResult<LlmModel>;

/** Настройка этапа, уже слитая с умолчаниями реестра. */
export interface LlmStageSetting {
  stage: string;
  model: string;
  /** Запасные модели по порядку. */
  fallbacks: string[];
  temperature: number | null;
  /** Верхняя граница ответа; по ней считается резерв вызова. */
  maxTokens: number;
  enabled: boolean;
  /** Потолок цены за 1 млн токенов; обязателен для модели без цены (Р24). */
  maxPricePerMTok: LlmMoney | null;
  /** `default` — умолчания кода; `override` — строка, сохранённая из админки. */
  source: 'default' | 'override';
  updatedAt: string | null;
}

/** Ответ `GET /admin/llm/stage-settings`. */
export type LlmStageSettingsResponse = PaginatedResult<LlmStageSetting>;

/**
 * Тело `PUT /admin/llm/stage-settings/:stage`. PUT заменяет строку целиком: непереданное
 * сбрасывается к умолчанию реестра, поэтому экран шлёт все поля этапа.
 */
export interface UpdateLlmStageSettingRequest {
  model: string;
  fallbacks: string[];
  temperature: number | null;
  maxTokens: number | null;
  enabled: boolean;
  maxPricePerMTok: LlmMoney | null;
}

/** Операция LLM: всё, что тратит деньги, тратит их на операцию с лимитом. */
export interface LlmOperation {
  id: string;
  kind: 'translation_run' | 'dossier' | 'compare' | 'draft';
  status: 'active' | 'paused' | 'cancelled' | 'done' | 'failed';
  /** Почему операция на паузе; `null` — не на паузе. */
  pauseReason:
    | 'LIMIT_REACHED'
    | 'CEILING_REACHED'
    | 'NO_COMPLIANT_PROVIDER'
    | 'DOSSIER_STALE'
    | 'DOSSIER_PAUSED'
    | 'INSUFFICIENT_FUNDS'
    | 'STEP_FAILED'
    | null;
  bookVersionId: string | null;
  limitUsd: LlmMoney;
  reservedUsd: LlmMoney;
  spentUsd: LlmMoney;
  createdAt: string;
  updatedAt: string;
}
