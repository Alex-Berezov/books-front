/**
 * Ход мира «Write World» (фича F08, F08-4b) — только `admin`. Шаг 0 выбирает формы имени главных
 * героев анализа, дальше на каждого героя — страница и внешние блоки. Пустые блоки неопубликованной
 * сущности ход пишет сразу, остальное — предложениями по блоку («Accept» / «Discard» / «Regenerate»).
 * Источник формы — `books/src/modules/translation/dto/world-write-response.dto.ts` (ответы),
 * коды — `world-write/world-write.{data,constants}.ts`; тела «Regenerate» и «Accept» общие с ходом
 * пересказа (`summary-write.ts`), тело старта — `content-draft.ts`.
 */

import type { BookAnalysisFaq, BookAnalysisSource } from './book-analysis';
import type {
  BookWorldAdaptation,
  BookWorldArc,
  BookWorldCompare,
  BookWorldProfile,
  BookWorldQuote,
  BookWorldRelation,
  BookWorldScene,
} from './book-world';
import type { SupportedLang } from './common';
import type { ContentDraftStatus } from './content-draft';
import type { LlmMoney, LlmOperation } from './llm';
import type { CompareContextLine, DossierContextLine } from './translation';

/** Ответ `GET /admin/versions/:id/drafts/world_write/estimate`. */
export interface WorldWriteEstimate {
  /** Досье строится первым; `null` — готово. */
  dossier: DossierContextLine | null;
  /** Глоссарий языка версии строится первым; `null` — готов или не нужен (язык досье). */
  glossary: CompareContextLine | null;
  /** До N героев: главные и второстепенные анализа версии до порога глав второстепенных (`F08 | F08-8b` Q1); на каждого — страница. */
  candidates: number;
  /** До N страниц пар (`F08-8e`): min(10, герои·(герои−1)/2), 0 на языке без эталона пары; цена пар уже в `stageUsd`. */
  pairs: number;
  /** Оценка сверху: выбор форм имени, на героя (главного и второстепенного до порога глав) страница и внешние блоки, затем до `pairs` страниц пар, проверяющая каждого шага, × 2 прохода. */
  stageUsd: LlmMoney;
  /** Досье или глоссарий не готовы: их размер — по их этапам. */
  upperBound: boolean;
  /** Лимит по умолчанию: max(шаги × 1,5, лимиты досье и глоссария). */
  suggestedLimitUsd: LlmMoney;
}

/** Коды замечаний хода мира (`WORLD_REMARK_CODES`, `draft-quality/text-checks.ts`). */
export type WorldWriteRemarkCode =
  | 'LANGUAGE_MIXED'
  | 'NAME_MISMATCH'
  | 'JUNK'
  | 'STYLE_POOR'
  | 'IMPORT_INVALID'
  | 'CHAPTER_UNKNOWN'
  | 'LIMIT_OUT'
  | 'QUOTE_NOT_VERBATIM'
  | 'SCENE_OUTSIDE_MENTIONS'
  | 'NOT_IN_TEXT'
  | 'GENERIC'
  | 'CONTRADICTION'
  | 'RETELLING'
  | 'CORE_MISSING'
  | 'SHORT_SPOILER'
  | 'EXTERNAL_DOUBT'
  | 'EXTERNAL_CHECK'
  | 'SOURCE_UNREACHABLE'
  | 'SOURCE_UNRELATED'
  | 'SOURCE_UNVERIFIED';

/** Замечание к блоку или шагу: кодом или проверяющей моделью. */
export interface WorldWriteRemark {
  code: WorldWriteRemarkCode;
  /** Путь поля и короткий фрагмент или шаг. */
  where: string;
  /** Что поправить, по-английски. */
  note: string;
  by: 'code' | 'model';
}

/** Проверка моделью: `answered` — проверяла; иначе — почему проверки не было. */
export interface WorldWriteReview {
  kind: 'answered' | 'not_independent' | 'too_long' | 'invalid' | 'no_provider' | 'unavailable';
  /** Проверяющая модель (`answered`). */
  model: string | null;
}

export type WorldWriteVerdict = 'ok' | 'flags' | 'failed';

/** Блок сущности: страница героя, внешние блоки, блоки пары (`WORLD_BLOCKS`). */
export type WorldWriteBlock =
  | 'aliases'
  | 'short'
  | 'profile'
  | 'appearance'
  | 'character'
  | 'arc'
  | 'scenes'
  | 'relations'
  | 'quotes'
  | 'faq'
  | 'critique'
  | 'prototypes'
  | 'adaptations'
  | 'compare'
  | 'bonds'
  | 'differences'
  | 'conclusion';

/** Вид шага: выбор героев и форм имени, страница героя, внешние блоки героя, страница пары (`F08-8e`). */
export type WorldWriteStepKind = 'select' | 'page' | 'external' | 'pair';

