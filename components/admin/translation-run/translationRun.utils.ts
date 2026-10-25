import {
  isValidMoney,
  modelOptionLabel,
} from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { ApiError } from '@/types/api';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  LlmModel,
  LlmOperation,
  StartTranslationRunRequest,
  TranslationBlockReason,
  TranslationFinalCheckStatus,
  TranslationRun,
  TranslationRunLanguage,
  TranslationRunLanguageStatus,
  TranslationRunStage,
  TranslationRunStageModels,
  TranslationSource,
  TranslationTargetReason,
} from '@/types/api-schema';

/**
 * Причины `translation-source` (`product.md` §2.1, Р14): одна подпись на код — и у неактивной
 * кнопки, и в отказе оценки или старта с тем же кодом.
 */
const BLOCK_REASONS: Record<TranslationBlockReason, string> = {
  SOURCE_LANGUAGE_UNKNOWN: 'Set the original language of the book.',
  ORIGINAL_VERSION_MISSING: 'Upload a version in the original language.',
  ENGLISH_VERSION_MISSING:
    'The original is outside the site languages and there is no English version.',
  NOT_ORIGINAL_VERSION: 'Translate from the version in the original language.',
  NOT_ENGLISH_VERSION:
    'The original is outside the site languages: translate from the English version.',
  SOURCE_HAS_NO_CHAPTERS: 'This version has no chapter text to translate.',
  INTAKE_TARGETS_MISSING: 'The rights intake of the book has no target languages.',
  NO_AVAILABLE_TARGETS: 'Nothing to translate into: every language is unavailable.',
};

/** Подсказка у неактивной кнопки; нет версии на языке оригинала — с его кодом (Р14). */
export const blockText = (source: TranslationSource): string => {
  if (source.reason === null) return '';
  if (source.reason === 'ORIGINAL_VERSION_MISSING') {
    return `Upload a version in the original language (${source.sourceLanguage ?? '?'}).`;
  }
  return BLOCK_REASONS[source.reason];
};

/** Поле «язык оригинала» у версий книги расходится: какое значение взято (§2.1). */
export const mismatchText = (source: TranslationSource): string | null =>
  source.originalLanguageMismatch
    ? `The original language differs between versions of the book; taken from the source: ${source.originalLanguageRaw ?? 'empty'}.`
    : null;

/** Почему язык недоступен в окне запуска (§2.2, §7 п.10). */
export const TARGET_REASONS: Record<TranslationTargetReason, string> = {
  IS_SOURCE: 'the language of the source',
  VERSION_EXISTS: 'a version already exists',
  TRANSLATION_IN_PROGRESS: 'a translation into it is in progress',
  NOT_IN_INTAKE: 'not in the rights intake of the book',
};

/** Отказы оценки, старта и кнопок запуска по коду бэкенда (`api/endpoints/admin/translation.ts`). */
const REFUSALS: Record<string, string> = {
  ...BLOCK_REASONS,
  LLM_DISABLED: 'The OpenRouter key is not configured on the server: nothing can call a model.',
  LLM_MODELS_UNAVAILABLE: 'The OpenRouter model list is unavailable. Try later.',
  LLM_NO_PRICE: 'A model has no fixed price and its stage has no price cap (LLM settings).',
  LLM_STAGE_DISABLED: 'A stage of the translation is switched off on the LLM settings screen.',
  LLM_MODEL_UNKNOWN: 'The model is not in the OpenRouter list.',
  CHECK_MODEL_SAME_FAMILY:
    'The meaning check has no model of another family than the translation model: pick another translation model or change the check stage in LLM settings.',
  TRANSLATION_TARGET_UNAVAILABLE: 'A selected language is no longer available.',
  TRANSLATION_SOURCE_EMPTY: 'The chapters have nothing to translate.',
  TRANSLATION_RUN_LIMIT_TOO_LOW:
    'The limit is lower than the dossier and glossaries built first need: see the minimum.',
  SOURCE_TOO_MANY_CHAPTERS: 'The source has too many chapters for a dossier.',
  TRANSLATION_RUN_NOT_PAUSABLE: 'The run is not running.',
  LLM_OPERATION_NOT_RESUMABLE: 'The run cannot be resumed from this state.',
  LLM_OPERATION_NOT_CANCELLABLE: 'The run is already finished.',
  TRANSLATION_RUN_MODELS_CHANGED: 'The models were changed at the same time. Try again.',
  RETRY_IN_PROGRESS: 'A piece is being retried. Try again in a moment.',
};

