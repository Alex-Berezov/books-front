/**
 * Ход пересказа «Write Summary» (фича F06, F06-2) — только `admin`. Ход пишет разделы по плану
 * досье, полный и «Очень кратко» в пустые поля неопубликованной версии, остальное — предложениями
 * («Accept» / «Discard»). Источник формы —
 * `books/src/modules/translation/dto/summary-write-response.dto.ts` (ответы)
 * и `summary-write-request.dto.ts` (тела).
 */

import type { SupportedLang } from './common';
import type { ContentDraftStatus } from './content-draft';
import type { LlmMoney, LlmOperation } from './llm';
import type { CompareContextLine, DossierContextLine } from './translation';

/** Ответ `GET /admin/versions/:id/drafts/summary_write/estimate`. */
export interface SummaryWriteEstimate {
  /** Досье строится первым; `null` — готово. */
  dossier: DossierContextLine | null;
  /** Глоссарий языка версии строится первым; `null` — готов или не нужен (язык досье). */
  glossary: CompareContextLine | null;
  /** Разделов в плане досье; `null` — план ещё не известен (по разделу на главу). */
  sections: number | null;
  /** Оценка сверху всего хода: разделы, полный и «Очень кратко», каждый × 2 прохода автора и проверки. */
  stageUsd: LlmMoney;
  /** Досье ещё нет: по разделу на главу. */
  upperBound: boolean;
  /** Лимит по умолчанию: max(ход × 1,5, лимиты досье и глоссария). */
  suggestedLimitUsd: LlmMoney;
}

/** Коды замечаний (`DRAFT_REMARK_CODES`, `books/src/modules/translation/draft-quality/text-checks.ts`). */
export type SummaryWriteRemarkCode =
  | 'LENGTH_OUT'
  | 'STRUCTURE_BROKEN'
  | 'LANGUAGE_MIXED'
  | 'QUOTE_NOT_VERBATIM'
  | 'NAME_MISMATCH'
  | 'JUNK'
  | 'DUPLICATE_TEXT'
  | 'FACT_UNSUPPORTED'
  | 'EVENT_MISSING'
  | 'EXTERNAL_FACT'
  | 'ORDER_BROKEN'
  | 'STYLE_POOR';

/** Замечание к тексту: кодом или проверяющей моделью. */
export interface SummaryWriteRemark {
  code: SummaryWriteRemarkCode;
  /** Короткий фрагмент текста или имя части. */
  where: string;
  /** Что поправить, по-английски. */
  note: string;
  by: 'code' | 'model';
}

/** Проверка моделью: `answered` — проверяла; иначе — почему проверки не было. */
export interface SummaryWriteReview {
  kind: 'answered' | 'not_independent' | 'too_long' | 'invalid' | 'no_provider' | 'unavailable';
  /** Проверяющая модель (`answered`). */
  model: string | null;
}

export type SummaryWriteTarget = 'section' | 'full' | 'brief';
export type SummaryWriteVerdict = 'ok' | 'flags' | 'failed';
/**
 * Судьба текста: `written` — в поле; `proposed` — предложение; `waiting` — ждёт текста раздела
 * перед ним; `accepted`, `discarded` — решил редактор; `none` — текста нет или поле его не приняло.
 */
export type SummaryWriteOutcome =
  | 'waiting'
  | 'written'
  | 'proposed'
  | 'accepted'
  | 'discarded'
  | 'none';

export interface SummaryWriteItem {
  /** Номер текста в ходе: путь `items/:index/*`. */
  index: number;
  target: SummaryWriteTarget;
  /** Номер раздела плана досье (`section`). */
  number: number | null;
  /** Название раздела (`section`). */
  title: string | null;
  /** Глава читалки раздела; `null` — нет в этой версии. */
  readerChapter: number | null;
  /** Rich HTML; пусто, когда текста нет. */
  html: string;
  /** 2 — текст единственной переделки. */
  attempt: number;
  verdict: SummaryWriteVerdict;
  remarks: SummaryWriteRemark[];
  review: SummaryWriteReview | null;
  outcome: SummaryWriteOutcome;
  /** Почему текста нет в поле: `DRAFT_*` (нет текста) или `SUMMARY_WRITE_REFUSED` (поле не приняло). */
  failedReason: string | null;
  authorModel: string | null;
  /** Последняя перегенерация не дала текста: прежний оставлен, вот почему. */
  regenFailedReason: string | null;
  /** Идёт перегенерация этого текста. */
  regenerating: boolean;
  regenOperationId: string | null;
  /** Статус операции перегенерации; `null` — перегенерации нет (F06-5c). */
  regenOperationStatus: LlmOperation['status'] | null;
  /** Почему операция перегенерации на паузе; `null` — не на паузе. */
  regenPauseReason: LlmOperation['pauseReason'];
}