/** Что код снял без переделки (`WORLD_FIX_CODES`). */
export type WorldWriteFixCode =
  | 'IMPORT_INVALID'
  | 'CHAPTER_UNKNOWN'
  | 'LIMIT_OUT'
  | 'QUOTE_NOT_VERBATIM'
  | 'ALIAS_NOT_IN_TEXT'
  | 'KEY_UNKNOWN'
  | 'SOURCE_UNREACHABLE'
  | 'SOURCE_UNRELATED'
  | 'SOURCE_UNVERIFIED';

export interface WorldWriteFix {
  code: WorldWriteFixCode;
  /** Путь в ответе шага (`quotes.3`, `aliases.2`, `sources.1`). */
  path: string;
  note: string;
}

/** Цитата героя, выброшенная кодом. */
export interface WorldWriteDroppedQuote {
  /** Ключ героя. */
  key: string;
  chapter: number | null;
  text: string;
  reason: 'QUOTE_NOT_VERBATIM' | 'CHAPTER_UNKNOWN';
}

/** Источник внешнего шага, выброшенный кодом: не открылся или не про эту книгу. */
export interface WorldWriteDroppedSource {
  /** Ключ героя. */
  key: string;
  title: string;
  /** Только хост, адрес не хранится. */
  host: string;
  reason: 'SOURCE_UNREACHABLE' | 'SOURCE_UNRELATED';
}

/** Кандидат хода: главный герой анализа; формы имени найдены в тексте версии. */
export interface WorldWriteCandidate {
  key: string;
  name: string;
  aliases: string[];
  /** Главы, где формы имени нашли героя (считано до страницы). */
  chapters: number[];
}

/** Пара хода (`F08-8e`): два героя-кандидата хода, шаг пары — после шагов героев. */
export interface WorldWritePair {
  /** Ключ пары `{a}--{b}`. */
  key: string;
  a: string;
  b: string;
  /** Герои связаны в анализе версии. */
  linked: boolean;
  /** Общие главы героев (считано на шаге выбора). */
  chapters: number[];
}

/** Почему герой или пара в ход не вошли (`WORLD_SKIP_REASONS`): вызова не было. */
export type WorldWriteSkipReason =
  | 'BELOW_MIN_CHAPTERS'
  | 'KEY_PAIR_FORM'
  | 'PAIR_KEY_INVALID'
  | 'PAIR_KEY_TAKEN'
  | 'PAIRS_MAX';

/** Отсеянный шагом выбора герой или пара. */
export interface WorldWriteLeftOut {
  /** Ключ героя или пары; у `PAIR_KEY_INVALID` — ключи героев через `--`. */
  key: string;
  reason: WorldWriteSkipReason;
  /**
   * Имена для подписи: героя — одно, пары — двух героев в порядке ключа (ключ `PAIR_KEY_INVALID`
   * не разобрать); пусто у хода, записанного до поля — подписью служит ключ.
   */
  names: string[];
  /** Главы героя (`BELOW_MIN_CHAPTERS`) или общие главы пары; иначе `null`. */
  chapters: number | null;
}

/** Ход не пишет пар: `WORLD_PAIR_LANGUAGE` — у языка нет эталона пары. */
export type WorldWritePairsOff = 'WORLD_PAIR_LANGUAGE';

export interface WorldWriteStep {
  /** 0 — выбор форм имени, затем на героя страница и внешние блоки, затем по шагу на пару (`F08-8e`). */
  step: number;
  kind: WorldWriteStepKind;
  /** Ключ героя или пары; у шага выбора — `null`. */
  key: string | null;
  verdict: WorldWriteVerdict;
  remarks: WorldWriteRemark[];
  /** 2 — текст единственной переделки. */
  attempt: number;
  outcome: 'done' | 'failed';
  /** Почему шаг не дал текста: `DRAFT_TOO_LONG`, `DRAFT_INVALID_RESPONSE`, `WORLD_CHARACTER_NOT_FOUND`; шаг пары без вызова — `WORLD_PAIR_MEMBER_MISSING`, `WORLD_PAIR_KEY_TAKEN`, `WORLD_PAIR_NOT_FOUNDED` (пара не связана в анализе и без общих глав — новая и заведённая; либо новая пара не проходит условие заведения по сохранённому присутствию), `WORLD_MENTIONS_MOVED`. */
  failedReason: string | null;
  authorModel: string | null;
  review: WorldWriteReview | null;
  /** Опора шага: главы с героем, главы с наибольшим числом упоминаний и краткое содержание, без текста книги. */
  source: 'text' | 'top' | 'none' | null;
  /** Что код снял без переделки, с причиной. */
  dropped: WorldWriteFix[];
}

/**
 * Судьба блока: `written` — в сущности; `proposed` — предложение; `waiting` — запись не решена;
 * `accepted`, `discarded` — решил редактор; `none` — не записан (`failedReason`).
 */
