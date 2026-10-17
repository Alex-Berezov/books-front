import { z } from 'zod';
import {
  BOOK_ANALYSIS_ADAPTATION_KINDS,
  BOOK_ANALYSIS_KEY_REGEX,
  BOOK_ANALYSIS_LIMITS as L,
  BOOK_ANALYSIS_ROLES,
  BOOK_ANALYSIS_TIMELINE_KINDS,
  type BookAnalysisIssue,
  type BookAnalysisListKey,
} from '@/lib/admin/book-analysis-blocks';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { isAbsoluteHttpsUrl } from '@/lib/utils/http-url';
import type { BookAnalysisBlocks, SaveBookAnalysisRequest } from '@/types/api-schema';

/**
 * Анализ книги (F03-1): зеркало `books/src/modules/book-analysis/dto/*.ts` — те же лимиты,
 * обязательные поля, перечни и закрытая форма (бэкенд с `forbidNonWhitelisted` отбивает лишний
 * ключ 400, поэтому здесь неизвестный ключ — ошибка с путём, §21 п.3). Перекрёстные ссылки,
 * ядро и номера глав здесь **не** проверяются: их считает бэкенд на слитой записи, окно импорта
 * спрашивает его пробным сохранением (`dryRun`, решение арбитра А3).
 *
 * Модуль тяжёлый (`zod`) и грузится лениво — через `book-analysis-validation.ts`.
 * Строки обрезаются; `''` и `null` у необязательного поля — «нет значения».
 */

const requiredText = (max: number) => z.string().trim().min(1).max(max);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null));

const key = () => z.string().trim().regex(BOOK_ANALYSIS_KEY_REGEX);

const chapter = () => z.int().min(1).max(L.chapter);

const optionalChapter = () =>
  chapter()
    .nullable()
    .optional()
    .transform((value) => value ?? null);

const list = <T extends z.ZodType>(item: T, max: number) => z.array(item).max(max);

const optionalList = <T extends z.ZodType>(item: T, max: number) =>
  list(item, max)
    .nullable()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const quote = z.strictObject({ text: requiredText(L.quote), chapter: optionalChapter() });

const optionalQuote = () =>
  quote
    .nullable()
    .optional()
    .transform((value) => value ?? null);

const keyList = () => optionalList(key(), L.themeKeys);

export const BOOK_ANALYSIS_BLOCK_SCHEMAS = {
  themes: list(
    z.strictObject({
      key: key(),
      title: requiredText(L.title),
      interpretation: optionalText(L.interpretation),
      chapters: optionalList(chapter(), L.chapters),
      quotes: optionalList(
        z.strictObject({
          text: requiredText(L.quote),
          chapter: optionalChapter(),
          comment: optionalText(L.quote),
        }),
        L.themeQuotes
      ),
    }),
    L.themes
  ),
  characters: list(
    z.strictObject({
      key: key(),
      name: requiredText(L.title),
      role: z.enum(BOOK_ANALYSIS_ROLES),
      description: optionalText(L.mediumText),
      arc: z
        .strictObject({ from: requiredText(L.title), to: requiredText(L.title) })
        .nullable()
        .optional()
        .transform((value) => value ?? null),
      quote: optionalQuote(),
      themeKeys: keyList(),
      relations: optionalList(
        z.strictObject({ to: key(), label: requiredText(L.label) }),
        L.relations
      ),
    }),
    L.characters
  ),
  symbols: list(
    z.strictObject({
      title: requiredText(L.title),
      interpretation: requiredText(L.interpretation),
      chapters: optionalList(chapter(), L.chapters),
      quote: optionalQuote(),
    }),
    L.symbols
  ),
  keyQuotes: list(
    z.strictObject({
      text: requiredText(L.quote),
      chapter: optionalChapter(),
      speakerKey: z
        .union([key(), z.literal('')])
        .nullable()
        .optional()
        .transform((value) => (value ? value : null)),
      themeKeys: keyList(),
      interpretation: optionalText(L.interpretation),
    }),
    L.keyQuotes
  ),
  timeline: list(
    z.strictObject({
      year: requiredText(L.year),
      event: requiredText(L.title),
      kind: z.enum(BOOK_ANALYSIS_TIMELINE_KINDS),
    }),
    L.timeline
  ),
  style: list(
    z.strictObject({
      device: requiredText(L.title),
      explanation: requiredText(L.mediumText),
      example: optionalQuote(),
    }),
    L.style
  ),
  adaptations: list(
    z.strictObject({
      title: requiredText(L.title),
      year: z
        .int()
        .min(L.adaptationYear.min)
        .max(L.adaptationYear.max)
        .nullable()
        .optional()
        .transform((value) => value ?? null),
      kind: z.enum(BOOK_ANALYSIS_ADAPTATION_KINDS),
      differences: optionalText(L.mediumText),
    }),
    L.adaptations
  ),
  misreadings: list(
    z.strictObject({ myth: requiredText(L.question), explanation: requiredText(L.mediumText) }),
    L.misreadings
  ),
  discussionQuestions: list(requiredText(L.question), L.discussionQuestions),
  faq: list(
    z.strictObject({ question: requiredText(L.question), answer: requiredText(L.longText) }),
    L.faq
  ),
  sources: list(
    z.strictObject({
      title: requiredText(L.title),
      url: z.string().trim().min(1).refine(isAbsoluteHttpsUrl, 'must be an absolute https:// URL'),
    }),
    L.sources
  ),
} satisfies Record<BookAnalysisListKey, z.ZodType>;

