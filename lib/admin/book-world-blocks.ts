/**
 * Мир книги (F08-1) без `zod`: лимиты DTO героя, ключи полей, перечни. Зеркало
 * `books/src/modules/book-world/dto/book-world-blocks.dto.ts` (`BOOK_WORLD_LIMITS` строится там
 * из `BOOK_ANALYSIS_LIMITS`): число, поправленное там, правится и здесь, и в промпте
 * `books-app-docs/features/F08-book-wiki/prompts/world-character.md`.
 * Схема на `zod` — `book-world.schema.ts`, грузится лениво (`load-book-world-validation.ts`).
 */

import { BOOK_ANALYSIS_LIMITS as A } from '@/lib/admin/book-analysis-blocks';

export {
  BOOK_ANALYSIS_KEY_REGEX as BOOK_WORLD_KEY_REGEX,
  BOOK_ANALYSIS_ROLES as BOOK_WORLD_ROLES,
} from '@/lib/admin/book-analysis-blocks';
export type { DataIssue as BookWorldIssue } from '@/lib/admin/data-issue';

/** `tech.md` §3 и техбриф `F08-1` §3. */
export const BOOK_WORLD_LIMITS = {
  entities: 100,
  name: A.title,
  aliases: 30,
  alias: A.title,
  short: A.mainIdea,
  profileField: A.title,
  appearance: A.mediumText,
  character: A.interpretation,
  arcText: A.mediumText,
  stages: 8,
  scenes: 12,
  relations: 10,
  quotes: A.keyQuotes,
  quote: A.quote,
  interpretation: A.interpretation,
  critique: A.interpretation,
  prototypes: A.mediumText,
  adaptations: A.adaptations,
  faq: 8,
  sources: A.sources,
  title: A.title,
  text: A.mediumText,
  label: A.label,
  question: A.question,
  answer: A.longText,
  chapter: A.chapter,
  paragraph: 10_000,
  adaptationYear: A.adaptationYear,
} as const;

/** Типы, которые запись принимает в F08-1: только герой (`tech.md` §3). */
export const BOOK_WORLD_WRITABLE_TYPES = ['character'] as const;

/**
 * Текстовые поля карточки героя — полем формы: подпись — по-человечески, путь — как у поля тела
 * записи (им же подписаны ошибки сервера, он виден подсказкой).
 */
export const BOOK_WORLD_TEXT_FIELDS = [
  { key: 'short', path: 'short', label: 'Short', rows: 3 },
  { key: 'position', path: 'profile.position', label: 'Profile: position', rows: 2 },
  {
    key: 'relationToMain',
    path: 'profile.relationToMain',
    label: 'Profile: relation to the main hero',
    rows: 2,
  },
  { key: 'appearance', path: 'appearance', label: 'Appearance', rows: 4 },
  { key: 'character', path: 'character', label: 'Character', rows: 6 },
  { key: 'arcFrom', path: 'arc.from', label: 'Arc: at the start', rows: 3 },
  { key: 'arcTo', path: 'arc.to', label: 'Arc: at the end', rows: 3 },
  { key: 'critique', path: 'critique', label: 'Critique', rows: 5 },
  { key: 'prototypes', path: 'prototypes', label: 'Prototypes', rows: 4 },
] as const;
export type BookWorldTextKey = (typeof BOOK_WORLD_TEXT_FIELDS)[number]['key'];

/** Списки карточки — JSON-редактором, как у анализа; путь — как у поля тела записи. */
export const BOOK_WORLD_LIST_FIELDS = [
  { key: 'stages', path: 'arc.stages', label: 'Arc: stages' },
  { key: 'scenes', path: 'scenes', label: 'Key scenes' },
  { key: 'relations', path: 'relations', label: 'Relations' },
  { key: 'quotes', path: 'quotes', label: 'Quotes' },
  { key: 'adaptations', path: 'adaptations', label: 'Adaptations' },
  { key: 'faq', path: 'faq', label: 'FAQ' },
  { key: 'sources', path: 'sources', label: 'Sources' },
] as const;
export type BookWorldListKey = (typeof BOOK_WORLD_LIST_FIELDS)[number]['key'];
