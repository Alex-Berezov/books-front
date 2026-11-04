import {
  DRAFT_FAILURES,
  contextEstimateLines,
  failureReason,
  limitLine,
  operationStatusText,
  refusalCode,
  refusalText as draftRefusalText,
  refusalTextOfCode as draftRefusalTextOfCode,
} from '@/components/admin/books/ContentDraft/contentDraft.utils';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { DOSSIER_REFUSED_TEXT } from '@/components/admin/translation-run/translationRun.utils';
import { pluralize } from '@/lib/i18n/plural';
import { ApiError } from '@/types/api';
import type {
  SummaryAcceptAllStopBody,
  SummaryChapterChangeBody,
  SummaryChapterRange,
  SummaryFieldChangedBody,
  SummaryWrite,
  SummaryWriteEstimate,
  SummaryWriteItem,
  SummaryWriteReview,
} from '@/types/api-schema';

/** `REGEN_REMARK_MAX` бэкенда (`books/src/modules/translation/summary-write/summary-write.constants.ts`). */
export const REGEN_REMARK_MAX = 2000;

/** Поле пересказа, которое пишет текст хода (кроме разделов: у них свой список). */
export type SummaryWriteField = 'full' | 'brief';

/**
 * Отказы хода (`api/endpoints/admin/summary-write.ts`); прочие коды — подписями заготовок
 * и запуска перевода (`DOSSIER_STALE`, `LLM_CEILING_REACHED`, `LLM_DISABLED` …).
 */
const REFUSALS: Record<string, string> = {
  DRAFT_IN_PROGRESS: 'The summary of this version is already being written.',
  SOURCE_HAS_NO_CHAPTERS: 'This version has no chapter text to write the summary from.',
  DOSSIER_TOO_LONG: DOSSIER_REFUSED_TEXT,
  SUMMARY_WRITE_NOT_READY:
    'The run is not ready any more: it is being written, failed or discarded.',
  SUMMARY_REGEN_IN_PROGRESS: 'This text is being regenerated: wait until it finishes.',
  SUMMARY_ITEM_NOT_PROPOSED: 'This text is no longer a proposal: reload the tab.',
  SUMMARY_ITEM_UNKNOWN: 'The run has no such text: reload the tab.',
  SUMMARY_SECTIONS_UNFINISHED:
    'Not every section has a text yet: regenerate or write the missing sections first.',
  SUMMARY_FULL_UNFINISHED: 'The run has no Summary with a text: regenerate it first.',
  ACCEPT_ALL_CHAPTER_CHANGE:
    'Some sections move to other reader chapters: accept those sections one by one.',
};

/** Подпись отказа хода по коду: своя, затем заготовки и запуска; чужой код — `undefined`. */
export const refusalTextOfCode = (code: string): string | undefined =>
  REFUSALS[code] ?? draftRefusalTextOfCode(code);

export const refusalText = (error: unknown): string => {
  const code = refusalCode(error);
  return code && REFUSALS[code] ? REFUSALS[code] : draftRefusalText(error);
};

/** Причины хода и его текстов (`failedReason`, `regenFailedReason`): общие с заготовкой и свои. */
const RUN_FAILURES: Readonly<Record<string, string>> = {
  ...DRAFT_FAILURES,
  // Сообщение заготовки («у версии нет текста глав») к разделу хода не подходит: нужен текст его глав.
  DRAFT_INPUT_MISSING: 'the chapters have no text, or the dossier is gone',
  DRAFT_NO_PLAN: 'the dossier has no plan of sections',
  DRAFT_DATA_INVALID: 'the stored run data is broken',
  SUMMARY_WRITE_REFUSED: 'the field did not take the text',
};

export const reasonText = (reason: string | null): string => failureReason(reason, RUN_FAILURES);

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

export const itemTitle = (item: SummaryWriteItem): string => {
  if (item.target === 'full') return 'Summary';
  if (item.target === 'brief') return 'Very short summary';
  return item.title ? `Section ${item.number}: ${item.title}` : `Section ${item.number}`;
};

const TARGET_ORDER: Record<SummaryWriteItem['target'], number> = { section: 0, full: 1, brief: 2 };

/** Разделы по номеру, затем полный, затем «Очень кратко» — порядок «Accept all» на сервере. */
export const sortItems = (items: SummaryWriteItem[]): SummaryWriteItem[] =>
  [...items].sort(
    (a, b) => TARGET_ORDER[a.target] - TARGET_ORDER[b.target] || (a.number ?? 0) - (b.number ?? 0)
  );

