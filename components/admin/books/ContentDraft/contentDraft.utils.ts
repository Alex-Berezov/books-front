import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import {
  DOSSIER_REFUSED_TEXT,
  operationPauseText,
  refusalText as runRefusalText,
  runRefusalOf,
} from '@/components/admin/translation-run/translationRun.utils';
import { pluralize } from '@/lib/i18n/plural';
import { ApiError } from '@/types/api';
import type {
  CompareContextLine,
  ContentDraftAcceptAll,
  ContentDraftRun,
  DossierContextLine,
  DossierEstimate,
  LlmMoney,
  LlmOperation,
  SummaryWriteReview,
} from '@/types/api-schema';

/** `REGEN_REMARK_MAX` бэкенда (`summary-write.constants.ts`): замечание «Regenerate» у обоих ходов. */
export const REGEN_REMARK_MAX = 2000;

/** «3 proposals», «1 regeneration» — счёт в строках ходов. */
export const pluralWord = (n: number, word: string): string =>
  `${n} ${pluralize(n, 'en', { one: word, few: `${word}s`, many: `${word}s` })}`;

/**
 * Общие отказы ходов из досье (старт, оценка); свои коды — у таблиц ходов. Общие коды LLM
 * (`LLM_DISABLED`, `LLM_MODELS_UNAVAILABLE`, `LLM_NO_PRICE` …) — подписями запуска перевода,
 * одними на админку.
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

/** Подпись отказа по коду: своя, затем запуска перевода (как `refusalText`); чужой код — `undefined`. */
export const refusalTextOfCode = (code: string): string | undefined =>
  REFUSALS[code] ?? runRefusalOf(code);

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
 * Окончательные отказы ходов из досье (`failedReason`): таблицы ходов пересказа (F06) и анализа
 * (F07) дополняют эту своими кодами.
 */
export const DRAFT_FAILURES: Readonly<Record<string, string>> = {
  DRAFT_INVALID_RESPONSE: 'the model answered not in the expected form',
  DRAFT_TOO_LONG: 'the text is too long for the model or for the field',
  DRAFT_DOSSIER_MISSING: 'the dossier is gone',
  DRAFT_INPUT_MISSING: 'the version has no chapter text or the dossier is gone',
  DRAFT_CANCELLED: 'its operation was cancelled',
  DRAFT_DATA_INVALID: 'the stored run data is broken',
  EXTERNAL_UNVERIFIED: 'no statement of the block was confirmed by a source',
};

const SOURCE_REASON: Record<string, string> = {
  SOURCE_UNREACHABLE: 'did not open',
  SOURCE_UNRELATED: 'names neither the book nor the author',
};

/** Источник, снятый проверкой хода (`droppedSources`): название, хост и причина; общее у анализа и мира. */
export const droppedSourceText = (s: { title: string; host: string; reason: string }): string =>
  `${s.title} (${s.host}) — ${SOURCE_REASON[s.reason] ?? s.reason}`;

/** Причина словами; неизвестный код — сам код, нет кода — «unknown reason». */
export const failureReason = (
  reason: string | null,
  table: Readonly<Record<string, string>> = DRAFT_FAILURES
): string => (reason ? (table[reason] ?? reason) : 'unknown reason');

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

export const dossierEstimateText = (estimate: DossierEstimate): string =>
  estimate.refusedTooLong
    ? DOSSIER_REFUSED_TEXT
    : `A new dossier generation is built from ${estimate.chapters} chapters: up to ${formatMoney(estimate.estimateUsd)}, limit ${formatMoney(estimate.suggestedLimitUsd)}.`;

/** Почему проверки моделью не было (`review.kind` кроме `answered`). */
const REVIEW_SKIPPED: Record<Exclude<SummaryWriteReview['kind'], 'answered'>, string> = {
  not_independent: 'no reviewer model of another family than the author',
  too_long: 'the text does not fit the reviewer model',
  invalid: 'the reviewer model answered not in the expected form',
  no_provider: 'no compliant provider for the reviewer model',
  unavailable: 'the reviewer model is unavailable',
};

/** Строка «не проверено моделью» или `null`, когда модель проверила. */
export const reviewSkippedText = (review: SummaryWriteReview | null): string | null => {
  if (review?.kind === 'answered') return null;
  return review
    ? `Model check: not done (${REVIEW_SKIPPED[review.kind]}).`
    : 'Model check: not done.';
};

/**
 * Что теряет новый старт поверх готового хода (сервер отбрасывает прежний): непринятые
 * предложения и идущие перегенерации. Нечего терять — пустая строка. Одно правило у обоих ходов;
 * что считать предложением — правило своего хода.
 */
export const runStartLossText = <I extends { regenerating: boolean }>(
  run: { status: string; items: I[] } | null,
  isPending: (item: I) => boolean
): string => {
  if (run?.status !== 'ready') return '';
  const pending = run.items.filter(isPending).length;
  const regenerating = run.items.filter((i) => i.regenerating).length;
  if (pending === 0 && regenerating === 0) return '';
  const parts = [
    pending > 0 ? `${pluralWord(pending, 'proposal')} not accepted will be discarded` : '',
    regenerating > 0 ? `${pluralWord(regenerating, 'regeneration')} will be cancelled` : '',
  ].filter(Boolean);
  return `This replaces the current run: ${parts.join(', ')}.`;
};

/** Вид хода в ответе общих ручек `content-drafts/:id/*` (форма по виду строки, `ContentDraftRun`). */
export type ContentDraftKind = 'summary_write' | 'analysis_write' | 'world_write';

/**
 * Вид хода по форме ответа общей ручки — одно правило на все ходы: ход мира отличают `candidates`,
 * ход анализа — `steps` без `candidates`, остальное — ход пересказа.
 */
export const contentDraftKindOf = (
  run: ContentDraftRun | ContentDraftAcceptAll
): ContentDraftKind =>
  'candidates' in run ? 'world_write' : 'steps' in run ? 'analysis_write' : 'summary_write';

/**
 * Пропущенные пункты из тела 409 «не готов» (обрыв «Accept all», код `notReadyCode` своего хода);
 * иной отказ — пусто.
 */
export const skippedOfError = <S>(error: unknown, notReadyCode: string): S[] => {
  if (!(error instanceof ApiError) || refusalCode(error) !== notReadyCode) return [];
  const skipped = (error.data as { skipped?: unknown } | undefined)?.skipped;
  return Array.isArray(skipped) ? (skipped as S[]) : [];
};

/** Блок хода анализа или мира: то, что нужно общим правилам порядка и судьбы. */
interface StepBlock {
  index: number;
  step: number;
  outcome: string;
  verdict: string;
  failedReason: string | null;
}

/** Блоки по шагам, внутри шага — по номеру в ходе (ход анализа и ход мира). */
export const sortItems = <I extends StepBlock>(items: I[]): I[] =>
  [...items].sort((a, b) => a.step - b.step || a.index - b.index);

/**
 * Блок не записан штатно: шагу нечего добавить — причины нет и вердикт не «не удалось».
 * Показывается нейтрально, а не отказом.
 */
export const isNothingToAdd = (item: StepBlock): boolean =>
  item.outcome === 'none' && item.failedReason === null && item.verdict !== 'failed';

/** Предложение блока ждёт решения редактора (ход анализа и ход мира). */
export const isPending = (item: Pick<StepBlock, 'outcome'>): boolean => item.outcome === 'proposed';
