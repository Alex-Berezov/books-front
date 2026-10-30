/**
 * Сравнение моделей перевода на главе в админке (фича F05, пачка F05-3) — только `admin` (U6).
 * Версия не создаётся, глоссарий не меняется; деньги — строкой `LlmMoney`, как на экране
 * «LLM settings».
 */

import type { PaginatedResult, SupportedLang } from './common';
import type { LlmMoney, LlmOperation } from './llm';

/** Строка оценки досье или глоссария, которые строятся раньше перевода своими операциями. */
export interface CompareContextLine {
  estimateUsd: LlmMoney;
  /** Лимит их операции: оценка × 1,5; обязан влезть в лимит сравнения. */
  suggestedLimitUsd: LlmMoney;
  /** Досье ещё нет: оценка сверху по размеру ответа досье. */
  upperBound: boolean;
}

/** Строка досье оценки запуска: строка контекста и признак отказа на старте (`T147`). */
export interface DossierContextLine extends CompareContextLine {
  /** Старт откажет `DOSSIER_TOO_LONG` до платных вызовов; сумма остаётся оценкой. */
  refusedTooLong: boolean;
}

/** Ответ `GET /admin/versions/:id/translation-compare/estimate`. */
export interface TranslationCompareEstimate {
  chapterNumber: number;
  targetLanguage: string;
  /** Кусков по границам кода. */
  chunks: number;
  /** `null` — досье готово или уже строится. */
  dossier: CompareContextLine | null;
  /** `null` — глоссарий готов или уже строится. */
  glossary: CompareContextLine | null;
  splitUsd: LlmMoney;
  models: Array<{ model: string; estimateUsd: LlmMoney }>;
  /** Оценки моделей включают досье и глоссарий, которых ещё нет, сверху. */
  upperBound: boolean;
  translationsUsd: LlmMoney;
  suggestedLimitUsd: LlmMoney;
}

/** Параметры оценки и тело запуска: глава, язык цели, 2–4 модели. */
export interface TranslationCompareParams {
  chapterNumber: number;
  targetLanguage: string;
  models: string[];
}

/** Тело `POST /admin/versions/:id/translation-compare`. */
export interface StartTranslationCompareRequest extends TranslationCompareParams {
  /** Не задан — предложенный лимит оценки. */
  limitUsd?: LlmMoney;
}

/** `queued` у операции на паузе — остановлено её `pauseReason`. */
export type TranslationCompareModelStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled';

