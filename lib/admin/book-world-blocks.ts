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

/** Форм имени у сущности; исключённых глав — по записи на имя и каждую форму (`F08-8a`). */
const WORLD_ALIASES = 30;

/** `tech.md` §3 и техбриф `F08-1` §3. */
export const BOOK_WORLD_LIMITS = {
  entities: 100,
  name: A.title,
  aliases: WORLD_ALIASES,
  alias: A.title,
  // Исключённые главы у формы (F08-8a, решение арбитра `F08 | F08-8a` п.5): имя и все формы.
  chapterExclusions: WORLD_ALIASES + 1,
  chapterExclusionChapters: 500,
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
  // Пара героев (F08-8c): строк сравнения 0-8 (нижние 4 - условие ядра на бэкенде, не лимит записи).
  compare: 8,
  sources: A.sources,
  title: A.title,
  text: A.mediumText,
  label: A.label,
  question: A.question,
  answer: A.longText,
  chapter: A.chapter,
  paragraph: 10_000,
  adaptationYear: A.adaptationYear,
  // Место (F08-12b, решение арбитра `F08 | F08-12` Q1): копия `BOOK_WORLD_LIMITS` бэкенда, менять вместе.
  location: A.mainIdea,
  significance: A.interpretation,
  description: A.mediumText,
  // ТЗ на иллюстрацию героя и места (F08-11d-2, F08-12b): только импорт и ход, в карточке поля нет.
  imageBrief: A.mediumText,
} as const;

/**
 * Место реальное или вымышленное и номер Wikidata реального места (F08-12b). Копия `WORLD_PLACE_KINDS`,
 * `WIKIDATA_ID_REGEX` и `WIKIDATA_ID_MAX` из `books/src/modules/book-world/dto/book-world-blocks.dto.ts` —
 * менять вместе.
 */
export const WORLD_PLACE_KINDS = ['real', 'fictional'] as const;
export const WIKIDATA_ID_REGEX = /^Q[1-9]\d*$/;
export const WIKIDATA_ID_MAX = 16;

/**
 * Роли героя, которому положена иллюстрация и ТЗ на неё (F08-11d-2). Копия `WORLD_IMAGE_ROLES`
 * из `books/src/modules/book-world/world-image-public.ts` — change both together.
 */
export const WORLD_IMAGE_ROLES: readonly string[] = ['main', 'secondary'];

/**
 * Предел файла портрета (F08-11d-3). Копия `WORLD_IMAGE_LIMITS` из
 * `books/src/modules/translation/world-image/world-image.constants.ts` и типов `sniffImage`
 * (`books/src/shared/image/image-check.ts`) — change both together: подсказка у поля загрузки,
 * проверка размера до отправки и тексты отказов берут числа отсюда.
 */
export const WORLD_IMAGE_FILE_LIMITS = {
  maxMb: 12,
  minSide: 1200,
  maxMegapixels: 40,
  types: ['image/png', 'image/jpeg', 'image/webp'],
} as const;

/**
 * Предел файла картинки места (F08-12c-2): кадр от 1200×675 px (пропорция не проверяется), файл и пиксели - как у
 * портрета. Копия `WORLD_PLACE_IMAGE_LIMITS` из
 * `books/src/modules/translation/world-image/world-image.constants.ts` — change both together.
 */
export const WORLD_PLACE_IMAGE_FILE_LIMITS = {
  maxMb: WORLD_IMAGE_FILE_LIMITS.maxMb,
  minWidth: 1200,
  minHeight: 675,
  maxMegapixels: WORLD_IMAGE_FILE_LIMITS.maxMegapixels,
  types: WORLD_IMAGE_FILE_LIMITS.types,
} as const;

/** Предел файла по типу сущности в одной форме (F08-12c-2): подпись поля, проверка до отправки, отказ. */
export const worldImageFileLimitsOf = (entityType?: string) =>
  entityType === 'place'
    ? WORLD_PLACE_IMAGE_FILE_LIMITS
    : {
        maxMb: WORLD_IMAGE_FILE_LIMITS.maxMb,
        minWidth: WORLD_IMAGE_FILE_LIMITS.minSide,
        minHeight: WORLD_IMAGE_FILE_LIMITS.minSide,
        maxMegapixels: WORLD_IMAGE_FILE_LIMITS.maxMegapixels,
        types: WORLD_IMAGE_FILE_LIMITS.types,
      };