/** Текст ещё ждёт решения редактора: предложение или раздел, ждущий раздела перед ним. */
export const isPending = (item: SummaryWriteItem): boolean =>
  item.outcome === 'proposed' || item.outcome === 'waiting';

/**
 * Мог ли отказ действия над текстом хода что-то записать в поле. Любой 409, кроме
 * `SUMMARY_FIELD_CHANGED`, — сервер отказал до записи поля (атомарное «Accept»; «Accept all» до цикла полей не трогает).
 * `SUMMARY_FIELD_CHANGED` — поле изменил кто-то другой, форме нужен его свежий текст. Сеть, таймаут
 * и 5xx — неизвестно: поля перечитываются. Отдельного списка кодов нет: он расходился с сервером.
 */
export const mayHaveWritten = (error: unknown): boolean =>
  !(
    error instanceof ApiError &&
    error.statusCode === 409 &&
    refusalCode(error) !== 'SUMMARY_FIELD_CHANGED'
  );

const sectionsOf = (items: SummaryWriteItem[]) =>
  sortItems(items).filter((i) => i.target === 'section' && i.number !== null);

/**
 * Раздел, которого ждёт раздел `waiting`: первый раздел перед ним без текста («не удалось»);
 * не нашёлся — тот, что прямо перед ним.
 */
export const blockingSectionOf = (items: SummaryWriteItem[], item: SummaryWriteItem): number => {
  const number = item.number ?? 1;
  const failed = sectionsOf(items).find(
    (i) => (i.number as number) < number && i.verdict === 'failed'
  );
  return failed?.number ?? number - 1;
};

/**
 * Первый неудавшийся раздел, пока у хода нет полного с текстом: полный и «Очень кратко»
 * достраиваются только после удачного «Regenerate» этого раздела; `null` — ничего не ждёт.
 */
export const fullWaitsFor = (items: SummaryWriteItem[]): number | null => {
  const full = items.find((i) => i.target === 'full');
  if (full && full.html !== '') return null;
  return sectionsOf(items).find((i) => i.verdict === 'failed')?.number ?? null;
};

/** Поля полного и «Очень кратко» среди текстов; разделы — не поле формы. */
export const fieldsOf = (items: SummaryWriteItem[]): SummaryWriteField[] =>
  items.flatMap((item) => (item.target === 'section' ? [] : [item.target]));

/** Ход пишется: чего ждёт или сколько разделов готово; пауза — причиной. */
export const progressText = (run: SummaryWrite): string =>
  operationStatusText(
    run.operation,
    run.waitingFor,
    run.plannedSections === null
      ? 'Writing: waiting for the plan of sections…'
      : `Writing: sections ${run.sectionsDone} of ${run.plannedSections}…`
  );

/** Окно подтверждения старта: что строится первым и сколько стоит сверху. */
export const writeEstimateText = (estimate: SummaryWriteEstimate): string => {
  const sections =
    estimate.sections !== null
      ? ` (${estimate.sections} sections, the Summary and the very short summary)`
      : estimate.upperBound
        ? ' (the plan is not known yet: one section per chapter)'
        : '';
  return [
    ...contextEstimateLines(estimate),
    `The summary: up to ${formatMoney(estimate.stageUsd)}${sections}.`,
    limitLine(estimate.suggestedLimitUsd),
  ].join(' ');
};

const plural = (n: number, word: string) =>
  `${n} ${pluralize(n, 'en', { one: word, few: `${word}s`, many: `${word}s` })}`;

/**
 * Что теряет новый старт поверх готового хода (сервер отбрасывает прежний): непринятые
 * предложения и идущие перегенерации. Нечего терять — пустая строка.
 */
export const startLossText = (run: SummaryWrite | null): string => {
  if (run?.status !== 'ready') return '';
  const pending = run.items.filter(isPending).length;
  const regenerating = run.items.filter((i) => i.regenerating).length;
  if (pending === 0 && regenerating === 0) return '';
  const parts = [
    pending > 0 ? `${plural(pending, 'proposal')} not accepted will be discarded` : '',
    regenerating > 0 ? `${plural(regenerating, 'regeneration')} will be cancelled` : '',
  ].filter(Boolean);
  return `This replaces the current run: ${parts.join(', ')}.`;
};

