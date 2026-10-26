import {
  BOOK_ANALYSIS_BLOCK_KEYS,
  BOOK_ANALYSIS_FACT_KEYS,
  BOOK_ANALYSIS_LIST_KEYS,
  BOOK_ANALYSIS_TEXT_KEYS,
  type BookAnalysisFactKey,
  type BookAnalysisIssue,
  type BookAnalysisListKey,
  type BookAnalysisTextKey,
} from '@/lib/admin/book-analysis-blocks';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  BookAnalysisBlocks,
  BookAnalysisDetail,
  SaveBookAnalysisRequest,
} from '@/types/api-schema';

/**
 * Форма вкладки «Analysis» (F03-1). Гибрид, как у автора F02: тексты и карточка произведения —
 * полями, списки — JSON-редакторами с проверкой той же схемой, что импорт. Модуль без `zod`.
 */

export type BookAnalysisListValues = { [K in BookAnalysisListKey]: BookAnalysisBlocks[K] };

export interface BookAnalysisListDraft {
  text: string;
  /** Ошибки текста редактора; пока они есть, значение блока прежнее и сохранение стоит. */
  issues: BookAnalysisIssue[] | null;
}

export interface BookAnalysisFormValues {
  facts: Record<BookAnalysisFactKey, string>;
  texts: Record<BookAnalysisTextKey, string>;
  lists: BookAnalysisListValues;
  drafts: Record<BookAnalysisListKey, BookAnalysisListDraft>;
}

const fromEntries = <K extends string, V>(keys: readonly K[], value: (key: K) => V): Record<K, V> =>
  Object.fromEntries(keys.map((k) => [k, value(k)])) as Record<K, V>;

export const listToText = (value: unknown): string =>
  value === null || value === undefined ? '' : JSON.stringify(value, null, 2);

const draftsFor = (lists: BookAnalysisListValues) =>
  fromEntries(BOOK_ANALYSIS_LIST_KEYS, (k) => ({ text: listToText(lists[k]), issues: null }));

export const formFromAnalysis = (analysis: BookAnalysisDetail | null): BookAnalysisFormValues => {
  const lists = fromEntries(
    BOOK_ANALYSIS_LIST_KEYS,
    (k) => analysis?.[k] ?? null
  ) as BookAnalysisListValues;
  return {
    facts: fromEntries(BOOK_ANALYSIS_FACT_KEYS, (k) => analysis?.facts?.[k] ?? ''),
    texts: fromEntries(BOOK_ANALYSIS_TEXT_KEYS, (k) => analysis?.[k] ?? ''),
    lists,
    drafts: draftsFor(lists),
  };
};

const has = (source: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(source, key) &&
  (source as Record<string, unknown>)[key] !== undefined;

/**
 * Импорт в форму — слияние T6: ключа нет — блок прежний; `null`, `''` или `[]` — блок очищен;
 * пришедший список заменяет прежний целиком. Вход — уже проверенный `checkBookAnalysisImport`.
 */
export const mergeAnalysisImport = (
  prev: BookAnalysisFormValues,
  data: SaveBookAnalysisRequest
): BookAnalysisFormValues => {
  const facts = { ...prev.facts };
  if (has(data, 'facts')) {
    for (const k of BOOK_ANALYSIS_FACT_KEYS) facts[k] = data.facts?.[k] ?? '';
  }
  const texts = { ...prev.texts };
  for (const k of BOOK_ANALYSIS_TEXT_KEYS) if (has(data, k)) texts[k] = data[k] ?? '';
  const lists = { ...prev.lists } as Record<BookAnalysisListKey, unknown>;
  const drafts = { ...prev.drafts };
  for (const k of BOOK_ANALYSIS_LIST_KEYS) {
    if (!has(data, k)) continue;
    const value = data[k];
    lists[k] = Array.isArray(value) && value.length > 0 ? value : null;
    drafts[k] = { text: listToText(lists[k]), issues: null };
  }
  return { facts, texts, lists: lists as BookAnalysisListValues, drafts };
};

const filledBlocks = (v: BookAnalysisFormValues) => ({
  facts: Object.values(v.facts).some((s) => s.trim() !== ''),
  ...fromEntries(BOOK_ANALYSIS_TEXT_KEYS, (k) => v.texts[k].trim() !== ''),
  ...fromEntries(BOOK_ANALYSIS_LIST_KEYS, (k) => v.lists[k] !== null),
});

/**
 * Сравнимый вид значения: пустое поле (`null`, `undefined`) — «нет значения» (проверка импорта
 * их дописывает), порядок ключей не важен (сервер и проверка ставят поля в своём порядке).
 */
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => [k, canonical(v)])
  );
};