/** Колонка модели. */
export interface TranslationCompareResult {
  model: string;
  position: number;
  status: TranslationCompareModelStatus;
  chunksDone: number;
  /** Глава целиком, когда готова; частичного текста нет. */
  html: string | null;
  /** Код причины, по которой модель упала. */
  error: string | null;
  costUsd: LlmMoney;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

/** Строка списка `GET /admin/versions/:id/translation-compares`. */
export interface TranslationCompareListItem {
  id: string;
  bookVersionId: string;
  chapterNumber: number;
  language: string;
  operation: LlmOperation;
  models: string[];
  createdAt: string;
}

export type TranslationCompareListResponse = PaginatedResult<TranslationCompareListItem>;

/** Ответ `GET /admin/translation-compares/:id` и `POST` запуска. */
export interface TranslationCompare extends TranslationCompareListItem {
  chapterTitle: string | null;
  /** Текущий текст главы исходника; `null` — главы больше нет. */
  originalHtml: string | null;
  /** `null` — глава ещё не нарезана. */
  chunks: number | null;
  /** Ждёт досье или глоссарий. */
  waitingForContext: boolean;
  /** `null` — вызовов `split` не было. */
  splitCostUsd: LlmMoney | null;
  results: TranslationCompareResult[];
}

// ---------------------------------------------------------------------------
// Запуск перевода по всей книге (F05-7, админка перевода) — только `admin` (U6).

/** Почему версию нельзя переводить (D8, `product.md` §2.1). */
export type TranslationBlockReason =
  | 'SOURCE_LANGUAGE_UNKNOWN'
  | 'ORIGINAL_VERSION_MISSING'
  | 'ENGLISH_VERSION_MISSING'
  | 'NOT_ORIGINAL_VERSION'
  | 'NOT_ENGLISH_VERSION'
  | 'SOURCE_HAS_NO_CHAPTERS'
  | 'INTAKE_TARGETS_MISSING'
  | 'NO_AVAILABLE_TARGETS';

/** Почему язык недоступен в окне запуска (§2.2, §7 п.10). */
export type TranslationTargetReason =
  | 'IS_SOURCE'
  | 'VERSION_EXISTS'
  | 'TRANSLATION_IN_PROGRESS'
  | 'NOT_IN_INTAKE';

export interface TranslationTarget {
  language: SupportedLang;
  available: boolean;
  reason: TranslationTargetReason | null;
}

/** Ответ `GET /admin/versions/:id/translation-source`. */
export interface TranslationSource {
  canTranslate: boolean;
  reason: TranslationBlockReason | null;
  sourceVersionId: string | null;
  sourceLanguage: SupportedLang | null;
  /** Поле «язык оригинала» как записано у исходника. */
  originalLanguageRaw: string | null;
  /** У версий книги поле «язык оригинала» расходится. */
  originalLanguageMismatch: boolean;
  targets: TranslationTarget[];
}

/** Строка оценки одного языка запуска. */
export interface TranslationRunLanguageEstimate {
  language: SupportedLang;
  /** `null` — глоссарий готов или уже строится. */
  glossary: CompareContextLine | null;
  splitUsd: LlmMoney;
  translateUsd: LlmMoney;
  checkUsd: LlmMoney;
  finalCheckUsd: LlmMoney;
  metadataUsd: LlmMoney;
  totalUsd: LlmMoney;
}

/** Ответ `GET /admin/versions/:id/translation-runs/estimate`. */
export interface TranslationRunEstimate {
  translateModel: string;
  chapters: number;
  /** Кусков на один язык. */
  chunks: number;
  /** `null` — досье свежее и готово или уже строится. */
  dossier: DossierContextLine | null;
  languages: TranslationRunLanguageEstimate[];
  upperBound: boolean;
  translationsUsd: LlmMoney;
  totalUsd: LlmMoney;
  /** Лимит запуска не ниже этого: досье и глоссарии строятся первыми. */
  minLimitUsd: LlmMoney;
  /** Умолчание лимита — `defaultRunLimitUsd`. */
  defaultLimitUsd: LlmMoney;
  /** Главы от 80 % предела длины главы. */
  nearLimitChapters: number[];
}

/** Параметры оценки запуска. */
export interface TranslationRunEstimateParams {
  languages: SupportedLang[];
  /** Модель перевода на этот запуск; нет — модель этапа `translate`. */
  translateModel?: string;
}

/** Тело `POST /admin/versions/:id/translation-runs`. */
export interface StartTranslationRunRequest extends TranslationRunEstimateParams {
  /** Нет — `defaultRunLimitUsd`. */
  limitUsd?: LlmMoney;
}

/** Модели этапов, которые меняются на запуск и при «продолжить». */
export interface TranslationRunStageModels {
  translate?: string;
  check_semantic?: string;
  metadata?: string;
  final_check?: string;
}

export type TranslationRunStage =
  | 'dossier'
  | 'glossary'
  | 'translate'
  | 'check'
  | 'assemble'
  | 'done'
  | 'failed'
  | 'cancelled';

export type TranslationRunLanguageStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled';

/** Язык в ходе запуска. */
export interface TranslationRunLanguage {
  language: SupportedLang;
  status: TranslationRunLanguageStatus;
  stage: TranslationRunStage;
  /** Код последней остановки языка: причина паузы или код отказа шага; список не закрыт. */
  reason: string | null;
  /** Текст сервиса при `CREATE_REJECTED`. */
  reasonText: string | null;
  /** Модели, отказавшие по политике данных (`NO_COMPLIANT_PROVIDER`). */
  reasonModels: string[];
  /** `DOSSIER_LIMIT_TOO_LOW`: лимит досье или глоссария, которого не хватило запуску до трат. */
  reasonUsd: LlmMoney | null;
  chapterNumber: number | null;
  /** «Глава N из M»: N. */
  chapterPosition: number | null;
  chaptersTotal: number;
  chunksDone: number;
  chunksTotal: number;
  flaggedChunks: number;
  /** Глав с флагом (стыки, итоговая проверка, не записана): подробности — в отчёте. */
  flaggedChapters: number;
  glossaryId: string | null;
  /** Операция досье или глоссария на паузе, которую ждёт язык (`DOSSIER_PAUSED`). */
  blockedByOperationId: string | null;
  /** Черновик версии языка; `null` до создания и после удаления. */
  draftVersionId: string | null;
}

/** Ответ `GET /admin/translation-runs/:id`, старта и кнопок запуска. */
export interface TranslationRun {
  id: string;
  bookVersionId: string;
  sourceLanguage: SupportedLang;
  dossierId: string | null;
  stageModels: TranslationRunStageModels;
  operation: LlmOperation;
  /** Операции досье и глоссариев запуска и те, что ждут его языки; без операции запуска. */
  operations: LlmOperation[];
  languages: TranslationRunLanguage[];
  createdAt: string;
}

/** Кто запустил (решение арбитра `F05 | F05-8`, В4). */
export interface TranslationRunAuthor {
  id: string;
  email: string;
  name: string | null;
}

/** Модели этапа, выбранные у запуска: снимок операции и переопределение запуска. */
export interface TranslationRunStageModel {
  stage: string;
  model: string;
  fallbacks: string[];
}

/** Чем кончился язык запуска; денег по языкам нет. */
export interface TranslationRunLanguageResult {
  language: SupportedLang;
  status: TranslationRunLanguageStatus;
  reason: string | null;
  /** Текст сервиса, отказавшего в черновике (`CREATE_REJECTED`), до 300 символов. */
  reasonText: string | null;
  draftVersionId: string | null;
}

/** Строка `GET /admin/books/:bookId/translation-runs`. */
export interface TranslationRunListItem {
  id: string;
  bookVersionId: string;
  sourceLanguage: SupportedLang;
  languages: SupportedLang[];
  stageModels: TranslationRunStageModels;
  operation: LlmOperation;
  createdAt: string;
  /** `null` — пользователь удалён. */
  createdBy: TranslationRunAuthor | null;
  /** Выбранные модели по этапам в порядке конвейера; вызванные — в `costs` отчёта. */
  models: TranslationRunStageModel[];
  /** Траты всех операций запуска — `totalUsd` его отчёта. */
  costUsd: string;
  results: TranslationRunLanguageResult[];
}

export type TranslationRunListResponse = PaginatedResult<TranslationRunListItem>;

/** Фильтры `GET /admin/books/:bookId/translation-runs` (решение арбитра `F05 | F05-7`, /fix В1). */
export interface TranslationRunListParams {
  /** Только запуски этой версии-исходника. */
  bookVersionId?: string;
  /** Только незавершённые: операция `active` или `paused`. */
  active?: boolean;
  page?: number;
  limit?: number;
}

/** Тело `POST /admin/translation-runs/:id/resume`. */
export interface ResumeTranslationRunRequest {
  limitUsd?: LlmMoney;
  stageModels?: TranslationRunStageModels;
}

export type TranslationChapterStatus = 'pending' | 'assembled' | 'flagged' | 'written';

/** Находка главы отчёта: код и поля, которые у него есть. */
export interface TranslationReportFinding {
  code: string;
  seam?: number;
  chunkIndex?: number;
  chunkReason?: string;
  block?: number;
  issue?: string;
  problems?: string[];
  key?: string;
  form?: string;
  target?: string;
  fragment?: string;
  model?: string;
  /** Модельная находка от текста до повтора или правки куска (решение арбитра `F05 | F05-7v`). */
  stale?: boolean;
}

export interface TranslationReportChapter {
  number: number;
  status: TranslationChapterStatus;
  flagReason: string | null;
  seamIndex: number | null;
  length: number | null;
  lengthLimit: number | null;
  chapterId: string | null;
  /** Почему повтор или правка куска не переписали главу черновика; `null` — переписали или не было. */
  rewriteRefusal: string | null;
  findings: TranslationReportFinding[];
}

export type TranslationFinalCheckStatus = 'pending' | 'skipped' | 'in_progress' | 'done';

export interface TranslationReportLanguage {
  language: SupportedLang;
  status: TranslationRunLanguageStatus;
  reason: string | null;
  reasonText: string | null;
  draftVersionId: string | null;
  draftCreatedAt: string | null;
  flaggedChunks: number;
  flaggedChapters: number;
  /** Имя автора по глоссарию; null - этап полей версии не дошёл или автора нет ни у исходника, ни в ответе (F05-17). */
  authorFromGlossary: boolean | null;
  chunks: { total: number; retries: number; flagged: Array<{ reason: string; count: number }> };
  chapters: TranslationReportChapter[];
  notWrittenChapters: number[];
  writtenChapters: number;
  takenChapters: number[];
  finalCheck: {
    status: TranslationFinalCheckStatus;
    missingChapters: number[];
    chaptersChecked: number;
  };
}

/** Ответ `GET /admin/translation-runs/:id/report`. */
export interface TranslationRunReport {
  id: string;
  bookVersionId: string;
  languages: TranslationReportLanguage[];
  costs: Array<{ stage: string; model: string | null; calls: number; costUsd: LlmMoney }>;
  inFlight: { calls: number; reservedUsd: LlmMoney };
  totalUsd: LlmMoney;
}

// ---------------------------------------------------------------------------
// Куски запуска: «оригинал | перевод», повтор и правка руками (F05-7v).

export type TranslationChunkStatus = 'pending' | 'translated' | 'checked' | 'done' | 'flagged';

/** Блок куска: исходник и перевод того же номера `n`; `translation: null` — не переведён. */
export interface TranslationChunkBlock {
  n: number;
  source: string;
  translation: string | null;
}

/** Попытка повтора куска своей операцией `translation_retry`; кусок подменяется на `applied`. */
export interface TranslationChunkRetry {
  operationId: string;
  /** `pending | translated | checked | done | flagged` — идёт; `applied`, `failed` — итог. */
  status: string;
  /** Модель, которую просили; `null` — модели запуска. */
  requestedModel: string | null;
  model: string | null;
  /** Отказ попытки (`failed`) или пауза её операции. */
  reason: string | null;
  reasonModels: string[];
  costUsd: LlmMoney;
  operationStatus: LlmOperation['status'] | null;
  pauseReason: LlmOperation['pauseReason'];
  spentUsd: LlmMoney | null;
  limitUsd: LlmMoney | null;
}

export interface TranslationChunk {
  id: string;
  chunkIndex: number;
  firstBlock: number;
  lastBlock: number;
  status: TranslationChunkStatus;
  flagReason: string | null;
  model: string | null;
  costUsd: LlmMoney | null;
  attempts: number;
  /** Замечания проверок: «почему» у флага. */
  remarks: string[];
  /** Правлено руками: `remarks` и `model` — о тексте до правки. */
  editedAt: string | null;
  retry: TranslationChunkRetry | null;
  blocks: TranslationChunkBlock[];
}

export interface TranslationChunksChapter {
  status: TranslationChapterStatus;
  flagReason: string | null;
  rewriteRefusal: string | null;
  chapterId: string | null;
  findings: TranslationReportFinding[];
}

/** Ответ `GET /admin/translation-runs/:id/chunks?lang=&chapter=`. */
export interface TranslationChunks {
  runId: string;
  language: SupportedLang;
  chapterNumber: number;
  /** Глава исходника правлена после нарезки: блоки могут не совпадать. */
  sourceChanged: boolean;
  /** Главы перевода ещё нет: не собрана. */
  chapter: TranslationChunksChapter | null;
  chunks: TranslationChunk[];
}

/** Тело `POST /admin/translation-chunks/:id/retry`: пустая модель не уходит — модели запуска. */
export interface RetryTranslationChunkRequest {
  model?: string;
  limitUsd: LlmMoney;
}

/** Ответ `POST /admin/translation-chunks/:id/retry` (202). */
export interface TranslationChunkRetryStarted {
  operation: LlmOperation;
  chunk: TranslationChunk;
}

/** Тело `PUT /admin/translation-chunks/:id`: блоки по номеру, только строчная разметка. */
export interface EditTranslationChunkRequest {
  blocks: Array<{ n: number; text: string }>;
}

/** Ответ `PUT /admin/translation-chunks/:id`: `chapterRewritten: false` — причина в `reason`. */
export interface TranslationChunkEdited {
  chunk: TranslationChunk;
  chapterRewritten: boolean;
  reason: string | null;
}