const bodyOf = (error: unknown, code: string): Record<string, unknown> | null =>
  error instanceof ApiError && refusalCode(error) === code && error.data ? error.data : null;

/** Тело 409 `SUMMARY_FIELD_CHANGED`; другой отказ — `null`. */
export const fieldChangedOf = (error: unknown): SummaryFieldChangedBody | null =>
  bodyOf(error, 'SUMMARY_FIELD_CHANGED') as SummaryFieldChangedBody | null;

/** Тело 409 `SUMMARY_CHAPTER_CHANGE`; другой отказ — `null`. */
export const chapterChangeOf = (error: unknown): SummaryChapterChangeBody | null =>
  bodyOf(error, 'SUMMARY_CHAPTER_CHANGE') as SummaryChapterChangeBody | null;

/**
 * Что принял «Accept all» до отказа: список из тела 409 (`SummaryAcceptAllStopBody`, пустой тоже);
 * `null` — списка нет: отказ до цикла принятия или ответа сервера не было (сеть, 5xx).
 */
export const acceptedIndexesOf = (error: unknown): number[] | null => {
  const body =
    error instanceof ApiError
      ? (error.data as Partial<SummaryAcceptAllStopBody> | undefined)
      : undefined;
  const list: unknown = body?.acceptedIndexes;
  return Array.isArray(list) ? list.filter((i): i is number => Number.isInteger(i)) : null;
};

/**
 * На каком тексте встал «Accept all»: первое предложение (`proposed`, без перегенерации) в серверном
 * порядке, которого нет среди принятых — сервер в цикле берёт только такие. Ждущие разделы он
 * сводит до цикла (`settle`): такой раздел, ставший предложением, идёт в цикл, и фронт, считая по
 * снимку на момент нажатия, его пропускает — точный индекс остановки знает только сервер. Считается по текстам на момент нажатия:
 * перечитанный после отказа ход уже не держит текст, на котором встали. Не вывести — `null`.
 */
export const acceptAllStopOf = (
  items: SummaryWriteItem[],
  accepted: number[]
): SummaryWriteItem | null => {
  for (const i of sortItems(items)) {
    if (i.regenerating || accepted.includes(i.index)) continue;
    // Ждущий раздел перед ним мог стать предложением на `settle` и встать первым: не угадываем.
    if (i.outcome === 'waiting') return null;
    if (i.outcome === 'proposed') return i;
  }
  return null;
};

const range = (c: SummaryChapterRange | null): string =>
  c === null
    ? 'chapters that cannot be worked out'
    : c.from === c.to
      ? `chapter ${c.from}`
      : `chapters ${c.from}–${c.to}`;

/**
 * Подтверждение смены глав раздела (F06 `product.md` §4). Охвата других разделов в теле 409 нет —
 * они названы пересечением с новым охватом.
 */
export const chapterChangeText = (body: SummaryChapterChangeBody): string => {
  const lines = [
    `Section ${body.number} now covers ${range(body.covers)}, will cover ${range(body.willCover)}.`,
  ];
  for (const other of body.sameChapterSections) {
    lines.push(`Section ${other} also covers some of ${range(body.willCover)}.`);
  }
  lines.push('Accept it anyway?');
  return lines.join(' ');
};

/**
 * Что перечитать в форме после отказа «Accept all» (`before` — тексты, которые он собирался принять).
 * Список принятого есть — перечитываются принятые и текст, на котором встал (его поле могло измениться
 * на сервере); списка нет: 409 — сервер отказал до записи, остальное (сеть, 5xx) — неизвестно,
 * перечитываются все затронутые.
 */
export const itemsToReloadAfterAcceptAll = (
  error: unknown,
  before: SummaryWriteItem[],
  items: SummaryWriteItem[]
): SummaryWriteItem[] => {
  const done = acceptedIndexesOf(error);
  if (done === null) return mayHaveWritten(error) ? before : [];
  // Поле текста, на котором встали, мог изменить кто-то другой — только тогда оно перечитывается.
  if (!fieldChangedOf(error)) return before.filter((i) => done.includes(i.index));
  // Поле изменено на тексте, на котором встали; не вывести его — перечитываются все непринятые.
  const stop = acceptAllStopOf(items, done);
  return before.filter((i) => done.includes(i.index) || !stop || i.index === stop.index);
};