const CHARACTER = ['character'] as const;
const PAIR = ['pair'] as const;
const PLACE = ['place'] as const;
const CHARACTER_PLACE = ['character', 'place'] as const;
const ANY = ['character', 'pair', 'place'] as const;

/**
 * Текстовые поля карточки героя — полем формы: подпись — по-человечески, путь — как у поля тела
 * записи (им же подписаны ошибки сервера, он виден подсказкой).
 */
export const BOOK_WORLD_TEXT_FIELDS = [
  { key: 'short', path: 'short', label: 'Short', rows: 3, kinds: ANY },
  {
    key: 'position',
    path: 'profile.position',
    label: 'Profile: position',
    rows: 2,
    kinds: CHARACTER,
  },
  {
    key: 'relationToMain',
    path: 'profile.relationToMain',
    label: 'Profile: relation to the main hero',
    rows: 2,
    kinds: CHARACTER,
  },
  { key: 'appearance', path: 'appearance', label: 'Appearance', rows: 4, kinds: CHARACTER },
  { key: 'character', path: 'character', label: 'Character', rows: 6, kinds: CHARACTER },
  { key: 'arcFrom', path: 'arc.from', label: 'Arc: at the start', rows: 3, kinds: CHARACTER },
  { key: 'arcTo', path: 'arc.to', label: 'Arc: at the end', rows: 3, kinds: CHARACTER },
  { key: 'critique', path: 'critique', label: 'Critique', rows: 5, kinds: CHARACTER },
  { key: 'prototypes', path: 'prototypes', label: 'Prototypes', rows: 4, kinds: CHARACTER },
  // Поля пары (F08-8c): у героя их нет, у пары нет полей героя.
  { key: 'bonds', path: 'bonds', label: 'Pair: what binds them', rows: 4, kinds: PAIR },
  {
    key: 'differences',
    path: 'differences',
    label: 'Pair: what sets them apart',
    rows: 4,
    kinds: PAIR,
  },
  { key: 'conclusion', path: 'conclusion', label: 'Pair: conclusion', rows: 4, kinds: PAIR },
  // Поля места (F08-12b): у героя и пары их нет; вид и номер Wikidata — своими полями карточки.
  { key: 'location', path: 'location', label: 'Place: location', rows: 2, kinds: PLACE },
  {
    key: 'significance',
    path: 'significance',
    label: 'Place: significance in the book',
    rows: 5,
    kinds: PLACE,
  },
  { key: 'description', path: 'description', label: 'Place: description', rows: 4, kinds: PLACE },
] as const;
export type BookWorldTextKey = (typeof BOOK_WORLD_TEXT_FIELDS)[number]['key'];

/** Списки карточки — JSON-редактором, как у анализа; путь — как у поля тела записи. */
export const BOOK_WORLD_LIST_FIELDS = [
  { key: 'stages', path: 'arc.stages', label: 'Arc: stages', kinds: CHARACTER },
  { key: 'scenes', path: 'scenes', label: 'Key scenes', kinds: CHARACTER_PLACE },
  { key: 'relations', path: 'relations', label: 'Relations', kinds: CHARACTER },
  { key: 'compare', path: 'compare', label: 'Pair: comparison table', kinds: PAIR },
  { key: 'quotes', path: 'quotes', label: 'Quotes', kinds: ANY },
  { key: 'adaptations', path: 'adaptations', label: 'Adaptations', kinds: CHARACTER },
  { key: 'faq', path: 'faq', label: 'FAQ', kinds: ANY },
  { key: 'sources', path: 'sources', label: 'Sources', kinds: CHARACTER },
] as const;
export type BookWorldListKey = (typeof BOOK_WORLD_LIST_FIELDS)[number]['key'];

/**
 * Поля карточки сущности этого типа: у пары и места - свои и общие (`short`, `quotes`, `faq`; у места
 * ещё `scenes`), без полей героя.
 */
export const worldTextFieldsOf = (type: string) =>
  BOOK_WORLD_TEXT_FIELDS.filter((f) => (f.kinds as readonly string[]).includes(type));
export const worldListFieldsOf = (type: string) =>
  BOOK_WORLD_LIST_FIELDS.filter((f) => (f.kinds as readonly string[]).includes(type));