export type WorldWriteItemOutcome =
  | 'waiting'
  | 'written'
  | 'proposed'
  | 'accepted'
  | 'discarded'
  | 'none';

export interface WorldWriteItem {
  /** Номер блока в ходе: путь `items/:index/*`. */
  index: number;
  /** Ключ сущности мира. */
  key: string;
  block: WorldWriteBlock;
  step: number;
  verdict: WorldWriteVerdict;
  remarks: WorldWriteRemark[];
  review: WorldWriteReview | null;
  outcome: WorldWriteItemOutcome;
  /** `IMPORT_INVALID`, `EXTERNAL_UNVERIFIED` (нет проверенного источника), `WORLD_WRITE_REFUSED` (импорт мира отказал). */
  failedReason: string | null;
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

export interface WorldWrite {
  id: string;
  bookVersionId: string;
  /** Пауза операции ход не меняет: он `building`, причина — `operation.pauseReason`. */
  status: ContentDraftStatus;
  language: SupportedLang;
  /** `WORLD_ANALYSIS_MISSING`, `DRAFT_DATA_INVALID`, `DRAFT_INPUT_MISSING`, `DRAFT_CANCELLED`. */
  failedReason: string | null;
  /** Чего ждёт: досье или глоссарий строятся своими операциями. */
  waitingFor: 'dossier' | 'glossary' | null;
  operation: LlmOperation;
  /** Шагов хода: 1 + 2 на героя + 1 на пару; `null` — герои ещё не выбраны. */
  stepsTotal: number | null;
  /** Кандидаты; `null` — герои ещё не выбраны. */
  candidates: WorldWriteCandidate[] | null;
  /** Пары хода, их шаги идут после шагов героев; `null` — герои ещё не выбраны; `[]` — ход до `F08-8e`. */
  pairs: WorldWritePair[] | null;
  /** Герои и пары, которых шаг выбора оставил за ходом, с причиной. */
  leftOut: WorldWriteLeftOut[];
  /** Пар нет и почему; `null` — есть или выбор ещё не прошёл. */
  pairsOff: WorldWritePairsOff | null;
  /** Пройденные шаги по порядку. */
  steps: WorldWriteStep[];
  items: WorldWriteItem[];
  droppedQuotes: WorldWriteDroppedQuote[];
  /** Источники внешнего шага, выброшенные кодом. */
  droppedSources: WorldWriteDroppedSource[];
  createdAt: string;
  updatedAt: string;
}

/** Ответ `GET /admin/versions/:id/drafts/world_write`: последний неотброшенный ход. */
export interface WorldWriteState {
  draft: WorldWrite | null;
}

/**
 * Ответ `GET /admin/content-drafts/:id/items/:index`: содержимое предложения. Заполнено ровно одно
 * поле по блоку, остальные `null`; у внешнего блока — ещё `sources` (проверенные источники,
 * «Accept» добавит их к источникам сущности).
 */
export interface WorldWriteValue {
  /** `short`, `appearance`, `character`, `critique`, `prototypes`, `bonds`, `differences`, `conclusion`. */
  text: string | null;
  aliases: string[] | null;
  profile: BookWorldProfile | null;
  arc: BookWorldArc | null;
  scenes: BookWorldScene[] | null;
  relations: BookWorldRelation[] | null;
  quotes: BookWorldQuote[] | null;
  faq: BookAnalysisFaq[] | null;
  adaptations: BookWorldAdaptation[] | null;
  /** Таблица сравнения пары. */
  compare: BookWorldCompare[] | null;
  sources: BookAnalysisSource[] | null;
  /** Отпечаток предложения: «Accept» отдаёт его как `expectedPrint`. */
  print: string;
}

/** Почему «Accept all» оставил пункт предложением (`WORLD_ACCEPT_ALL_SKIP_CODES`). */
export type WorldAcceptAllSkipCode =
  | 'WORLD_WRITE_REFUSED'
  | 'WORLD_BLOCK_CHANGED'
  | 'WORLD_REGEN_IN_PROGRESS';

export interface WorldAcceptAllSkipped {
  /** Номер пункта в `items`. */
  index: number;
  code: WorldAcceptAllSkipCode;
}

/** Ответ `POST /admin/content-drafts/:id/accept-all` хода мира: ход и пункты, оставшиеся предложениями. */
export interface WorldAcceptAll extends WorldWrite {
  skipped: WorldAcceptAllSkipped[];
}

/** Тело 409 `WORLD_BLOCK_CHANGED` «Accept»: блок сущности изменили после предложения. */
export interface WorldBlockChangedBody {
  code: 'WORLD_BLOCK_CHANGED';
  message: string;
  /** Что в блоке сейчас; `null` — пусто. */
  current: unknown;
}
