/**
 * Заготовки Summary из досье (фича F05, F05-10) — только `admin`. Заготовка — черновик для формы
 * вкладки Summary: в пересказ версии сервер её не пишет, сохраняет редактор ручками Summary.
 * Источник формы — `books/src/modules/translation/dto/content-draft-response.dto.ts` (ответы)
 * и `content-draft-request.dto.ts` (тело старта).
 */

import type { SupportedLang } from './common';
import type { LlmMoney, LlmOperation } from './llm';
import type { CompareContextLine } from './translation';

/** Виды, которые принимают ручки F05-10; `analysis` — F05-11. */
export type SummaryDraftKind = 'summary_sections' | 'summary_full' | 'summary_brief';
export type ContentDraftKind = SummaryDraftKind | 'analysis';

/** Пауза операции заготовку не меняет: она `building`, причина — `operation.pauseReason`. */
export type ContentDraftStatus = 'building' | 'ready' | 'failed' | 'discarded';

/** Ответ `GET /admin/versions/:id/drafts/:kind/estimate`. */
export interface ContentDraftEstimate {
  kind: SummaryDraftKind;
  /** Досье строится первым; `null` — готово. */
  dossier: CompareContextLine | null;
  /** Глоссарий языка версии строится первым; `null` — готов или не нужен (язык досье). */
  glossary: CompareContextLine | null;
  /** Разделов в плане досье; `null` — план ещё не известен или это не разделы. */
  sections: number | null;
  stageUsd: LlmMoney;
  /** Плана досье ещё нет: по разделу на главу. */
  upperBound: boolean;
  /** Лимит по умолчанию: max(этап × 1,5, лимиты досье и глоссария). */
  suggestedLimitUsd: LlmMoney;
}

export interface ContentDraftSection {
  /** Номер раздела в плане досье. */
  number: number;
  title: string;
  /** Rich HTML; пусто, когда у глав раздела нет текста в этой версии. */
  text: string;
  /** Первая глава раздела в плане; `null` — такой главы у этой версии нет. */
  readerChapter: number | null;
  readerChapterMissing: boolean;
  /** Имена, которых нет в досье. */
  additions: string | null;
  question: string | null;
}

export interface ContentDraft {
  id: string;
  bookVersionId: string;
  kind: ContentDraftKind;
  status: ContentDraftStatus;
  language: SupportedLang;
  /** Код окончательного отказа (`failed`). */
  failedReason: string | null;
  /** Чего ждёт: досье или глоссарий строятся своими операциями. */
  waitingFor: 'dossier' | 'glossary' | null;
  operation: LlmOperation;
  model: string | null;
  /** Разделов в плане (`summary_sections`); `null`, пока досье не готово. */
  plannedSections: number | null;
  /** Готовые разделы (`summary_sections`). */
  sections: ContentDraftSection[] | null;
  /** Номера разделов, уже добавленных «Add section» (отметка на сервере, решение `F05 | F05-10`, Р1). */
  addedSections: number[];
  /** Rich HTML (`summary_full`, `summary_brief`). */
  text: string | null;
  question: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Ответ `GET /admin/versions/:id/drafts/:kind`: последняя неотброшенная в любом статусе. */
export interface ContentDraftState {
  draft: ContentDraft | null;
}

/** Тело `POST /admin/versions/:id/drafts/:kind`: пустой лимит — по умолчанию сервера. */
export interface StartContentDraftRequest {
  limitUsd?: LlmMoney;
}