/** Значение блока формы для сравнения «изменился ли он». */
const blockValue = (v: BookAnalysisFormValues, key: (typeof BOOK_ANALYSIS_BLOCK_KEYS)[number]) =>
  key === 'facts'
    ? JSON.stringify(v.facts)
    : (BOOK_ANALYSIS_TEXT_KEYS as readonly string[]).includes(key)
      ? v.texts[key as BookAnalysisTextKey].trim()
      : JSON.stringify(canonical(v.lists[key as BookAnalysisListKey]));

/** Блоки, которые импорт очистит, хотя в форме они заполнены (предупреждение до применения). */
export const collectClearedBlocks = (
  prev: BookAnalysisFormValues,
  data: SaveBookAnalysisRequest
): string[] => {
  const before = filledBlocks(prev);
  const after = filledBlocks(mergeAnalysisImport(prev, data));
  return BOOK_ANALYSIS_BLOCK_KEYS.filter((k) => before[k] && !after[k]);
};

/**
 * Заполненные в форме блоки, которые импорт заменит другим содержимым: импорт заменяет блок
 * целиком, и редактор подтверждает это до применения (`F05` `product.md` §5.1 п.3).
 */
export const collectReplacedBlocks = (
  prev: BookAnalysisFormValues,
  data: SaveBookAnalysisRequest
): string[] => {
  const next = mergeAnalysisImport(prev, data);
  const before = filledBlocks(prev);
  const after = filledBlocks(next);
  return BOOK_ANALYSIS_BLOCK_KEYS.filter(
    (k) => before[k] && after[k] && blockValue(prev, k) !== blockValue(next, k)
  );
};

/** Списки, которые строит заготовка Analysis (F05-11), - вместе с `facts` (`draftBlocksOf` бэкенда). */
const ANALYSIS_DRAFT_BLOCKS = ['characters', 'keyQuotes', 'style'] as const;

/**
 * В форме есть несохранённые правки в блоках заготовки (`facts` и три списка): заготовка собрана
 * по сохранённому анализу, и импорт затёр бы их (решение арбитра `F05 | F05-11`, Р4).
 */
export const hasUnsavedDraftBlocks = (
  form: BookAnalysisFormValues,
  saved: BookAnalysisFormValues
): boolean =>
  BOOK_ANALYSIS_FACT_KEYS.some((k) => form.facts[k].trim() !== saved.facts[k].trim()) ||
  ANALYSIS_DRAFT_BLOCKS.some((k) => form.drafts[k].text !== saved.drafts[k].text);

/** Сохранение шлёт всю запись: все ключи §3, пустые — `null` (решение арбитра А4). */
export const analysisRequestFromForm = (
  values: BookAnalysisFormValues,
  language: SupportedLang
): SaveBookAnalysisRequest => {
  const facts = fromEntries(BOOK_ANALYSIS_FACT_KEYS, (k) => values.facts[k].trim() || null);
  const hasFacts = Object.values(facts).some((v) => v !== null);
  return {
    language,
    facts: hasFacts ? facts : null,
    ...fromEntries(BOOK_ANALYSIS_TEXT_KEYS, (k) => values.texts[k].trim() || null),
    ...values.lists,
  };
};

/** Признак черновика, который ещё не проверен: модуль проверки не загружен. Держит сохранение. */
export const UNCHECKED_DRAFT_ISSUE = 'not checked yet: validation is loading';

export const hasDraftIssues = (values: BookAnalysisFormValues): boolean =>
  BOOK_ANALYSIS_LIST_KEYS.some((k) => (values.drafts[k].issues?.length ?? 0) > 0);
