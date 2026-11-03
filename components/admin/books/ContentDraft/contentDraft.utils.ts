import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import {
  DOSSIER_REFUSED_TEXT,
  operationPauseText,
  refusalText as runRefusalText,
} from '@/components/admin/translation-run/translationRun.utils';
import { ApiError } from '@/types/api';
import type {
  CompareContextLine,
  ContentDraft,
  ContentDraftEstimate,
  DossierContextLine,
  DossierEstimate,
  LlmMoney,
  LlmOperation,
} from '@/types/api-schema';

/** Кнопка заготовки Analysis (F05 `product.md` §5.3); пересказ пишет ход «Write Summary» (F06). */
export const DRAFT_BUTTON = 'Draft from dossier';

/** Что теряет «Discard draft» у готовой заготовки. */
export const DISCARD_LOSS =
  'The draft JSON not imported into the form and the list of thrown away quotes are lost;';

/**
 * Свои отказы заготовки (`api/endpoints/admin/content-draft.ts`); общие коды LLM (`LLM_DISABLED`,
 * `LLM_MODELS_UNAVAILABLE`, `LLM_NO_PRICE` …) — подписями запуска перевода, одними на админку.
 */
const REFUSALS: Record<string, string> = {
  DRAFT_IN_PROGRESS: 'A draft of this kind is already being built.',
  SOURCE_HAS_NO_CHAPTERS: 'This version has no chapter text to draft from.',
  DOSSIER_STALE: 'The book text changed after the dossier was built: rebuild the dossier.',
  DRAFT_DOSSIER_MISSING: 'The dossier of the translation run that made this version is gone.',
  RUN_LANGUAGE_UNFINISHED:
    'The translation run is still writing this version: wait until it finishes.',
  DRAFT_LIMIT_TOO_LOW: 'The limit is below the limits of the dossier and glossary built first.',
  LLM_CEILING_REACHED: 'The spending ceiling is reached: raise it in LLM settings.',
  DOSSIER_FRESH: 'The dossier is already fresh.',
  DRAFT_TOO_LONG:
    'The book text does not fit the analysis model: choose a model with a larger context in LLM settings.',
};

/** Код отказа из тела ответа; нет — `null`. */
export const refusalCode = (error: unknown): string | null => {
  const code = error instanceof ApiError ? error.data?.code : null;
  return typeof code === 'string' ? code : null;
};

export const refusalText = (error: unknown): string => {
  const code = refusalCode(error);
  return code && REFUSALS[code] ? REFUSALS[code] : runRefusalText(error);
};

/**
 * Окончательные отказы заготовки (`failedReason`), общие с ходом пересказа (F06): его таблица
 * дополняет эту своими кодами.
 */
export const DRAFT_FAILURES: Readonly<Record<string, string>> = {
  DRAFT_INVALID_RESPONSE: 'the model answered not in the expected form',
  DRAFT_TOO_LONG: 'the text is too long for the model or for the field',
  DRAFT_DOSSIER_MISSING: 'the dossier is gone',
  DRAFT_INPUT_MISSING: 'the version has no chapter text or the dossier is gone',
  DRAFT_CANCELLED: 'its operation was cancelled',
};

/** Причина словами; неизвестный код — сам код, нет кода — «unknown reason». */
export const failureReason = (
  reason: string | null,
  table: Readonly<Record<string, string>> = DRAFT_FAILURES
): string => (reason ? (table[reason] ?? reason) : 'unknown reason');

export const failedText = (reason: string | null): string => `Failed: ${failureReason(reason)}.`;

/** Ход фоном: пауза операции с причиной, ожидание досье и глоссария; иначе — `writing`. */
export const operationStatusText = (
  operation: LlmOperation,
  waitingFor: 'dossier' | 'glossary' | null,
  writing: string
): string => {
  if (operation.status === 'paused') {
    return `Paused: ${operationPauseText(operation.pauseReason)}.`;
  }
  if (waitingFor === 'dossier') return 'Building the dossier first…';
  if (waitingFor === 'glossary') return 'Building the glossary of this language first…';
  return writing;
};

/** Ход строящейся заготовки: чего ждёт, пауза операции. */
export const buildingText = (draft: ContentDraft): string =>
  operationStatusText(draft.operation, draft.waitingFor, 'Building the draft…');

/** Строки окна старта о том, что строится первым: досье (или его отказ) и глоссарий. */
export const contextEstimateLines = (estimate: {
  dossier: DossierContextLine | null;
  glossary: CompareContextLine | null;
}): string[] => {
  const lines: string[] = [];
  if (estimate.dossier?.refusedTooLong) {
    lines.push(DOSSIER_REFUSED_TEXT);
  } else if (estimate.dossier) {
    lines.push(`The dossier is built first: up to ${formatMoney(estimate.dossier.estimateUsd)}.`);
  }
  if (estimate.glossary) {
    lines.push(
      `The glossary of this language is built first: up to ${formatMoney(estimate.glossary.estimateUsd)}.`
    );
  }
  return lines;
};

export const limitLine = (suggestedLimitUsd: LlmMoney): string =>
  `Operation limit: ${formatMoney(suggestedLimitUsd)}.`;

/** Окно подтверждения старта: что строится первым и сколько стоит сверху. */
export const estimateText = (estimate: ContentDraftEstimate): string => {
  const upper = estimate.upperBound ? ' (the dossier is not built yet: upper estimate)' : '';
  return [
    ...contextEstimateLines(estimate),
    `The draft: up to ${formatMoney(estimate.stageUsd)}${upper}.`,
    limitLine(estimate.suggestedLimitUsd),
  ].join(' ');
};

export const dossierEstimateText = (estimate: DossierEstimate): string =>
  estimate.refusedTooLong
    ? DOSSIER_REFUSED_TEXT
    : `A new dossier generation is built from ${estimate.chapters} chapters: up to ${formatMoney(estimate.estimateUsd)}, limit ${formatMoney(estimate.suggestedLimitUsd)}.`;
