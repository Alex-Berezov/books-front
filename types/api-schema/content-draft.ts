/**
 * Заготовки Summary (фича F05, F05-10) и Analysis (F05-11) из досье — только `admin`. Заготовка —
 * черновик для формы вкладки: в пересказ и анализ версии сервер её не пишет, сохраняет редактор
 * ручками Summary и Analysis.
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
import type { CompareContextLine } from './translation';

/** Виды заготовки Summary (F05-10); `analysis` — заготовка Analysis (F05-11). */
export type SummaryDraftKind = 'summary_sections' | 'summary_full' | 'summary_brief';
export type ContentDraftKind = SummaryDraftKind | 'analysis';

/** Пауза операции заготовку не меняет: она `building`, причина — `operation.pauseReason`. */
export type ContentDraftStatus = 'building' | 'ready' | 'failed' | 'discarded';

/** Ответ `GET /admin/versions/:id/drafts/:kind/estimate`. */
export interface ContentDraftEstimate {
  kind: ContentDraftKind;
  /** Досье строится первым; `null` — готово. */
  dossier: CompareContextLine | null;
  /** Глоссарий языка версии строится первым; `null` — готов или не нужен (язык досье). */
  glossary: CompareContextLine | null;
  /** Разделов в плане досье; `null` — план ещё не известен или это не разделы. */
  sections: number | null;
  stageUsd: LlmMoney;
  /** Досье ещё нет: его размер — по ответу этапов досье и глоссария (разделы — по главе на раздел). */
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
  /** Разделов в плане (`summary_sections`); `null`, пока досье не готово. */
  plannedSections: number | null;
  /** Готовые разделы (`summary_sections`). */
  sections: ContentDraftSection[] | null;
  /** Номера разделов, уже добавленных «Add section» (отметка на сервере, решение `F05 | F05-10`, Р1). */
  addedSections: number[];
  /** Rich HTML (`summary_full`, `summary_brief`). */
  text: string | null;
  question: string | null;
  /** JSON импорта (`analysis`). */
  analysis: ContentDraftAnalysis | null;
  /** Выкинутые цитаты (`analysis`); у других видов — `null`. */
  droppedQuotes: ContentDraftDroppedQuote[] | null;
  /** Мотивы досье (`analysis`); у других видов — `null`. */
  motifs: ContentDraftMotif[] | null;
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
