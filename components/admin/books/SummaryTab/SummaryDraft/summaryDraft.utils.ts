import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import {
  operationPauseText,
  refusalText as runRefusalText,
} from '@/components/admin/translation-run/translationRun.utils';
import { ApiError } from '@/types/api';
import type {
  ContentDraft,
  ContentDraftEstimate,
  DossierEstimate,
  SummaryDraftKind,
} from '@/types/api-schema';

/** Кнопка шага: шаги идут по одному, кнопки «всё сразу» нет (`product.md` §5.2). */
export const DRAFT_BUTTON: Record<SummaryDraftKind, string> = {
  summary_sections: 'Draft sections from dossier',
  summary_full: 'Draft full summary from saved sections',
  summary_brief: 'Draft very short summary from saved full summary',
};

/**
 * Свои отказы заготовки (`api/endpoints/admin/content-draft.ts`); общие коды LLM (`LLM_DISABLED`,
 * `LLM_MODELS_UNAVAILABLE`, `LLM_NO_PRICE` …) — подписями запуска перевода, одними на админку.
 */
const REFUSALS: Record<string, string> = {
  DRAFT_IN_PROGRESS: 'A draft of this kind is already being built.',
  SUMMARY_SECTIONS_MISSING: 'Save at least one summary section with text first.',
  SUMMARY_FULL_MISSING: 'Save the full summary with text first.',
  DOSSIER_STALE: 'The book text changed after the dossier was built: rebuild the dossier.',
  DRAFT_DOSSIER_MISSING: 'The dossier of the translation run that made this version is gone.',
  RUN_LANGUAGE_UNFINISHED:
    'The translation run is still writing this version: wait until it finishes.',
  DRAFT_NOT_READY: 'The draft is no longer ready: reload it.',
  DRAFT_SECTION_UNKNOWN: 'The draft has no such section.',
  DRAFT_LIMIT_TOO_LOW: 'The limit is below the limits of the dossier and glossary built first.',
  LLM_CEILING_REACHED: 'The spending ceiling is reached: raise it in LLM settings.',
  DOSSIER_FRESH: 'The dossier is already fresh.',
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

/** Окончательные отказы заготовки (`failedReason`). */
const FAILURES: Record<string, string> = {
  DRAFT_INVALID_RESPONSE: 'the model answered not in the expected form',
  DRAFT_TOO_LONG: 'the text is too long for the model or for the field',
  DRAFT_NO_PLAN: 'the dossier has no plan of sections',
  DRAFT_DOSSIER_MISSING: 'the dossier is gone',
  DRAFT_INPUT_MISSING: 'the saved text it was built from is gone',
  DRAFT_CANCELLED: 'its operation was cancelled',
};

export const failedText = (reason: string | null): string =>
  `Failed: ${(reason && FAILURES[reason]) ?? reason ?? 'unknown reason'}.`;

/** Ход строящейся заготовки: чего ждёт, сколько разделов готово, пауза операции. */
export const buildingText = (draft: ContentDraft): string => {
  if (draft.operation.status === 'paused') {
    return `Paused: ${operationPauseText(draft.operation.pauseReason)}.`;
  }
  if (draft.waitingFor === 'dossier') return 'Building the dossier first…';
  if (draft.waitingFor === 'glossary') return 'Building the glossary of this language first…';
  if (draft.kind === 'summary_sections' && draft.plannedSections !== null) {
    return `Building the draft: ${draft.sections?.length ?? 0} of ${draft.plannedSections} sections…`;
  }
  return 'Building the draft…';
};

/** Окно подтверждения старта: что строится первым и сколько стоит сверху. */
export const estimateText = (estimate: ContentDraftEstimate): string => {
  const lines: string[] = [];
  if (estimate.dossier) {
    lines.push(`The dossier is built first: up to ${formatMoney(estimate.dossier.estimateUsd)}.`);
  }
  if (estimate.glossary) {
    lines.push(
      `The glossary of this language is built first: up to ${formatMoney(estimate.glossary.estimateUsd)}.`
    );
  }
  const sections =
    estimate.sections !== null
      ? ` (${estimate.sections} sections)`
      : estimate.upperBound
        ? ' (the plan is not known yet: one section per chapter)'
        : '';
  lines.push(`The draft: up to ${formatMoney(estimate.stageUsd)}${sections}.`);
  lines.push(`Operation limit: ${formatMoney(estimate.suggestedLimitUsd)}.`);
  return lines.join(' ');
};

export const dossierEstimateText = (estimate: DossierEstimate): string =>
  `A new dossier generation is built from ${estimate.chapters} chapters: up to ${formatMoney(estimate.estimateUsd)}, limit ${formatMoney(estimate.suggestedLimitUsd)}.`;