const facts = z.strictObject({
  genre: optionalText(L.title),
  movement: optionalText(L.title),
  writtenYears: optionalText(L.title),
  settingPlace: optionalText(L.title),
  settingTime: optionalText(L.title),
  narrator: optionalText(L.title),
  structure: optionalText(L.title),
});

/** Блок верхнего уровня импорта: `null`, `[]` и `''` — «очистить». */
const clearable = <T extends z.ZodType>(schema: T) => schema.nullable().optional();

const importSchema = z.strictObject({
  language: z.enum(SUPPORTED_LANGS),
  facts: clearable(facts),
  mainIdea: clearable(z.string().trim().max(L.mainIdea)),
  titleMeaning: clearable(z.string().trim().max(L.longText)),
  endingMeaning: clearable(z.string().trim().max(L.longText)),
  context: clearable(z.string().trim().max(L.longText)),
  reception: clearable(z.string().trim().max(L.longText)),
  ...Object.fromEntries(
    Object.entries(BOOK_ANALYSIS_BLOCK_SCHEMAS).map(([k, schema]) => [k, clearable(schema)])
  ),
});

const toIssues = (error: z.ZodError, prefix = ''): BookAnalysisIssue[] =>
  error.issues.flatMap((issue) => {
    const base = [prefix, ...issue.path.map(String)].filter(Boolean).join('.');
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((k) => ({
        path: base ? `${base}.${k}` : k,
        message: 'unknown key',
      }));
    }
    return [{ path: base, message: issue.message }];
  });

export interface BookAnalysisCheckResult<T> {
  data: T | null;
  errors: BookAnalysisIssue[];
}

/**
 * JSON импорта целиком. Язык обязан совпасть с языком версии (§21 п.3): иначе отказ, как на бэкенде.
 */
export const checkBookAnalysisImport = (
  value: unknown,
  versionLanguage: string
): BookAnalysisCheckResult<SaveBookAnalysisRequest> => {
  const parsed = importSchema.safeParse(value);
  if (!parsed.success) return { data: null, errors: toIssues(parsed.error) };
  if (parsed.data.language !== versionLanguage) {
    return {
      data: null,
      errors: [
        {
          path: 'language',
          message: `JSON is "${parsed.data.language}", the version is "${versionLanguage}"`,
        },
      ],
    };
  }
  return { data: parsed.data as SaveBookAnalysisRequest, errors: [] };
};

/** Один список из JSON-редактора формы: та же схема, что у импорта. */
export const checkBookAnalysisBlock = <K extends BookAnalysisListKey>(
  blockKey: K,
  value: unknown
): BookAnalysisCheckResult<NonNullable<BookAnalysisBlocks[K]>> => {
  const parsed = BOOK_ANALYSIS_BLOCK_SCHEMAS[blockKey].safeParse(value);
  if (!parsed.success) return { data: null, errors: toIssues(parsed.error, blockKey) };
  return { data: parsed.data as NonNullable<BookAnalysisBlocks[K]>, errors: [] };
};
