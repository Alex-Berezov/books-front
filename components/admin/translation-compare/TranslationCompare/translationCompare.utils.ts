import { COMPARE_MAX_MODELS, COMPARE_MIN_MODELS } from '@/api/hooks/useTranslationCompare';
import { isValidMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { ApiError } from '@/types/api';
import type {
  LlmOperation,
  StartTranslationCompareRequest,
  TranslationCompareParams,
  TranslationCompareResult,
} from '@/types/api-schema';

/** Подписи отказов оценки и запуска по коду бэкенда (`api/endpoints/admin/translation.ts`). */
const REFUSALS: Record<string, string> = {
  LLM_DISABLED: 'The OpenRouter key is not configured on the server: nothing can call a model.',
  LLM_MODELS_UNAVAILABLE: 'The OpenRouter model list is unavailable. Try later.',
  LLM_CEILING_REACHED: 'The LLM spending ceiling is reached. Raise it on the LLM settings screen.',
  LLM_NO_PRICE:
    'A selected model has no fixed price and the translate stage has no price cap (LLM settings).',
  LLM_STAGE_DISABLED: 'The translate stage is switched off on the LLM settings screen.',
  LLM_MODEL_UNKNOWN: 'A selected model is not in the OpenRouter list.',
  COMPARE_TARGET_IS_SOURCE: 'The target language is the language of the source.',
  COMPARE_CHAPTER_EMPTY: 'The chapter has no text.',
  COMPARE_LIMIT_TOO_LOW:
    'The limit is lower than the dossier and glossary built first need: see the suggested limit.',
  NOT_IN_INTAKE: 'The target language is not in the rights intake of the book.',
  NOT_ORIGINAL_VERSION:
    'This version is not the original: compare on the version in the original language.',
  NOT_ENGLISH_VERSION:
    'The original is in a language outside the site: compare on the English version.',
  ORIGINAL_VERSION_MISSING: 'The book has no version in its original language.',
  ENGLISH_VERSION_MISSING:
    'The original is outside the site languages and there is no English version.',
  SOURCE_LANGUAGE_UNKNOWN: 'The original language of the book is not set or not recognised.',
  SOURCE_HAS_NO_CHAPTERS: 'The source version has no chapter text.',
  SOURCE_TOO_MANY_CHAPTERS: 'The source has too many chapters for a dossier.',
  INTAKE_TARGETS_MISSING: 'The rights intake of the book has no target languages.',
};

export const refusalText = (error: unknown): string => {
  if (error instanceof ApiError) {
    const code = error.data?.code;
    if (typeof code === 'string' && REFUSALS[code]) return REFUSALS[code];
    return error.message || 'The request failed';
  }
  return 'The request failed';
};

const PAUSES: Record<NonNullable<LlmOperation['pauseReason']>, string> = {
  LIMIT_REACHED: 'the compare limit is reached',
  CEILING_REACHED: 'the spending ceiling is reached',
  NO_COMPLIANT_PROVIDER: 'no provider without data retention',
  DOSSIER_STALE: 'the dossier is stale',
  DOSSIER_PAUSED: 'the dossier build is paused',
  INSUFFICIENT_FUNDS: 'the OpenRouter balance is empty',
  STEP_FAILED: 'a step failed',
};

export const operationText = (op: LlmOperation, waitingForContext: boolean): string => {
  switch (op.status) {
    case 'active':
      return waitingForContext ? 'Building the dossier and glossary…' : 'Translating…';
    case 'paused':
      return `Paused: ${op.pauseReason ? PAUSES[op.pauseReason] : 'paused'}`;
    case 'done':
      return 'Done';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
  }
};

const MODEL_ERRORS: Record<string, string> = {
  COMPARE_INVALID_RESPONSE: 'answers did not match the blocks after two remarks',
  COMPARE_TOO_LONG: 'the piece does not fit the model context',
  COMPARE_CHAPTER_TOO_LONG: 'the translated chapter is longer than the chapter limit',
  COMPARE_CHAPTER_CHANGED: 'the chapter text changed after the start',
  LLM_NO_COMPLIANT_PROVIDER: 'no provider without data retention',
  LLM_PROVIDER_ERROR: 'the provider refused',
  LLM_UNAVAILABLE: 'the model is unavailable',
  LLM_NO_PRICE: 'the model has no price',
  LLM_STAGE_DISABLED: 'the translate stage is switched off',
};

/** Состояние колонки: недоделанная колонка операции на паузе — остановлена её причиной. */
export const resultText = (result: TranslationCompareResult, op: LlmOperation): string => {
  if (result.status === 'failed') {
    return `Failed: ${result.error ? (MODEL_ERRORS[result.error] ?? result.error) : 'unknown'}`;
  }
  if (result.status === 'done') return 'Done';
  if (result.status === 'cancelled') return 'Cancelled';
  if (op.status === 'paused') return operationText(op, false);
  return result.status === 'running' ? 'Translating…' : 'Queued';
};

/** Лимит пустой (предложенный оценкой) или деньги в формате сервера. */
export const isLimitOk = (limit: string): boolean => limit.trim() === '' || isValidMoney(limit);

/**
 * Запуск возможен: ключ есть, глава и язык выбраны, моделей 2–4, лимит пустой или верный,
 * оценка пришла и запуск не идёт. Деньги тратятся только после всего этого.
 */
export const canStartCompare = (state: {
  keyMissing: boolean;
  params: TranslationCompareParams | null;
  limit: string;
  estimateReady: boolean;
  pending: boolean;
}): boolean =>
  !state.keyMissing &&
  state.params !== null &&
  state.params.models.length >= COMPARE_MIN_MODELS &&
  state.params.models.length <= COMPARE_MAX_MODELS &&
  isLimitOk(state.limit) &&
  state.estimateReady &&
  !state.pending;

/** Тело запуска: пустой лимит не уходит вовсе — сервер берёт предложенный оценкой. */
export const startRequest = (
  params: TranslationCompareParams,
  limit: string
): StartTranslationCompareRequest => ({
  ...params,
  ...(limit.trim() ? { limitUsd: limit.trim() } : {}),
});
