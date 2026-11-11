import {
  DRAFT_FAILURES,
  contextEstimateLines,
  failureReason,
  limitLine,
  operationStatusText,
  runStartLossText,
  refusalCode,
  refusalText as draftRefusalText,
  refusalTextOfCode as draftRefusalTextOfCode,
} from '@/components/admin/books/ContentDraft/contentDraft.utils';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { DOSSIER_REFUSED_TEXT } from '@/components/admin/translation-run/translationRun.utils';
import { ApiError } from '@/types/api';
import type {
  AnalysisAcceptAllSkipCode,
  AnalysisAcceptAllNotReadyBody,
  AnalysisAcceptAllSkipped,
  AnalysisBlockChangedBody,
  AnalysisWrite,
  AnalysisWriteDroppedQuote,
  AnalysisWriteDroppedSource,
  AnalysisWriteEstimate,
  AnalysisWriteItem,
  AnalysisWriteRemark,
  AnalysisWriteStepNumber,
  AnalysisWriteTarget,
} from '@/types/api-schema';

/** Шаги хода (F07 `product.md` §2, §5): «Step 3 of 5: Interpretations». */
export const STEP_NAMES: Record<AnalysisWriteStepNumber, string> = {
  1: 'Card and characters',
  2: 'Key quotes and style',
  3: 'Interpretations',
  4: 'For the reader',
  5: 'External facts',
};

/** Шаг 5 пишет внешние блоки: у них всегда «Verify facts» и проверенные источники (§3.3, §5). */
export const EXTERNAL_STEP: AnalysisWriteStepNumber = 5;

const TARGET_TITLES: Record<AnalysisWriteTarget, string> = {
  'facts.settingPlace': 'Facts: setting place',
  'facts.settingTime': 'Facts: setting time',
  'facts.narrator': 'Facts: narrator',
  'facts.structure': 'Facts: structure',
  characters: 'Characters',
  keyQuotes: 'Key quotes',
  style: 'Style',
  mainIdea: 'Main idea',
  themes: 'Themes',
  symbols: 'Symbols',
  titleMeaning: 'Title meaning',
  endingMeaning: 'Ending meaning',
  misreadings: 'Misreadings',
  discussionQuestions: 'Discussion questions',
  faq: 'FAQ',
  'facts.genre': 'Facts: genre',
  'facts.movement': 'Facts: movement',
  'facts.writtenYears': 'Facts: written years',
  context: 'Context',
  timeline: 'Timeline',
  reception: 'Reception',
  adaptations: 'Adaptations',
  sources: 'Sources',
};

/** Название блока; связи тем шага 3 у героев и цитат — отдельной строкой. */
export const itemTitle = (item: Pick<AnalysisWriteItem, 'target' | 'links'>): string =>
  item.links
    ? `Theme links in ${TARGET_TITLES[item.target].toLowerCase()}`
    : TARGET_TITLES[item.target];

/** Блоки по шагам, внутри шага — по номеру в ходе. */
export const sortItems = (items: AnalysisWriteItem[]): AnalysisWriteItem[] =>
  [...items].sort((a, b) => a.step - b.step || a.index - b.index);

/**
 * Блок не записан штатно: шагу нечего добавить (связи тем без новых ключей, шаг не дал блока) —
 * причины нет и вердикт не «не удалось». Показывается нейтрально, а не отказом.
 */
export const isNothingToAdd = (item: AnalysisWriteItem): boolean =>
  item.outcome === 'none' && item.failedReason === null && item.verdict !== 'failed';

/** Предложение ждёт решения редактора. */
export const isPending = (item: AnalysisWriteItem): boolean => item.outcome === 'proposed';

/**
 * «Regenerate» есть не у всех блоков: связи тем и `sources` отдельно не перегенерируются
 * (ручка отвечает 409 `ANALYSIS_ITEM_NOT_REGENERABLE`, F07 `product.md` §5).
 */
export const isRegenerable = (item: AnalysisWriteItem): boolean =>
  !item.links && item.target !== 'sources';

/**
 * Флаги блока на вкладке. `CORE_MISSING` — флаг момента шага: ядро показывает плашка по живому
 * `hasCore`, а не счётчик флагов (решение арбитра `F07 | F07-3`, п.6). Копия правила —
 * счётчик строки запуска `isModelFlagged` (T189, `books/src/modules/translation/run/run-sections.ts`):
 * меняются вместе.
 */
export const shownRemarks = (remarks: AnalysisWriteRemark[]): AnalysisWriteRemark[] =>
  remarks.filter((r) => r.code !== 'CORE_MISSING' && r.code !== 'EXTERNAL_CHECK');

/**
 * `EXTERNAL_CHECK` — метка «сверить факты» человеку, а не находка модели (F07 `product.md` §5):
 * в счётчик «Model flags» не входит и «Model check: OK» внешнему блоку не даёт (T174, п.3).
 */