interface UnavailableLanguage {
  language: string;
  reason: string;
}

const unavailableOf = (data: unknown): UnavailableLanguage[] => {
  if (typeof data !== 'object' || data === null) return [];
  const list = (data as { languages?: unknown }).languages;
  return Array.isArray(list)
    ? list.filter(
        (l): l is UnavailableLanguage =>
          typeof l === 'object' &&
          l !== null &&
          typeof (l as UnavailableLanguage).language === 'string' &&
          typeof (l as UnavailableLanguage).reason === 'string'
      )
    : [];
};

export const refusalText = (error: unknown): string => {
  if (!(error instanceof ApiError)) return 'The request failed';
  const code = error.data?.code;
  if (code === 'TRANSLATION_TARGET_UNAVAILABLE') {
    const languages = unavailableOf(error.data)
      .map(
        (l) =>
          `${l.language.toUpperCase()}: ${TARGET_REASONS[l.reason as TranslationTargetReason] ?? l.reason}`
      )
      .join('; ');
    return languages ? `${REFUSALS[code]} ${languages}.` : REFUSALS[code];
  }
  if (typeof code === 'string' && REFUSALS[code]) return REFUSALS[code];
  return error.message || 'The request failed';
};

/** Лимит пустой (умолчание `defaultRunLimitUsd`) или деньги в формате сервера. */
export const isLimitOk = (limit: string): boolean => limit.trim() === '' || isValidMoney(limit);

/** Пункты выбора модели: одна подпись с ценой на окно запуска и на паузу без провайдера. */
export const toModelOptions = (models: LlmModel[]): Array<{ value: string; label: string }> =>
  models.map((m) => ({ value: m.id, label: modelOptionLabel(m) }));

/** Тело старта: пустой лимит и модель этапа по умолчанию не уходят — сервер берёт свои. */
export const startRunRequest = (
  languages: SupportedLang[],
  translateModel: string | null,
  limit: string
): StartTranslationRunRequest => ({
  languages,
  ...(translateModel ? { translateModel } : {}),
  ...(limit.trim() ? { limitUsd: limit.trim() } : {}),
});

/** Этапы настроек словами экрана (окно запуска, отчёт о стоимости, пауза без провайдера). */
const STAGE_NAMES: Record<string, string> = {
  dossier: 'Dossier',
  dossier_part: 'Dossier',
  glossary: 'Glossary',
  split: 'Chapter split',
  translate: 'Translation',
  check_semantic: 'Meaning check',
  check_language_jev: 'Language review',
  metadata: 'Version fields',
  final_check: 'Final check',
};

export const stageName = (stage: string): string => STAGE_NAMES[stage] ?? stage;

const STAGES: Record<TranslationRunStage, string> = {
  dossier: 'building the dossier',
  glossary: 'building the glossary',
  translate: 'translating',
  check: 'checking',
  assemble: 'assembling chapters',
  done: 'done',
  failed: 'failed',
  cancelled: 'cancelled',
};

/** Этап языка; сборка с черновиком — главы пишутся в черновик (решение арбитра `F05 | F05-7`). */
export const stageText = (lang: TranslationRunLanguage): string =>
  lang.stage === 'assemble' && lang.draftVersionId !== null
    ? 'writing chapters into the draft'
    : STAGES[lang.stage];

/** «Глава N из M»; до первой главы — только M. */
export const chapterText = (lang: TranslationRunLanguage): string =>
  lang.chapterPosition === null
    ? `${lang.chaptersTotal} chapters`
    : `chapter ${lang.chapterPosition} of ${lang.chaptersTotal}`;

const RUN_STATUSES: Record<LlmOperation['status'], string> = {
  active: 'running',
  paused: 'paused',
  done: 'finished',
  failed: 'failed',
  cancelled: 'cancelled',
};

export const runStatusText = (op: LlmOperation): string => RUN_STATUSES[op.status];

/** Подпись упавшего языка по коду (карточка F05-7, шаг 3); неизвестный код — как есть. */
const FAILED: Record<string, string> = {
  VERSION_EXISTS: 'A version in this language already exists.',
  DRAFT_DELETED: 'The draft version was deleted; a second one is not created.',
  DOSSIER_STALE: 'The source changed while another language was writing its draft.',
  NO_CHAPTERS_WRITTEN: 'No chapter could be assembled: nothing went to the draft.',
  METADATA_INVALID: 'The version fields did not pass the checks after a retry.',
  METADATA_TOO_LONG: 'The version fields do not fit the model context.',
};

