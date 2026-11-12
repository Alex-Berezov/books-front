/**
 * Общее у ходов из досье — «Write Summary» (F06) и «Write Analysis» (F07): статус строки хода
 * и тело старта. Заготовки из досье сняты все (Summary F05-10 в F06-3, Analysis F05-11 в F07-3a):
 * маршрутов `drafts/:kind` больше нет. Источник формы —
 * `books/src/modules/translation/dto/content-draft-request.dto.ts` (тело старта).
 */

import type { AnalysisAcceptAll, AnalysisWrite } from './analysis-write';
import type { LlmMoney } from './llm';
import type { SummaryWrite } from './summary-write';

/** Пауза операции ход не меняет: он `building`, причина — `operation.pauseReason`. */
export type ContentDraftStatus = 'building' | 'ready' | 'failed' | 'discarded';

/**
 * Ответ общих ручек решений по ходу (`content-drafts/:id/items/:index/regenerate|accept|discard`,
 * `content-drafts/:id/discard-run`): форма зависит от вида строки хода, сервер выбирает её сам
 * (`oneOf` в схеме, решение арбитра `F07 | F07-1`, В6). Ход анализа отличает `steps`.
 */
export type ContentDraftRun = SummaryWrite | AnalysisWrite;

/** Ответ «Accept all» (`content-drafts/:id/accept-all`): ход пересказа или ход анализа со `skipped`. */
export type ContentDraftAcceptAll = SummaryWrite | AnalysisAcceptAll;

/** Тело старта хода (`POST .../drafts/summary_write|analysis_write`): пустой лимит — по умолчанию сервера. */
export interface StartContentDraftRequest {
  limitUsd?: LlmMoney;
}

/** Вид хода в маршруте отметки «прочитано» (`.../drafts/:kind/read`, T184). */
export type AutoTextRunKind = 'summary_write' | 'analysis_write';

/**
 * Отметка редактора «прочитано» вкладки Summary или Analysis (T184,
 * `books/src/modules/translation/dto/auto-text-read-response.dto.ts`). Без действующей отметки публикация
 * версии отказывает `RIGHTS_PUBLICATION_BLOCKED` с причиной `AUTO_TEXT_NOT_READ`.
 */
export interface AutoTextRead {
  /** Когда текст модели последний раз лёг в поля вкладки; `null` — никогда. */
  autoTextAt: string | null;
  /** Когда редактор отметил текст прочитанным; `null` — не отмечен. */
  readAt: string | null;
  readById: string | null;
  /** `true` — читать нечего или отметка не раньше последнего текста модели. */
  read: boolean;
}

/** Тело «Mark as read»: время текста модели, который редактор видел (`AutoTextRead.autoTextAt`). */
export interface MarkAutoTextReadRequest {
  autoTextAt: string;
}