const needsHandCheck = (item: AnalysisWriteItem): boolean =>
  item.remarks.some((r) => r.code === 'EXTERNAL_CHECK');

/**
 * Отметка блока для общей `ItemCheck`: замечания без `CORE_MISSING`; вердикт `flags`, у которого
 * после этого не осталось замечаний, а модель проверила, — «OK» (флаг был только про ядро).
 */
export const checkOf = (
  item: AnalysisWriteItem
): Pick<AnalysisWriteItem, 'verdict' | 'remarks' | 'review'> => {
  const remarks = shownRemarks(item.remarks);
  const onlyCore =
    item.verdict === 'flags' &&
    remarks.length === 0 &&
    item.review?.kind === 'answered' &&
    !needsHandCheck(item);
  return { verdict: onlyCore ? 'ok' : item.verdict, remarks, review: item.review };
};

/** Список источников блока полон: флаг `LIMIT_OUT` на `sources` (решение `F07 | F07-2b`). */
export const sourcesFull = (item: AnalysisWriteItem): boolean =>
  item.remarks.some((r) => r.code === 'LIMIT_OUT' && r.where === 'sources');

/**
 * Отказы хода (`api/endpoints/admin/analysis-write.ts`); прочие коды — подписями ходов из досье
 * и запуска перевода (`DOSSIER_STALE`, `LLM_CEILING_REACHED`, `LLM_DISABLED` …).
 */
const REFUSALS: Record<string, string> = {
  DRAFT_IN_PROGRESS: 'The analysis of this version is already being written.',
  SOURCE_HAS_NO_CHAPTERS: 'This version has no chapter text to write the analysis from.',
  DOSSIER_TOO_LONG: DOSSIER_REFUSED_TEXT,
  ANALYSIS_WRITE_NOT_READY:
    'The run is not ready any more: it is being written, failed or discarded.',
  ANALYSIS_REGEN_IN_PROGRESS: 'This block is being regenerated: wait until it finishes.',
  ANALYSIS_ITEM_NOT_PROPOSED: 'This block is no longer a proposal: reload the tab.',
  ANALYSIS_PROPOSAL_CHANGED:
    'The proposal changed since you opened it: read the new text and press Accept again.',
  ANALYSIS_ITEM_UNKNOWN: 'The run has no such block: reload the tab.',
  ANALYSIS_ITEM_NOT_REGENERABLE:
    'Theme links and sources are not regenerated on their own: regenerate the block they belong to.',
};

/** Подпись отказа хода по коду: своя, затем ходов из досье и запуска; чужой код — `undefined`. */
export const refusalTextOfCode = (code: string): string | undefined =>
  REFUSALS[code] ?? draftRefusalTextOfCode(code);

export const refusalText = (error: unknown): string => {
  const code = refusalCode(error);
  if (code === 'ANALYSIS_WRITE_REFUSED') {
    const errors = (error as ApiError).data?.errors;
    const list = Array.isArray(errors) ? errors.map(String).join('; ') : '';
    return list ? `The analysis refused this block: ${list}.` : 'The analysis refused this block.';
  }
  return code && REFUSALS[code] ? REFUSALS[code] : draftRefusalText(error);
};

/** Что делать, когда список источников полон (`LIMIT_OUT` на `sources`): у «Accept» и «Accept all». */
const SOURCES_FULL_HINT = 'free a place in the sources or regenerate the block';

/**
 * Отказ действия над блоком словами; 409 `ANALYSIS_WRITE_REFUSED` у блока с полным списком
 * источников — с той же подсказкой, что у «Accept all».
 */
export const itemRefusalText = (error: unknown, item: AnalysisWriteItem): string => {
  const text = refusalText(error);
  return refusalCode(error) === 'ANALYSIS_WRITE_REFUSED' && sourcesFull(item)
    ? `${text} To accept it, ${SOURCES_FULL_HINT}.`
    : text;
};

/** Причины хода, шагов и блоков (`failedReason`, `regenFailedReason`): общие с ходами из досье и свои. */
const RUN_FAILURES: Readonly<Record<string, string>> = {
  ...DRAFT_FAILURES,
  DRAFT_TOO_LONG: 'the book text does not fit the model even as chapter summaries',
  DRAFT_DATA_INVALID: 'the stored run data is broken',
  IMPORT_INVALID: 'the block failed the analysis checks after the redo',
  EXTERNAL_UNVERIFIED: 'no statement of the block was confirmed by a source',
  LIMIT_OUT: 'the list of sources is full',
};

export const reasonText = (reason: string | null): string => failureReason(reason, RUN_FAILURES);