export const failedText = (lang: { reason: string | null; reasonText: string | null }): string => {
  if (lang.reason === 'CREATE_REJECTED') {
    return `The draft version was refused: ${lang.reasonText ?? 'no text'}`;
  }
  if (lang.reason && FAILED[lang.reason]) return FAILED[lang.reason];
  return lang.reason ? `Failed: ${lang.reason}` : 'Failed.';
};

/** Статус языка запуска словами: один на отчёт и историю запусков (F05-8). */
const LANGUAGE_STATUSES: Record<TranslationRunLanguageStatus, string> = {
  pending: 'waiting',
  running: 'in progress',
  done: 'done',
  failed: 'failed',
  cancelled: 'cancelled',
};

export const languageStatusText = (status: TranslationRunLanguageStatus): string =>
  LANGUAGE_STATUSES[status];

/** Отказ шага (`STEP_FAILED`) — текст по коду; текста сервиса у этих кодов нет. */
const STEP_FAILURES: Record<string, string> = {
  LLM_PROVIDER_ERROR: 'the model provider refused the request',
  LLM_UNAVAILABLE: 'the model is unavailable',
  LLM_NO_PRICE: 'the model has no price',
  LLM_STAGE_DISABLED: 'the stage is switched off in LLM settings',
  CHUNK_STATUS_UNEXPECTED: 'a piece was in an unexpected state',
  TOO_MANY_ATTEMPTS: 'the step failed too many times',
  DOSSIER_TOO_LONG: 'the dossier does not fit the model context',
  CHUNK_TOO_LONG: 'a piece does not fit the model context',
  CHUNK_INVALID_RESPONSE: 'the model answer for a piece was not valid',
};

export const stepFailureText = (reason: string | null): string =>
  reason ? (STEP_FAILURES[reason] ?? reason) : 'no reason given';

/**
 * Последняя остановка незакончившегося языка (F05-8): деньги и провайдеры
 * (`books/src/modules/translation/pause-by-failure.ts`), досье и глоссарий
 * (`run/translation-run-tasks.handler.ts`), провайдер своего этапа; прочее — отказ шага. Ожидание
 * строящихся досье и глоссария причиной языка не пишется (`waitingFor`) — подписи ему нет.
 */
const LANGUAGE_STOPS: Record<string, string> = {
  'LLM_BUDGET_EXCEEDED:operation': 'the run limit is reached',
  'LLM_BUDGET_EXCEEDED:ceiling': 'the spending ceiling is reached',
  LLM_INSUFFICIENT_FUNDS: 'the OpenRouter balance is empty',
  LLM_NO_COMPLIANT_PROVIDER: 'no provider without data retention for the translation model',
  CHECK_NO_COMPLIANT_PROVIDER: 'no provider without data retention for the meaning check',
  METADATA_NO_COMPLIANT_PROVIDER: 'no provider without data retention for the version fields',
  FINAL_CHECK_NO_COMPLIANT_PROVIDER: 'no provider without data retention for the final check',
  DOSSIER_LIMIT_TOO_LOW: 'the run limit is lower than the dossier or glossary limit',
  DOSSIER_PAUSED: 'waits for the dossier',
  DOSSIER_STALE: 'the source changed',
  STEP_FAILED: 'the dossier or glossary it waited for failed or was cancelled',
};

export const languageStopText = (reason: string): string =>
  LANGUAGE_STOPS[reason] ?? stepFailureText(reason);

/** Этап, модель которого меняет «продолжить» на паузе без провайдера (решение арбитра `F05 | F05-7`). */
export type ProviderStage = keyof TranslationRunStageModels;

const PROVIDER_STAGES: Record<string, ProviderStage> = {
  CHECK_NO_COMPLIANT_PROVIDER: 'check_semantic',
  METADATA_NO_COMPLIANT_PROVIDER: 'metadata',
  FINAL_CHECK_NO_COMPLIANT_PROVIDER: 'final_check',
};

/** Этап паузы без провайдера по коду причины; `LLM_NO_COMPLIANT_PROVIDER` и прочее — перевод. */
export const providerStageOf = (reason: string | null | undefined): ProviderStage =>
  PROVIDER_STAGES[reason ?? ''] ?? 'translate';

