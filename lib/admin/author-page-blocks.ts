import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Блоки страницы автора (F02-2) без `zod`: лимиты DTO, ключи блоков, ошибки и их текст.
 * Этот модуль импортируется статически формой автора; схема на `zod` —
 * `author-page-blocks.schema.ts`, она грузится лениво (`load-author-validation.ts`).
 */

export const AUTHOR_PAGE_LIMITS = {
  tagline: 140,
  nativeName: 200,
  text: 300,
  title: 300,
  facts: { item: 120, list: 20 },
  notableWorks: 7,
  startHere: { list: 5, reason: 220 },
  timeline: { list: 15, text: 200 },
  influences: 8,
  awards: 20,
  adaptations: 10,
  funFacts: { list: 5, text: 300 },
  sources: 10,
  quotes: 50,
  slug: 200,
  year: { min: -3000, max: 2100 },
} as const;

export const AUTHOR_ADAPTATION_KINDS = [
  'film',
  'series',
  'animation',
  'play',
  'opera',
  'other',
] as const;

export const AUTHOR_GENDERS = ['male', 'female'] as const;

/** Блоки, которые форма правит JSON-редактором (решение арбитра В3), в порядке вывода. */
export const AUTHOR_BLOCK_KEYS = [
  'notableWorks',
  'startHere',
  'timeline',
  'influences',
  'awards',
  'adaptations',
  'funFacts',
  'sources',
  'quotes',
] as const;

export type AuthorBlockKey = (typeof AUTHOR_BLOCK_KEYS)[number];

export type AuthorIssueReason =
  | 'required'
  | 'notString'
  | 'notNumber'
  | 'notInteger'
  | 'notBoolean'
  | 'notArray'
  | 'notObject'
  | 'tooLong'
  | 'tooMany'
  | 'yearRange'
  | 'url'
  | 'oneOf'
  | 'invalid'
  | 'invalidJson'
  | 'unknownKey'
  | 'slug';

/** Ошибка данных автора: «язык → путь: причина». `lang: null` — общее для всех языков. */
export interface AuthorDataIssue {
  lang: SupportedLang | null;
  path: string;
  reason: AuthorIssueReason;
  params?: Record<string, string | number>;
}

export interface AuthorCheckResult<T> {
  /** Данные без неизвестных ключей; `null`, если есть ошибки. */
  data: T | null;
  errors: AuthorDataIssue[];
  /** Неизвестные ключи: в режиме импорта — предупреждение, ключ вырезан из `data`. */
  unknownKeys: AuthorDataIssue[];
}

type PathSegment = PropertyKey;

export const formatIssuePath = (path: readonly PathSegment[]): string =>
  path.reduce<string>((acc, segment) => {
    if (typeof segment === 'number') return `${acc}[${segment}]`;
    return acc ? `${acc}.${String(segment)}` : String(segment);
  }, '');

/** Подпись области ошибки без языка: общие поля автора. */
export const AUTHOR_SCOPE_LABEL = 'author';

/**
 * Причины по-человечески. Админка не переведена — английский текст в коде, как в остальных
 * формах (решение арбитра F02-2, вариант B).
 */
const REASON_TEXT: Record<AuthorIssueReason, (params: Record<string, string | number>) => string> =
  {
    required: () => 'required',
    notString: () => 'must be text',
    notNumber: () => 'must be a number',
    notInteger: () => 'must be a whole number',
    notBoolean: () => 'must be true or false',
    notArray: () => 'must be a list',
    notObject: () => 'must be an object',
    tooLong: (p) => `longer than ${p.max} characters`,
    tooMany: (p) => `more than ${p.max} items`,
    yearRange: (p) => `year must be between ${p.min} and ${p.max}`,
    url: () => 'must be an absolute http(s) link',
    oneOf: (p) => `must be one of: ${p.values}`,
    invalid: () => 'invalid value',
    invalidJson: () => 'invalid JSON',
    unknownKey: () => 'unknown key',
    slug: () => 'must be a slug: lowercase latin letters, digits and single hyphens',
  };

/** «ru → funFacts[2].sourceUrl: must be an absolute http(s) link». */
export const formatAuthorDataIssue = (issue: AuthorDataIssue): string => {
  const scope = issue.lang ?? AUTHOR_SCOPE_LABEL;
  const reason = REASON_TEXT[issue.reason](issue.params ?? {});
  return issue.path ? `${scope} → ${issue.path}: ${reason}` : `${scope}: ${reason}`;
};
