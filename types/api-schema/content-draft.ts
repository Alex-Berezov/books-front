/**
 * Заготовка Analysis (фича F05, F05-11) из досье — только `admin`. Заготовка — черновик для формы
 * вкладки: в анализ версии сервер её не пишет, сохраняет редактор ручками Analysis. Пошаговые
 * заготовки Summary (F05-10) сняты: их заменил ход «Write Summary» (F06, `summary-write.ts`).
 * Источник формы — `books/src/modules/translation/dto/content-draft-response.dto.ts` (ответы)
 * и `content-draft-request.dto.ts` (тело старта).
 */

import type {
  BookAnalysisCharacter,
  BookAnalysisFacts,
  BookAnalysisKeyQuote,
  BookAnalysisStyle,
} from './book-analysis';
import type { SupportedLang } from './common';
import type { LlmMoney, LlmOperation } from './llm';
import type { CompareContextLine, DossierContextLine } from './translation';

/** Вид заготовки: только Analysis (F05-11); виды Summary сняты (решение арбитра `F06 | F06-3`, А2). */
export type ContentDraftKind = 'analysis';

/** Пауза операции заготовку не меняет: она `building`, причина — `operation.pauseReason`. */
export type ContentDraftStatus = 'building' | 'ready' | 'failed' | 'discarded';

/** Ответ `GET /admin/versions/:id/drafts/:kind/estimate`. */
export interface ContentDraftEstimate {
  kind: ContentDraftKind;
  /** Досье строится первым; `null` — готово. */
  dossier: DossierContextLine | null;
  /** Глоссарий языка версии строится первым; `null` — готов или не нужен (язык досье). */
  glossary: CompareContextLine | null;
  stageUsd: LlmMoney;
  /** Досье ещё нет: его размер — по ответу этапов досье и глоссария. */
  upperBound: boolean;
  /** Лимит по умолчанию: max(этап × 1,5, лимиты досье и глоссария). */
  suggestedLimitUsd: LlmMoney;
}

/**
 * JSON импорта вкладки Analysis (F05-11): только эти ключи, ключа нет — импорт блок не трогает.
 * Собран поверх сохранённого анализа версии: сохранённое перенесено как есть.
 */
export interface ContentDraftAnalysis {
  language: SupportedLang;
  facts?: BookAnalysisFacts;
  characters?: BookAnalysisCharacter[];
  keyQuotes?: BookAnalysisKeyQuote[];
  style?: BookAnalysisStyle[];
}

/** Цитата заготовки Analysis, выкинутая проверкой дословности (решение `F05 | F05-11`, Р9). */
export interface ContentDraftDroppedQuote {
  /** `keyQuotes`, `characters.<key>.quote` или `style.<номер>.example`. */
  path: string;
  text: string;
  /** Глава, которую назвала модель. */
  chapter: number | null;
  /**
   * Нет дословно в одном абзаце главы; глава не указана; такой главы у версии нет; проверена,
   * но сверх предела 12 вместе с сохранёнными (Р19).
   */
  reason: 'NOT_FOUND' | 'NO_CHAPTER' | 'CHAPTER_MISSING' | 'OVER_LIMIT';
}

/** Сквозной мотив досье для «Вводных» вкладки Analysis (Р10). */
export interface ContentDraftMotif {
  /** На языке досье. */
  image: string;
  /** Главы этой версии. */
  chapters: number[];
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
  /** JSON импорта (`analysis`). */
  analysis: ContentDraftAnalysis | null;
  /** Выкинутые цитаты; пустой массив — ни одной (сервер отдаёт массив всегда). */
  droppedQuotes: ContentDraftDroppedQuote[];
  /** Мотивы досье; пустой массив — ни одного (сервер отдаёт массив всегда). */
  motifs: ContentDraftMotif[];
  /** Язык досье, по которому собрана заготовка Analysis. */
  dossierLanguage: SupportedLang | null;
  /** `updatedAt` анализа, поверх которого собрана заготовка; `null` — анализа не было (Р15). */
  analysisUpdatedAt: string | null;
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