/** Пауза до трат: лимиту запуска не хватило на досье или глоссарий (решение арбитра, /fix В2). */
export const DOSSIER_LIMIT_TOO_LOW = 'DOSSIER_LIMIT_TOO_LOW';

/** Действие, которое блок показывает на паузе запуска (карточка F05-7, шаг 3). */
export type PauseAction =
  | { kind: 'manual' }
  | { kind: 'limit' }
  | { kind: 'contextLimit'; neededUsd: string | null }
  | { kind: 'ceiling' }
  | { kind: 'provider'; stage: ProviderStage; models: string[] }
  | { kind: 'dossier'; operation: LlmOperation | null }
  | { kind: 'stale' }
  | { kind: 'contextFailed' }
  | { kind: 'funds' }
  | { kind: 'step'; reason: string | null }
  | { kind: 'unknown'; reason: string };

const stoppedLanguage = (run: TranslationRun): TranslationRunLanguage | undefined =>
  run.languages.find((l) => l.reason !== null && l.status !== 'done' && l.status !== 'failed');

export const pauseActionOf = (run: TranslationRun): PauseAction | null => {
  if (run.operation.status !== 'paused') return null;
  const lang = stoppedLanguage(run);
  switch (run.operation.pauseReason) {
    case null:
      return { kind: 'manual' };
    case 'LIMIT_REACHED': {
      // Каждый ждущий язык пишет свой минимум: «продолжить» должно пройти у всех - наибольший.
      const needed = run.languages
        .filter((l) => l.reason === DOSSIER_LIMIT_TOO_LOW)
        .map((l) => l.reasonUsd);
      if (needed.length === 0) return { kind: 'limit' };
      const amounts = needed.filter((a): a is string => a !== null);
      return {
        kind: 'contextLimit',
        neededUsd: amounts.length
          ? amounts.reduce((max, a) => (Number(a) > Number(max) ? a : max))
          : null,
      };
    }
    case 'CEILING_REACHED':
      return { kind: 'ceiling' };
    case 'NO_COMPLIANT_PROVIDER': {
      const provider = run.languages.find((l) => l.reasonModels.length > 0) ?? lang;
      return {
        kind: 'provider',
        stage: providerStageOf(provider?.reason),
        models: provider?.reasonModels ?? [],
      };
    }
    case 'DOSSIER_PAUSED': {
      const blockedBy = run.languages.find((l) => l.blockedByOperationId !== null);
      return {
        kind: 'dossier',
        operation: run.operations.find((o) => o.id === blockedBy?.blockedByOperationId) ?? null,
      };
    }
    case 'DOSSIER_STALE':
      return { kind: 'stale' };
    case 'INSUFFICIENT_FUNDS':
      return { kind: 'funds' };
    case 'STEP_FAILED':
      // Досье или глоссарий, которых ждал язык, отменили или они упали: «продолжить» встанет
      // на ту же паузу — только новый запуск (`dossier.service.ts`, ждущий на `STEP_FAILED`).
      return lang?.reason === 'STEP_FAILED'
        ? { kind: 'contextFailed' }
        : { kind: 'step', reason: lang?.reason ?? null };
    default:
      // Причина, которой экран ещё не знает: общее «продолжить» и код как есть.
      return { kind: 'unknown', reason: String(run.operation.pauseReason) };
  }
};

/** Причина паузы операции досье или глоссария: её же «продолжить» или «отменить». */
const OPERATION_PAUSES: Record<NonNullable<LlmOperation['pauseReason']>, string> = {
  LIMIT_REACHED: 'its own limit is reached: resume with a higher limit',
  CEILING_REACHED: 'the spending ceiling is reached: raise it in LLM settings',
  NO_COMPLIANT_PROVIDER: 'no provider without data retention',
  DOSSIER_STALE: 'the source changed',
  DOSSIER_PAUSED: 'waits for the dossier',
  INSUFFICIENT_FUNDS: 'the OpenRouter balance is empty',
  STEP_FAILED: 'a step failed',
};

/** Причина паузы своей операции: досье, глоссарий или попытка повтора куска. */
export const operationPauseText = (reason: LlmOperation['pauseReason']): string =>
  reason ? OPERATION_PAUSES[reason] : 'with the Pause button';

export const operationStatusText = (op: LlmOperation): string =>
  op.status === 'paused'
    ? `paused: ${operationPauseText(op.pauseReason)}`
    : RUN_STATUSES[op.status];

