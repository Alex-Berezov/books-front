/**
 * Ход анализа «Write Analysis» (фича F07, F07-3a) — только `admin`. Пять шагов пишут блоки анализа
 * версии: пустые на старте блоки неопубликованной версии — сразу, остальное — предложениями по блоку
 * («Accept» / «Discard»; у `facts` — по подполю). Источник формы —
 * `books/src/modules/translation/dto/analysis-write-response.dto.ts` (ответы),
 * `summary-write-request.dto.ts` (тела «Regenerate» и «Accept» общие с ходом пересказа)
 * и `content-draft-request.dto.ts` (тело старта).
 */

import type {
  BookAnalysisAdaptation,
  BookAnalysisCharacter,
  BookAnalysisFaq,
  BookAnalysisKeyQuote,
  BookAnalysisMisreading,
  BookAnalysisSource,
  BookAnalysisStyle,
  BookAnalysisSymbol,
  BookAnalysisTheme,
  BookAnalysisTimelineEvent,
} from './book-analysis';
import type { SupportedLang } from './common';
import type { ContentDraftStatus } from './content-draft';
import type { LlmMoney, LlmOperation } from './llm';
import type { CompareContextLine, DossierContextLine } from './translation';

/** Ответ `GET /admin/versions/:id/drafts/analysis_write/estimate`. */
export interface AnalysisWriteEstimate {
  /** Досье строится первым; `null` — готово. */
  dossier: DossierContextLine | null;
  /** Глоссарий языка версии строится первым; `null` — готов или не нужен (язык досье). */
  glossary: CompareContextLine | null;
  /** Оценка сверху шагов хода с проверяющей, каждый × 2 прохода. */
  stageUsd: LlmMoney;
  /** Досье или глоссарий не готовы: их размер — по их этапам. */
  upperBound: boolean;
  /** Лимит по умолчанию: max(шаги × 1,5, лимиты досье и глоссария). */
  suggestedLimitUsd: LlmMoney;
}

/** Номер шага хода (`product.md` §2): 1 карточка и герои … 5 внешнее. */
export type AnalysisWriteStepNumber = 1 | 2 | 3 | 4 | 5;

/** Единица записи и предложения: блок анализа или подполе `facts.<имя>` (`ANALYSIS_TARGETS`). */
export type AnalysisWriteTarget =
  | 'facts.settingPlace'
  | 'facts.settingTime'
  | 'facts.narrator'
  | 'facts.structure'
  | 'characters'
  | 'keyQuotes'
  | 'style'
  | 'mainIdea'
  | 'themes'
  | 'symbols'
  | 'titleMeaning'
  | 'endingMeaning'
  | 'misreadings'
  | 'discussionQuestions'
  | 'faq'
  | 'facts.genre'
  | 'facts.movement'
  | 'facts.writtenYears'
  | 'context'
  | 'timeline'
  | 'reception'
  | 'adaptations'
  | 'sources';

/** Коды замечаний хода анализа (`ANALYSIS_REMARK_CODES`, `draft-quality/text-checks.ts`). */
export type AnalysisWriteRemarkCode =
  | 'LANGUAGE_MIXED'
  | 'NAME_MISMATCH'
  | 'JUNK'
  | 'STYLE_POOR'
  | 'IMPORT_INVALID'
  | 'CHAPTER_UNKNOWN'
  | 'LIMIT_OUT'
  | 'CORE_MISSING'
  | 'NOT_IN_TEXT'
  | 'GENERIC'
  | 'CONTRADICTION'
  | 'RETELLING'
  | 'ONE_SIDED'
  | 'FAQ_WEAK'
  | 'MYTH_INVENTED'
  | 'EXTERNAL_DOUBT'
  | 'EXTERNAL_CHECK'
  | 'SOURCE_UNREACHABLE'
  | 'SOURCE_UNRELATED'
  | 'SOURCE_UNVERIFIED';

/** Замечание к блоку или шагу: кодом или проверяющей моделью. */
export interface AnalysisWriteRemark {
  code: AnalysisWriteRemarkCode;
  /** Путь поля и короткий фрагмент или шаг. */
  where: string;
  /** Что поправить, по-английски. */
  note: string;
  by: 'code' | 'model';
}

