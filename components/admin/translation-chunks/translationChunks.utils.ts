import { isValidMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import {
  refusalText,
  rewriteRefusalText,
  stepFailureText,
} from '@/components/admin/translation-run/translationRun.utils';
import { ApiError } from '@/types/api';
import type {
  EditTranslationChunkRequest,
  RetryTranslationChunkRequest,
  TranslationChunk,
  TranslationChunkEdited,
  TranslationChunkRetry,
  TranslationReportChapter,
  TranslationRunLanguage,
} from '@/types/api-schema';

/**
 * Отказы повтора, правки и «продолжить» попытки по коду бэкенда (карточка F05-7v, «Для 7v-b»):
 * своя подпись на код; коды модели и ключа — подписями запуска (`refusalText`).
 */
const CHUNK_REFUSALS: Record<string, string> = {
  RUN_ACTIVE: 'The run is running (any of its languages): pause the run first.',
  RETRY_IN_PROGRESS: 'A piece of this language is being retried: wait for that retry to finish.',
  LLM_OPERATION_NOT_RESUMABLE: 'The retry cannot be resumed from this state.',
  LLM_OPERATION_NOT_CANCELLABLE: 'The retry is already finished.',
  DRAFT_MISSING:
    'The language finished without a draft version: there is no chapter to write the piece into.',
  CHUNK_SOURCE_CHANGED:
    'The source chapter changed after the split: the piece no longer matches it. Start a new run.',
  CHUNK_EDIT_CONFLICT: 'The piece or its chapter changed at the same time. Try again.',
  CHECK_MODEL_SAME_FAMILY:
    'The meaning check has no model of another family than this model: pick another model or change the check stage in LLM settings.',
};

const blockErrorsOf = (error: ApiError): string[] => {
  const message = error.data?.message;
  return Array.isArray(message) ? message.map(String) : [error.message];
};

export const chunkRefusalText = (error: unknown): string => {
  if (!(error instanceof ApiError)) return refusalText(error);
  const code = error.data?.code;
  if (code === 'CHUNK_BLOCKS_INVALID') {
    return `The blocks did not pass the check: ${blockErrorsOf(error).join('; ')}`;
  }
  if (typeof code === 'string' && CHUNK_REFUSALS[code]) return CHUNK_REFUSALS[code];
  return refusalText(error);
};

/**
 * Почему попытка повтора закончилась ничем (`retry.status = failed`); коды шага перевода
 * (`CHUNK_TOO_LONG`, `CHUNK_INVALID_RESPONSE`) — подписями отказа шага запуска.
 */
const RETRY_FAILURES: Record<string, string> = {
  SOURCE_CHANGED: 'the source chapter changed during the retry',
  RETRY_CANCELLED: 'the retry was cancelled',
  RETRY_NOT_APPLIED:
    'the piece changed meanwhile (edited or retried again): the result was not applied',
};

export const retryFailedText = (reason: string | null): string =>
  reason ? (RETRY_FAILURES[reason] ?? stepFailureText(reason)) : 'no reason given';

/** Шаг идущей попытки словами: статус попытки — статус куска, который она пишет. */
const RETRY_STEPS: Record<string, string> = {
  pending: 'waiting for the model',
  translated: 'translated, checking',
  checked: 'checked, finishing',
  done: 'done, replacing the piece',
  flagged: 'flagged, replacing the piece',
};

export const retryStepText = (status: string): string => RETRY_STEPS[status] ?? status;

/** `ended` — попытка не закрыта, а её операции нет в работе: ни опроса, ни блокировки кнопок. */
export type RetryState = 'running' | 'paused' | 'ended' | 'failed' | 'applied';

/**
 * Где попытка повтора: итог (`applied`, `failed`) или открыта — тогда по её операции: идёт,
 * на паузе (её «продолжить» и «отменить» живут только на экране куска, решение арбитра
 * `F05 | F05-7v-a`) или закончилась без итога попытки.
 */
export const retryStateOf = (retry: TranslationChunkRetry | null): RetryState | null => {
  if (retry === null) return null;
  if (retry.status === 'applied') return 'applied';
  if (retry.status === 'failed') return 'failed';
  if (retry.operationStatus === 'active') return 'running';
  return retry.operationStatus === 'paused' ? 'paused' : 'ended';
};

/**
 * Итог правки руками: `chapterRewritten: false` без причины — главы в черновике ещё нет,
 * её запишет сборка запуска; с причиной — отказ перезаписи (`rewriteRefusal`).
 */
export const editedText = (edited: TranslationChunkEdited): string => {
  if (edited.chapterRewritten)
    return 'The piece is saved and the chapter of the draft is rewritten.';
  if (edited.reason === null) {
    return 'The piece is saved; the chapter is not in the draft yet — the run writes it when it assembles the chapter.';
  }
  return `The piece is saved, but the chapter was not rewritten: ${rewriteRefusalText(edited.reason)}.`;
};

/** Подпись отказа построения досье по `failedReason` (карточка F05-7v, «От F05-2»). */
const DOSSIER_FAILURES: Record<string, string> = {
  DOSSIER_SOURCE_CHANGED: 'the source text was edited while the dossier was being built',
};

export const dossierFailedText = (reason: string | null): string =>
  reason ? (DOSSIER_FAILURES[reason] ?? stepFailureText(reason)) : 'the build failed';

/**
 * Ход построения досье: прочитанные части книги и ответы групп сводки (F05-12, Р6 `F05 | F05-Rb`) —
 * без групп части уже все прочитаны, а платные вызовы ещё идут. «Части досье», а не «куски»:
 * куском на этом экране зовётся кусок перевода. Групп «заведено пока»: уровень выше заводится,
 * когда ответил нижний, и равенство чисел не значит, что сводка кончилась.
 */
export const dossierProgressText = (dossier: {
  partsDone: number;
  groupsDone: number;
  groupsTotal: number;
}): string => {
  const parts = `${dossier.partsDone} ${dossier.partsDone === 1 ? 'part' : 'parts'} of the book read`;
  return dossier.groupsTotal > 0
    ? `The dossier is being built: ${parts}, summary groups answered ${dossier.groupsDone} of ${dossier.groupsTotal} (more levels may follow).`
    : `The dossier is being built: ${parts}.`;
};

/** Глава в списке экрана: из отчёта или та, где язык стоит, ещё не собранная. */
export interface ChapterOption {
  number: number;
  /** Нет в главах отчёта: язык на паузе посреди неё (решение арбитра `F05 | F05-7v-b`). */
  assembled: boolean;
  flagged: boolean;
}

const isFlaggedChapter = (c: TranslationReportChapter): boolean =>
  c.flagReason !== null || c.findings.some((f) => !f.stale);

/**
 * Главы языка: собранные — из отчёта, плюс глава хода, если её там нет; номера сверх этих
 * не выдумываются (решение арбитра `F05 | F05-7v-b`).
 */
export const chapterOptionsOf = (
  chapters: TranslationReportChapter[],
  progress: Pick<TranslationRunLanguage, 'chapterNumber'> | undefined
): ChapterOption[] => {
  const options: ChapterOption[] = chapters.map((c) => ({
    number: c.number,
    assembled: true,
    flagged: isFlaggedChapter(c),
  }));
  const current = progress?.chapterNumber ?? null;
  if (current !== null && !options.some((o) => o.number === current)) {
    options.push({ number: current, assembled: false, flagged: false });
  }
  return options.sort((a, b) => a.number - b.number);
};

export const chapterOptionLabel = (o: ChapterOption): string =>
  `Chapter ${o.number}${o.flagged ? ' (flagged)' : ''}${o.assembled ? '' : ' (not assembled)'}`;

/**
 * «Только флаги» — признак показа, а не условие кнопок (решение арбитра `F05 | F05-7v`). Кусок,
 * с которым работали на экране (`touched`), остаётся: правка снимает флаг, а итог правки
 * или повтора живёт на его карточке.
 */
export const visibleChunks = (
  chunks: TranslationChunk[],
  onlyFlagged: boolean,
  touched: ReadonlySet<string> = new Set()
): TranslationChunk[] =>
  onlyFlagged ? chunks.filter((c) => c.status === 'flagged' || touched.has(c.id)) : chunks;

/**
 * Повтор идёт у куска этой главы: замок пары (язык запуска) держит и остальные её куски — 409
 * `RETRY_IN_PROGRESS`. Повтора в других главах экран не видит.
 */
export const chapterRetrying = (chunks: TranslationChunk[]): boolean =>
  chunks.some((c) => c.retry?.operationStatus === 'active');

/**
 * Лимит повтора обязателен и ничем не подставляется (решение арбитра `F05 | F05-7v-b`); пустое
 * отвергает сам формат денег, ноль — здесь: с нулевым лимитом попытка сразу встаёт на паузу.
 */
export const isRetryLimitOk = (limit: string): boolean =>
  isValidMoney(limit) && Number(limit.trim()) > 0;

/** Тело повтора: пустая модель не уходит — сервер берёт модели запуска. */
export const retryRequest = (
  model: string | null,
  limit: string
): RetryTranslationChunkRequest => ({
  ...(model ? { model } : {}),
  limitUsd: limit.trim(),
});

/** Тело правки: блоки куска по номеру, текст поля — как есть; непереведённый блок — пустой. */
export const editRequest = (
  chunk: TranslationChunk,
  texts: Record<number, string>
): EditTranslationChunkRequest => ({
  blocks: chunk.blocks.map((b) => ({ n: b.n, text: texts[b.n] ?? b.translation ?? '' })),
});