/**
 * Подписи кодов находок глав и флагов кусков отчёта (`product.md` §2.4): коды проверок куска
 * (`books/src/modules/translation/check/check.constants.ts`), стыков, итоговой проверки
 * и черновика. Неизвестный код — как есть.
 */
const FINDINGS: Record<string, string> = {
  LANGUAGE_MISMATCH: 'the piece is not in the target language',
  FOREIGN_SHARE: 'too much text in another language',
  FOREIGN_BLOCK: 'a block is in another language',
  LENGTH_OUT_OF_RANGE: 'the length differs too much from the source',
  BLOCKS_MISMATCH: 'blocks do not match the source',
  BLOCK_EMPTY: 'a block is empty',
  SERVICE_PHRASE: 'a service phrase of the model in the text',
  TRUNCATED: 'the text is cut off',
  JEV_LANGUAGE_MISMATCH: 'the reviewer found another language',
  SEMANTIC_FAIL: 'the meaning check found a mismatch',
  NOT_INDEPENDENT: 'no model of another family to check the meaning',
  CHECK_INPUT_TOO_LONG: 'the piece does not fit the check model context',
  CHECK_STAGE_UNAVAILABLE: 'the check model is unavailable',
  CHUNK_CHECK_INVALID_RESPONSE: 'the check model answer was not valid',
  CHUNK_TOO_LONG: 'a piece does not fit the model context',
  CHUNK_INVALID_RESPONSE: 'the model answer for a piece was not valid',
  CHUNK_STATUS_UNEXPECTED: 'a piece was in an unexpected state',
  CHAPTER_TOO_LONG: 'the chapter is longer than the chapter limit',
  CHUNK_UNTRANSLATED: 'a piece has no translation',
  CHUNKS_MISMATCH: 'the pieces do not cover the chapter',
  CHUNK_FLAGGED: 'a piece is flagged',
  SEAM_REPEAT: 'a block is repeated on a seam',
  SEAM_BROKEN: 'the text breaks on a seam',
  SEAM_CHECKED: 'the seam was checked, no problem',
  SEAM_NOT_INDEPENDENT: 'no model of another family to read the seam',
  SEAM_CHECK_UNAVAILABLE: 'the seam check model is unavailable',
  SEAM_CHECK_INVALID_RESPONSE: 'the seam check answer was not valid',
  SEAM_CHECK_INPUT_TOO_LONG: 'the seam does not fit the check model context',
  FINAL_CHECKED: 'the final check found no problem',
  FINAL_CHECK_FAIL: 'the final check found a problem',
  FINAL_NOT_INDEPENDENT: 'no model of another family for the final check',
  FINAL_CHECK_UNAVAILABLE: 'the final check model is unavailable',
  FINAL_CHECK_INVALID_RESPONSE: 'the final check answer was not valid',
  FINAL_CHECK_INPUT_TOO_LONG: 'the chapter does not fit the final check model context',
  GLOSSARY_SOURCE_FORM: 'a name stayed in the source spelling',
  CHAPTER_EMPTY: 'the translated chapter is empty',
  TITLE_MISSING: 'the chapter has no translated title',
  SOURCE_CHANGED: 'the source chapter changed after translation: not written',
};

export const findingText = (code: string): string => FINDINGS[code] ?? code;

export const FINAL_CHECK_TEXT: Record<TranslationFinalCheckStatus, string> = {
  pending: 'not reached yet',
  skipped: 'not performed',
  in_progress: 'in progress',
  done: 'done',
};

/** Подпись ссылки на черновик — одна в блоке и в отчёте. */
export const DRAFT_LINK_TEXT = 'Open draft';

/**
 * Почему повтор или правка куска не переписали главу черновика (`rewriteRefusal`, Р9; решение
 * арбитра `F05 | F05-7v`) — одна подпись и на экране кусков, и в отчёте. Коды сборки — словами
 * находок: глава из такого перевода не собирается.
 */
const REWRITE_REFUSALS: Record<string, string> = {
  CHAPTER_EDITED_MANUALLY: 'the chapter of the draft was edited by hand after it was written',
  VERSION_NOT_DRAFT: 'the version is no longer a draft',
  DRAFT_DELETED: 'the draft version was deleted',
  SOURCE_CHANGED: 'the source chapter changed after translation',
};

export const rewriteRefusalText = (code: string): string =>
  REWRITE_REFUSALS[code] ?? `the chapter did not assemble: ${findingText(code)}`;