/** Проверка моделью: `answered` — проверяла; иначе — почему проверки не было. */
export interface AnalysisWriteReview {
  kind: 'answered' | 'not_independent' | 'too_long' | 'invalid' | 'no_provider' | 'unavailable';
  /** Проверяющая модель (`answered`). */
  model: string | null;
}

export type AnalysisWriteVerdict = 'ok' | 'flags' | 'failed';

/**
 * Правка кода без переделки (`STEP_FIX_CODES`): номер главы снят, хвост сверх предела отрезан,
 * связь темы выброшена, источник шага 5 выкинут, утверждение без проверенного источника снято.
 */
export type AnalysisWriteFixCode =
  | 'CHAPTER_UNKNOWN'
  | 'LIMIT_OUT'
  | 'IMPORT_INVALID'
  | 'SOURCE_UNREACHABLE'
  | 'SOURCE_UNRELATED'
  | 'SOURCE_UNVERIFIED'
  | 'EXTERNAL_DOUBT';

export interface AnalysisWriteFix {
  code: AnalysisWriteFixCode;
  /** Путь поля. */
  path: string;
  note: string;
}

/** Цитата, выкинутая проверкой дословности (`QUOTE_NOT_VERBATIM`). */
export interface AnalysisWriteDroppedQuote {
  step: AnalysisWriteStepNumber;
  /** Где была цитата: `keyQuotes.2`, `style.0.example`… */
  path: string;
  /** Текст модели. */
  text: string;
  chapter: number | null;
  /** Нет дословно в главе; глава не названа; такой главы у версии нет. */
  reason: 'NOT_FOUND' | 'NO_CHAPTER' | 'CHAPTER_MISSING';
}

/** Источник шага 5, выкинутый кодом: не открылся или не про эту книгу. */
export interface AnalysisWriteDroppedSource {
  title: string;
  /** Только хост, никогда не полный адрес. */
  host: string;
  reason: 'SOURCE_UNREACHABLE' | 'SOURCE_UNRELATED';
}

export interface AnalysisWriteStep {
  step: AnalysisWriteStepNumber;
  verdict: AnalysisWriteVerdict;
  /** Флаги шага: проверки кода, проверяющая, `CORE_MISSING` после шага 3 (флаг момента шага). */
  remarks: AnalysisWriteRemark[];
  /** 2 — текст единственной переделки. */
  attempt: 1 | 2;
  outcome: 'done' | 'failed';
  /** Почему шаг не дал текста: `DRAFT_TOO_LONG`, `DRAFT_INVALID_RESPONSE`. */
  failedReason: string | null;
  authorModel: string | null;
  review: AnalysisWriteReview | null;
  /** Опора шага: весь текст версии, сводки глав досье или без текста книги (шаг 5). */
  source: 'text' | 'summaries' | 'none' | null;
  /** Что код снял без переделки, с причиной. */
  dropped: AnalysisWriteFix[];
}

/**
 * Судьба блока: `written` — в анализе; `proposed` — предложение; `waiting` — запись не решена;
 * `accepted`, `discarded` — решил редактор; `none` — не записан (`failedReason`).
 */
export type AnalysisWriteItemOutcome =
  | 'waiting'
  | 'written'
  | 'proposed'
  | 'accepted'
  | 'discarded'
  | 'none';

export interface AnalysisWriteItem {
  /** Номер блока в ходе: путь `items/:index/*`. */
  index: number;
  target: AnalysisWriteTarget;
  step: AnalysisWriteStepNumber;
  verdict: AnalysisWriteVerdict;
  remarks: AnalysisWriteRemark[];
  review: AnalysisWriteReview | null;
  outcome: AnalysisWriteItemOutcome;
  /** `IMPORT_INVALID` — блок не прошёл импорт после переделки; `DRAFT_DATA_INVALID`. */
  failedReason: string | null;
  /** `themeKeys` шага 3 у героев или цитат шагов 1–2: отдельно не перегенерируются. */
  links: boolean;
  /** Последняя перегенерация не дала текста: прежнее содержимое оставлено, вот почему. */
  regenFailedReason: string | null;
  /** Идёт перегенерация этого блока. */
  regenerating: boolean;
  regenOperationId: string | null;
  /** Статус операции перегенерации; `null` — перегенерации нет. */
  regenOperationStatus: LlmOperation['status'] | null;
  /** Почему операция перегенерации на паузе; `null` — не на паузе. */
  regenPauseReason: LlmOperation['pauseReason'];
}