/** Ход пишется: какой шаг сейчас; чего ждёт; пауза — причиной. */
export const progressText = (run: AnalysisWrite): string => {
  const total = run.stepsTotal;
  const step = Math.min(run.steps.length + 1, total) as AnalysisWriteStepNumber;
  const name = STEP_NAMES[step];
  return operationStatusText(
    run.operation,
    run.waitingFor,
    `Step ${step} of ${total}${name ? `: ${name}` : ''}…`
  );
};

/** Окно подтверждения старта: что строится первым и сколько стоит сверху. */
export const writeEstimateText = (estimate: AnalysisWriteEstimate): string => {
  const upper = estimate.upperBound ? ' (the dossier or the glossary is not built yet)' : '';
  return [
    ...contextEstimateLines(estimate),
    `The analysis: up to ${formatMoney(estimate.stageUsd)}${upper}.`,
    limitLine(estimate.suggestedLimitUsd),
  ].join(' ');
};

/** Что теряет новый старт поверх готового хода: непринятые предложения и идущие перегенерации. */
export const startLossText = (run: AnalysisWrite | null): string =>
  runStartLossText(run, isPending);

/** Тело 409 `ANALYSIS_BLOCK_CHANGED`; другой отказ — `null`. */
export const blockChangedOf = (error: unknown): AnalysisBlockChangedBody | null =>
  error instanceof ApiError && refusalCode(error) === 'ANALYSIS_BLOCK_CHANGED' && error.data
    ? (error.data as unknown as AnalysisBlockChangedBody)
    : null;

/**
 * Мог ли отказ «Accept» изменить анализ на сервере или показать, что его изменили: любой 409,
 * кроме `ANALYSIS_BLOCK_CHANGED`, — сервер отказал до записи; `ANALYSIS_BLOCK_CHANGED` — блок
 * изменил кто-то другой, форме нужен свежий анализ; сеть, таймаут и 5xx — неизвестно.
 */
export const mayHaveWritten = (error: unknown): boolean =>
  !(
    error instanceof ApiError &&
    error.statusCode === 409 &&
    refusalCode(error) !== 'ANALYSIS_BLOCK_CHANGED'
  );

/** Пропущенные пункты из тела 409 `ANALYSIS_WRITE_NOT_READY` (обрыв «Accept all»); иной отказ — пусто. */
export const skippedOfError = (error: unknown): AnalysisAcceptAllSkipped[] =>
  error instanceof ApiError && refusalCode(error) === 'ANALYSIS_WRITE_NOT_READY'
    ? ((error.data as unknown as AnalysisAcceptAllNotReadyBody | undefined)?.skipped ?? [])
    : [];

/** Почему «Accept all» оставил пункт предложением (решение арбитра `F07 | F07-3`, п.7). */
const SKIP_TEXT: Record<AnalysisAcceptAllSkipCode, string> = {
  ANALYSIS_BLOCK_CHANGED: 'the editor changed the block',
  ANALYSIS_WRITE_REFUSED: 'the analysis refused the write',
  ANALYSIS_REGEN_IN_PROGRESS: 'the block is being regenerated',
};

/** Строка пропущенного пункта; при полном списке источников — что делать. */
export const skippedText = (
  skipped: AnalysisAcceptAllSkipped,
  item: AnalysisWriteItem | undefined,
  actionable = true
): string => {
  const reason = SKIP_TEXT[skipped.code] ?? skipped.code;
  const hint = !actionable
    ? ''
    : skipped.code === 'ANALYSIS_WRITE_REFUSED' && item && sourcesFull(item)
      ? `: ${SOURCES_FULL_HINT}`
      : skipped.code === 'ANALYSIS_BLOCK_CHANGED'
        ? ': press Accept to see what the block holds now, or Discard'
        : skipped.code === 'ANALYSIS_WRITE_REFUSED'
          ? ': press Accept on the block to retry, it says why if refused, or Discard'
          : '';
  return `${item ? itemTitle(item) : `Block ${skipped.index}`}: ${reason}${hint}.`;
};

const QUOTE_REASON: Record<AnalysisWriteDroppedQuote['reason'], string> = {
  NOT_FOUND: 'not word for word in the chapter',
  NO_CHAPTER: 'no chapter given',
  CHAPTER_MISSING: 'the version has no such chapter',
};

export const droppedQuoteText = (q: AnalysisWriteDroppedQuote): string =>
  `«${q.text}» at ${q.path}${q.chapter !== null ? ` (chapter ${q.chapter})` : ''} — ${QUOTE_REASON[q.reason] ?? q.reason}`;

const SOURCE_REASON: Record<AnalysisWriteDroppedSource['reason'], string> = {
  SOURCE_UNREACHABLE: 'did not open',
  SOURCE_UNRELATED: 'names neither the book nor the author',
};

export const droppedSourceText = (s: AnalysisWriteDroppedSource): string =>
  `${s.title} (${s.host}) — ${SOURCE_REASON[s.reason] ?? s.reason}`;
