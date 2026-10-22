/**
 * Сравнение моделей перевода на главе в админке (фича F05, пачка F05-3) — только `admin` (U6).
 * Версия не создаётся, глоссарий не меняется; деньги — строкой `LlmMoney`, как на экране
 * «LLM settings».
 */

import type { PaginatedResult } from './common';
import type { LlmMoney, LlmOperation } from './llm';

/** Строка оценки досье или глоссария, которые строятся раньше перевода своими операциями. */
export interface CompareContextLine {
  estimateUsd: LlmMoney;
  /** Лимит их операции: оценка × 1,5; обязан влезть в лимит сравнения. */
  suggestedLimitUsd: LlmMoney;
  /** Досье ещё нет: оценка сверху по размеру ответа досье. */
  upperBound: boolean;
}

/** Ответ `GET /admin/versions/:id/translation-compare/estimate`. */
export interface TranslationCompareEstimate {
  chapterNumber: number;
  targetLanguage: string;
  /** Кусков по границам кода. */
  chunks: number;
  /** `null` — досье готово или уже строится. */
  dossier: CompareContextLine | null;
  /** `null` — глоссарий готов или уже строится. */
  glossary: CompareContextLine | null;
  splitUsd: LlmMoney;
  models: Array<{ model: string; estimateUsd: LlmMoney }>;
  /** Оценки моделей включают досье и глоссарий, которых ещё нет, сверху. */
  upperBound: boolean;
  translationsUsd: LlmMoney;
  suggestedLimitUsd: LlmMoney;
}

/** Параметры оценки и тело запуска: глава, язык цели, 2–4 модели. */
export interface TranslationCompareParams {
  chapterNumber: number;
  targetLanguage: string;
  models: string[];
}

/** Тело `POST /admin/versions/:id/translation-compare`. */
export interface StartTranslationCompareRequest extends TranslationCompareParams {
  /** Не задан — предложенный лимит оценки. */
  limitUsd?: LlmMoney;
}

/** `queued` у операции на паузе — остановлено её `pauseReason`. */
export type TranslationCompareModelStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';

/** Колонка модели. */
export interface TranslationCompareResult {
  model: string;
  position: number;
  status: TranslationCompareModelStatus;
  chunksDone: number;
  /** Глава целиком, когда готова; частичного текста нет. */
  html: string | null;
  /** Код причины, по которой модель упала. */
  error: string | null;
  costUsd: LlmMoney;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

/** Строка списка `GET /admin/versions/:id/translation-compares`. */
export interface TranslationCompareListItem {
  id: string;
  bookVersionId: string;
  chapterNumber: number;
  language: string;
  operation: LlmOperation;
  models: string[];
  createdAt: string;
}

export type TranslationCompareListResponse = PaginatedResult<TranslationCompareListItem>;

/** Ответ `GET /admin/translation-compares/:id` и `POST` запуска. */
export interface TranslationCompare extends TranslationCompareListItem {
  chapterTitle: string | null;
  /** Текущий текст главы исходника; `null` — главы больше нет. */
  originalHtml: string | null;
  /** `null` — глава ещё не нарезана. */
  chunks: number | null;
  /** Ждёт досье или глоссарий. */
  waitingForContext: boolean;
  /** `null` — вызовов `split` не было. */
  splitCostUsd: LlmMoney | null;
  results: TranslationCompareResult[];
}