/** Поля, которые ход пишет прямо (пустые на старте у неопубликованной версии). */
export interface SummaryWriteOwns {
  sections: boolean;
  full: boolean;
  brief: boolean;
}

export interface SummaryWrite {
  id: string;
  bookVersionId: string;
  /** Пауза операции ход не меняет: он `building`, причина — `operation.pauseReason`. */
  status: ContentDraftStatus;
  language: SupportedLang;
  /** Код окончательного отказа (`failed`). */
  failedReason: string | null;
  /** Чего ждёт: досье или глоссарий строятся своими операциями. */
  waitingFor: 'dossier' | 'glossary' | null;
  operation: LlmOperation;
  /** Разделов в плане; `null`, пока досье не готово. */
  plannedSections: number | null;
  /** Разделы плана с текстом (записан, предложен, ждёт); «не удалось» не считается. */
  sectionsDone: number;
  owns: SummaryWriteOwns;
  items: SummaryWriteItem[];
  /** Разделы, чьё предложение меняет главы читалки: «Accept all» откажет `ACCEPT_ALL_CHAPTER_CHANGE`. */
  chapterChanges: number[];
  createdAt: string;
  updatedAt: string;
}

/** Ответ `GET /admin/versions/:id/drafts/summary_write`: последний неотброшенный ход. */
export interface SummaryWriteState {
  draft: SummaryWrite | null;
}

/** Тело `POST /admin/content-drafts/:id/items/:index/regenerate`. */
export interface RegenerateSummaryItemRequest {
  /** Замечание редактора автору; не длиннее `REGEN_REMARK_MAX` бэкенда (2000). */
  remark?: string;
}

/** Тело `POST /admin/content-drafts/:id/items/:index/accept`. */
export interface AcceptSummaryItemRequest {
  /** Редактор подтвердил, что раздел переходит на другие главы читалки. */
  confirmChapterChange?: boolean;
}

/** Охват раздела главами читалки; `null` — не выводится. */
export interface SummaryChapterRange {
  from: number;
  to: number;
}

/** Тело 409 `SUMMARY_FIELD_CHANGED`: поле изменилось после предложения. */
export interface SummaryFieldChangedBody {
  code: 'SUMMARY_FIELD_CHANGED';
  message: string;
  /** Что сейчас в поле; `null` — не отдаётся (раздел вне порядка). */
  current: { title?: string; text: string | null; readerChapter?: number | null } | null;
  /** Раздел, который должен прийти первым (раздел сверх последнего номера). */
  expectedNumber?: number;
}

/**
 * Любой 409 «Accept all» посреди принятия (`summary-write.service.ts`, `acceptAll`): сервер кладёт
 * в тело, что принято до отказа, всегда, и пустым списком тоже (`F06-5a`, `v1.0.291`). Отказ до
 * цикла (`ACCEPT_ALL_CHAPTER_CHANGE`, ход не готов) списка не несёт: полей Summary и «Очень кратко»
 * он не трогал (ждущие разделы `settle` мог записать — список разделов перечитывается).
 */
export interface SummaryAcceptAllStopBody {
  acceptedIndexes: number[];
}

/** Тело 409 `SUMMARY_CHAPTER_CHANGE`: раздел переходит на другие главы читалки. */
export interface SummaryChapterChangeBody {
  code: 'SUMMARY_CHAPTER_CHANGE';
  message: string;
  number: number;
  covers: SummaryChapterRange | null;
  willCover: SummaryChapterRange | null;
  sameChapterSections: number[];
}
