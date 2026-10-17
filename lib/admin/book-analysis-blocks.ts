/**
 * Анализ книги (F03-1) без `zod`: лимиты DTO, ключи блоков, ошибки и их текст. Зеркало
 * `books/src/modules/book-analysis/dto/book-analysis-blocks.dto.ts` (`BOOK_ANALYSIS_LIMITS`,
 * решение арбитра А6): число, поправленное там, правится и здесь, и в промпте
 * `books-app-docs/features/F03-book-analysis/prompts/book-analysis.md`.
 * Схема на `zod` — `book-analysis.schema.ts`, она грузится лениво (`load-book-analysis-validation.ts`).
 */

export const BOOK_ANALYSIS_LIMITS = {
  themes: 8,
  characters: 20,
  keyQuotes: 12,
  relations: 6,
  symbols: 10,
  themeQuotes: 3,
  timeline: 20,
  style: 10,
  adaptations: 10,
  misreadings: 8,
  discussionQuestions: 12,
  faq: 10,
  sources: 15,
  chapters: 100,
  themeKeys: 8,
  mainIdea: 600,
  interpretation: 3000,
  quote: 500,
  longText: 3000,
  mediumText: 1500,
  title: 300,
  label: 100,
  question: 500,
  year: 40,
  chapter: 10_000,
  adaptationYear: { min: 1800, max: 2100 },
} as const;

export const BOOK_ANALYSIS_KEY_REGEX = /^[a-z0-9-]{1,60}$/;

export const BOOK_ANALYSIS_ROLES = ['main', 'secondary', 'minor'] as const;
export const BOOK_ANALYSIS_TIMELINE_KINDS = ['author', 'epoch', 'book'] as const;
export const BOOK_ANALYSIS_ADAPTATION_KINDS = ['film', 'series', 'stage', 'other'] as const;

/** Поля карточки произведения (`facts`), в порядке вывода формы. */
export const BOOK_ANALYSIS_FACT_KEYS = [
  'genre',
  'movement',
  'writtenYears',
  'settingPlace',
  'settingTime',
  'narrator',
  'structure',
] as const;
export type BookAnalysisFactKey = (typeof BOOK_ANALYSIS_FACT_KEYS)[number];

/** Текстовые блоки — полем формы. */
export const BOOK_ANALYSIS_TEXT_KEYS = [
  'mainIdea',
  'titleMeaning',
  'endingMeaning',
  'context',
  'reception',
] as const;
export type BookAnalysisTextKey = (typeof BOOK_ANALYSIS_TEXT_KEYS)[number];

/** Списки — JSON-редактором (гибридная форма, как у автора F02). */
export const BOOK_ANALYSIS_LIST_KEYS = [
  'themes',
  'characters',
  'symbols',
  'keyQuotes',
  'timeline',
  'style',
  'adaptations',
  'misreadings',
  'discussionQuestions',
  'faq',
  'sources',
] as const;
export type BookAnalysisListKey = (typeof BOOK_ANALYSIS_LIST_KEYS)[number];

/** Все ключи тела импорта, кроме `language`. */
export const BOOK_ANALYSIS_BLOCK_KEYS = [
  'facts',
  ...BOOK_ANALYSIS_TEXT_KEYS,
  ...BOOK_ANALYSIS_LIST_KEYS,
] as const;

/** Ошибка данных анализа: путь поля (`themes.0.title`) и текст причины. */
export interface BookAnalysisIssue {
  path: string;
  message: string;
}

export const formatBookAnalysisIssue = (issue: BookAnalysisIssue): string =>
  issue.path ? `${issue.path}: ${issue.message}` : issue.message;