export interface AnalysisWrite {
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
  /** Шагов хода всего (5; у ходов F07-1 — 3). */
  stepsTotal: number;
  /** Блоки, которые ход пишет прямо (пустые на старте у неопубликованной версии). */
  owns: AnalysisWriteTarget[];
  /** Пройденные шаги по порядку. */
  steps: AnalysisWriteStep[];
  items: AnalysisWriteItem[];
  droppedQuotes: AnalysisWriteDroppedQuote[];
  /** Источники шага 5, выкинутые кодом. */
  droppedSources: AnalysisWriteDroppedSource[];
  createdAt: string;
  updatedAt: string;
}

/** Ответ `GET /admin/versions/:id/drafts/analysis_write`: последний неотброшенный ход. */
export interface AnalysisWriteState {
  draft: AnalysisWrite | null;
}

/**
 * Ответ `GET /admin/content-drafts/:id/items/:index`: содержимое предложения. Заполнено поле блока
 * единицы записи, остальные `null`; у перегенерированного блока шага 5 — ещё `sources`
 * (проверенные источники, «Accept» добавит к сохранённым те, которых там нет по адресу).
 */
export interface AnalysisWriteValue {
  /** Подполе `facts.<имя>`, `mainIdea`, `titleMeaning`, `endingMeaning`, `context`, `reception`. */
  text: string | null;
  characters: BookAnalysisCharacter[] | null;
  keyQuotes: BookAnalysisKeyQuote[] | null;
  style: BookAnalysisStyle[] | null;
  themes: BookAnalysisTheme[] | null;
  symbols: BookAnalysisSymbol[] | null;
  misreadings: BookAnalysisMisreading[] | null;
  discussionQuestions: string[] | null;
  faq: BookAnalysisFaq[] | null;
  timeline: BookAnalysisTimelineEvent[] | null;
  adaptations: BookAnalysisAdaptation[] | null;
  sources: BookAnalysisSource[] | null;
}

/** Почему «Accept all» оставил пункт предложением (`ACCEPT_ALL_SKIP_CODES`). */
export type AnalysisAcceptAllSkipCode =
  | 'ANALYSIS_WRITE_REFUSED'
  | 'ANALYSIS_BLOCK_CHANGED'
  | 'ANALYSIS_REGEN_IN_PROGRESS';

export interface AnalysisAcceptAllSkipped {
  /** Номер пункта в `items`. */
  index: number;
  code: AnalysisAcceptAllSkipCode;
}

/**
 * Ответ `POST /admin/content-drafts/:id/accept-all` хода анализа: ход и пункты, оставшиеся
 * предложениями, с причиной (бэкенд отдаёт поле всегда и выкатывается тегом раньше фронта).
 */
export interface AnalysisAcceptAll extends AnalysisWrite {
  skipped: AnalysisAcceptAllSkipped[];
}

/** Тело 409 `ANALYSIS_BLOCK_CHANGED` «Accept»: блок изменили после предложения. */
export interface AnalysisBlockChangedBody {
  code: 'ANALYSIS_BLOCK_CHANGED';
  message: string;
  /** Что в блоке (подполе `facts`) сейчас: строка, список элементов; `null` — пусто. */
  current: unknown;
}

/** Тело 409 `ANALYSIS_WRITE_REFUSED` «Accept»: анализ не принял запись (ссылки, предел источников). */
export interface AnalysisWriteRefusedBody {
  code: 'ANALYSIS_WRITE_REFUSED';
  message: string;
  /** Ошибки записи «путь: причина». */
  errors: string[];
}
