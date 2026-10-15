import { z } from 'zod';
import {
  AUTHOR_ADAPTATION_KINDS,
  AUTHOR_GENDERS,
  AUTHOR_PAGE_LIMITS,
  formatIssuePath,
  type AuthorBlockKey,
  type AuthorCheckResult,
  type AuthorDataIssue,
} from '@/lib/admin/author-page-blocks';
import { FAQ_ANSWER_MAX_LENGTH, FAQ_QUESTION_MAX_LENGTH } from '@/lib/constants/faq';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { isAbsoluteHttpUrl } from '@/lib/utils/http-url';

/**
 * Блоки страницы автора (F02-2): зеркало `books/src/modules/author/dto/author-page-blocks.dto.ts`
 * и `author-translation.dto.ts` — те же лимиты, обязательные поля и форма. Одна схема на импорт
 * JSON и на JSON-редакторы формы (решение арбитра В3), чтобы ошибка с путём показывалась
 * до отправки, а не отказом 400 (`forbidNonWhitelisted` на бэкенде отбивает и лишний ключ).
 *
 * Модуль тяжёлый (`zod`) и грузится лениво — через `author-validation.ts` и
 * `loadAuthorValidation`: в запись роутов авторов он попадать не должен (бюджет бандла,
 * решение арбитра F02-2). Лимиты, ключи и текст ошибок без `zod` — `author-page-blocks.ts`.
 *
 * Полный `zod`, а не `zod/mini`: им уже пользуются формы админки (книги, страницы, таксономии),
 * и `zod/mini` рядом с ним сливался в общий кусок бандла — +27 kB роутам, которые эту схему
 * не зовут. Роутам авторов `zod` прибавляет вес (бюджет бандла, `T75`) — цена проверки формы
 * до отправки.
 *
 * Строки обрезаются по краям; `''` и `null` у необязательного листового поля — «нет значения»
 * (на выходе схемы поле пропадает). У поля верхнего уровня перевода `null`, `[]` и `''` значат
 * «очистить» (T5), поэтому там `null` сохраняется как есть.
 */

/** Ключи `UpdateSeoDto`: другой ключ во вложенном `seo` бэкенд отбивает 400. */
const SEO_KEYS = [
  'metaTitle',
  'metaDescription',
  'canonicalUrl',
  'robots',
  'ogTitle',
  'ogDescription',
  'ogType',
  'ogUrl',
  'ogImageUrl',
  'ogImageAlt',
  'twitterCard',
  'twitterSite',
  'twitterCreator',
  'eventName',
  'eventDescription',
  'eventStartDate',
  'eventEndDate',
  'eventUrl',
  'eventImageUrl',
  'eventLocationName',
  'eventLocationStreet',
  'eventLocationCity',
  'eventLocationRegion',
  'eventLocationPostal',
  'eventLocationCountry',
] as const;

const L = AUTHOR_PAGE_LIMITS;

/** Сообщение проверки адреса: по нему причина отличается от прочих `custom`. */
const URL_CHECK = 'url';

/** Сообщение проверки формата слага. */
const SLUG_CHECK = 'slug';

/**
 * Формат слага книги или автора в данных — `SLUG_PATTERN` бэкенда
 * (`books/src/shared/validators/slug.ts`), тот же, что у слага записи.
 */
const SLUG_FORMAT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isSlugOrEmpty = (value: string) => value === '' || SLUG_FORMAT.test(value);

const isHttpUrlOrEmpty = (value: string) => value === '' || isAbsoluteHttpUrl(value);

const requiredText = (max: number) => z.string().trim().min(1).max(max);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value ? value : undefined));

const optionalSlug = () =>
  z
    .string()
    .trim()
    .max(L.slug)
    .refine(isSlugOrEmpty, SLUG_CHECK)
    .nullable()
    .optional()
    .transform((value) => (value ? value : undefined));

const requiredUrl = () => z.string().trim().min(1).refine(isHttpUrlOrEmpty, URL_CHECK);

const urlOrEmpty = () => z.string().trim().refine(isHttpUrlOrEmpty, URL_CHECK);

const optionalUrl = () =>
  urlOrEmpty()
    .nullable()
    .optional()
    .transform((value) => (value ? value : undefined));

const year = () => z.int().min(L.year.min).max(L.year.max);

const optionalYear = () =>
  year()
    .nullable()
    .optional()
    .transform((value) => value ?? undefined);

const factList = () =>
  z
    .array(requiredText(L.facts.item))
    .max(L.facts.list)
    .nullable()
    .optional()
    .transform((value) => value ?? undefined);

export const authorPhotoCreditSchema = z.strictObject({
  author: requiredText(L.title),
  license: requiredText(L.title),
  licenseUrl: optionalUrl(),
  sourceUrl: optionalUrl(),
});

export const authorFactsSchema = z.strictObject({
  gender: z
    .enum([...AUTHOR_GENDERS, ''])
    .nullable()
    .optional()
    .transform((value) => (value ? value : undefined)),
  birthPlace: optionalText(L.title),
  deathPlace: optionalText(L.title),
  nationality: optionalText(L.title),
  occupations: factList(),
  movements: factList(),
  genres: factList(),
  languages: factList(),
  pseudonyms: factList(),
});

const notableWorkSchema = z.strictObject({
  title: requiredText(L.title),
  year: optionalYear(),
  bookSlug: optionalSlug(),
});

const startHereSchema = z.strictObject({
  bookSlug: requiredText(L.slug).refine(isSlugOrEmpty, SLUG_CHECK),
  reason: requiredText(L.startHere.reason),
});

const timelineEventSchema = z.strictObject({
  year: year(),
  text: requiredText(L.timeline.text),
  bookSlug: optionalSlug(),
});

const influenceRefSchema = z.strictObject({
  name: requiredText(L.title),
  authorSlug: optionalSlug(),
});

const influenceList = () =>
  z
    .array(influenceRefSchema)
    .max(L.influences)
    .nullable()
    .optional()
    .transform((value) => value ?? []);

const influencesSchema = z.strictObject({
  influencedBy: influenceList(),
  influenced: influenceList(),
});

const awardSchema = z.strictObject({
  name: requiredText(L.title),
  year: optionalYear(),
  nomination: z
    .boolean()
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
});

const adaptationSchema = z.strictObject({
  title: requiredText(L.title),
  year: optionalYear(),
  kind: z.enum(AUTHOR_ADAPTATION_KINDS),
  basedOn: optionalText(L.title),
  bookSlug: optionalSlug(),
});

const funFactSchema = z.strictObject({
  text: requiredText(L.funFacts.text),
  sourceTitle: requiredText(L.title),
  sourceUrl: requiredUrl(),
});

const sourceSchema = z.strictObject({
  title: requiredText(L.title),
  url: requiredUrl(),
});

/** `AuthorQuoteDto`: у текста и источника бэкенд предела длины не ставит; цитат — не больше `quotes`. */
const quoteSchema = z.strictObject({
  text: z.string().trim().min(1),
  source: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => (value ? value : undefined)),
  bookSlug: optionalSlug(),
});

const faqSchema = z.strictObject({
  question: z.string().max(FAQ_QUESTION_MAX_LENGTH),
  answer: z.string().max(FAQ_ANSWER_MAX_LENGTH),
});

/** Блоки, которые форма правит JSON-редактором (решение арбитра В3). `null` — блока нет. */
export const AUTHOR_BLOCK_SCHEMAS = {
  notableWorks: z.array(notableWorkSchema).max(L.notableWorks).nullable(),
  startHere: z.array(startHereSchema).max(L.startHere.list).nullable(),
  timeline: z.array(timelineEventSchema).max(L.timeline.list).nullable(),
  influences: influencesSchema.nullable(),
  awards: z.array(awardSchema).max(L.awards).nullable(),
  adaptations: z.array(adaptationSchema).max(L.adaptations).nullable(),
  funFacts: z.array(funFactSchema).max(L.funFacts.list).nullable(),
  sources: z.array(sourceSchema).max(L.sources).nullable(),
  quotes: z.array(quoteSchema).max(L.quotes).nullable(),
} satisfies Record<AuthorBlockKey, z.ZodType>;

export type AuthorBlockValues = {
  [K in AuthorBlockKey]: z.output<(typeof AUTHOR_BLOCK_SCHEMAS)[K]>;
};

export type AuthorFactsValue = z.output<typeof authorFactsSchema>;

export type AuthorPhotoCreditValue = z.output<typeof authorPhotoCreditSchema>;

const looseText = () => z.string().nullable().optional();

const seoSchema = z.strictObject(
  Object.fromEntries(SEO_KEYS.map((key) => [key, looseText()])) as Record<
    (typeof SEO_KEYS)[number],
    ReturnType<typeof looseText>
  >
);

/**
 * Перевод в JSON импорта (`tech.md` §3, T4). Блоки верхнего уровня — `null` сохраняется:
 * по нему слияние очищает поле (T5). `metaTitle`/`metaDescription` на уровне перевода —
 * прежний формат импорта, его по-прежнему понимаем.
 */
const translationImportSchema = z.strictObject({
  name: looseText(),
  slug: looseText(),
  biography: looseText(),
  wikidataUrl: urlOrEmpty().nullable().optional(),
  wikipediaUrl: urlOrEmpty().nullable().optional(),
  photoUrl: urlOrEmpty().nullable().optional(),
  tagline: z.string().trim().max(L.tagline).nullable().optional(),
  facts: authorFactsSchema.nullable().optional(),
  notableWorks: AUTHOR_BLOCK_SCHEMAS.notableWorks.optional(),
  startHere: AUTHOR_BLOCK_SCHEMAS.startHere.optional(),
  timeline: AUTHOR_BLOCK_SCHEMAS.timeline.optional(),
  influences: AUTHOR_BLOCK_SCHEMAS.influences.optional(),
  awards: AUTHOR_BLOCK_SCHEMAS.awards.optional(),
  adaptations: AUTHOR_BLOCK_SCHEMAS.adaptations.optional(),
  funFacts: AUTHOR_BLOCK_SCHEMAS.funFacts.optional(),
  sources: AUTHOR_BLOCK_SCHEMAS.sources.optional(),
  quotes: AUTHOR_BLOCK_SCHEMAS.quotes.optional(),
  faq: z.array(faqSchema).nullable().optional(),
  similarSlugs: z
    .union([z.array(z.string()), z.string()])
    .nullable()
    .optional(),
  seo: seoSchema.nullable().optional(),
  metaTitle: looseText(),
  metaDescription: looseText(),
});

const isBlank = (value: unknown) => value === undefined || value === null || value === '';

/**
 * Подпись портрета в формате импорта (`tech.md` §3) показана объектом из пустых строк —
 * такой объект значит «подписи нет», а не «не заполнены обязательные поля».
 */
const importPhotoCreditSchema = z.preprocess(
  (value: unknown) =>
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every(isBlank)
      ? null
      : value,
  authorPhotoCreditSchema.nullable()
);

const translationsImportSchema = z.strictObject(
  Object.fromEntries(
    SUPPORTED_LANGS.map((lang) => [lang, translationImportSchema.optional()])
  ) as Record<SupportedLang, z.ZodOptional<typeof translationImportSchema>>
);

/** JSON импорта целиком: промпт № 1 (данные) и промпт № 2 (`{translations:{<lang>:{biography}}}`). */
export const authorImportSchema = z.strictObject({
  birthDate: looseText(),
  deathDate: looseText(),
  nativeName: z.string().trim().max(L.nativeName).nullable().optional(),
  photoCredit: importPhotoCreditSchema.optional(),
  translations: translationsImportSchema,
});

export type AuthorImportData = z.output<typeof authorImportSchema>;

export type AuthorTranslationImport = z.output<typeof translationImportSchema>;

const reasonOf = (issue: z.core.$ZodIssue): Pick<AuthorDataIssue, 'reason' | 'params'> => {
  switch (issue.code) {
    case 'invalid_type': {
      if (issue.input === undefined || issue.input === null) return { reason: 'required' };
      switch (issue.expected) {
        case 'string':
          return { reason: 'notString' };
        case 'number':
        case 'int':
          return { reason: typeof issue.input === 'number' ? 'notInteger' : 'notNumber' };
        case 'boolean':
          return { reason: 'notBoolean' };
        case 'array':
          return { reason: 'notArray' };
        case 'object':
          return { reason: 'notObject' };
        default:
          return { reason: 'invalid' };
      }
    }
    case 'too_small':
      return issue.origin === 'number'
        ? { reason: 'yearRange', params: { min: L.year.min, max: L.year.max } }
        : { reason: 'required' };
    case 'too_big':
      if (issue.origin === 'string') {
        return { reason: 'tooLong', params: { max: Number(issue.maximum) } };
      }
      if (issue.origin === 'array') {
        return { reason: 'tooMany', params: { max: Number(issue.maximum) } };
      }
      return { reason: 'yearRange', params: { min: L.year.min, max: L.year.max } };
    case 'invalid_value':
      return {
        reason: 'oneOf',
        params: { values: issue.values.filter((v) => v !== '').join(', ') },
      };
    case 'custom':
      if (issue.message === URL_CHECK) return { reason: 'url' };
      if (issue.message === SLUG_CHECK) return { reason: 'slug' };
      return { reason: 'invalid' };
    default:
      return { reason: 'invalid' };
  }
};

type PathSegment = PropertyKey;

type Locate = (path: readonly PathSegment[]) => { lang: SupportedLang | null; path: string };

const removeKeys = (root: unknown, at: readonly PathSegment[], keys: readonly string[]) => {
  let node: unknown = root;
  for (const segment of at) {
    if (node === null || typeof node !== 'object') return;
    node = (node as Record<PropertyKey, unknown>)[segment];
  }
  if (node === null || typeof node !== 'object') return;
  for (const key of keys) delete (node as Record<string, unknown>)[key];
};

const unknownKeyIssues = (issue: z.core.$ZodIssue, locate: Locate): AuthorDataIssue[] =>
  issue.code === 'unrecognized_keys'
    ? issue.keys.map((key) => ({
        ...locate([...issue.path, key]),
        reason: 'unknownKey' as const,
      }))
    : [];

/**
 * Проверка с разбором ошибок. `stripUnknown` — режим импорта: неизвестный ключ не отказ,
 * а предупреждение, и ключ вырезается (`forbidNonWhitelisted` бэкенда отбил бы весь запрос).
 * Без него неизвестный ключ — ошибка: в JSON-редакторе формы его правят на месте.
 */
const runCheck = <T>(
  schema: z.ZodType<T>,
  input: unknown,
  locate: Locate,
  stripUnknown: boolean
): AuthorCheckResult<T> => {
  const current: unknown = stripUnknown ? structuredClone(input) : input;
  const unknownKeys: AuthorDataIssue[] = [];
  // Неизвестный ключ внутри неизвестного не сообщается: снятый раз за проходом, он кончается
  // за глубину вложенности JSON — предел с запасом.
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const result = schema.safeParse(current, { reportInput: true });
    if (result.success) return { data: result.data, errors: [], unknownKeys };

    const unrecognized = result.error.issues.filter((i) => i.code === 'unrecognized_keys');
    const other = result.error.issues.filter((i) => i.code !== 'unrecognized_keys');
    const found = unrecognized.flatMap((issue) => unknownKeyIssues(issue, locate));
    const errors = other.map((issue) => ({ ...locate(issue.path), ...reasonOf(issue) }));

    if (!stripUnknown) return { data: null, errors: [...found, ...errors], unknownKeys: [] };
    unknownKeys.push(...found);
    if (errors.length > 0 || unrecognized.length === 0) {
      return { data: null, errors, unknownKeys };
    }
    for (const issue of unrecognized) {
      if (issue.code === 'unrecognized_keys') removeKeys(current, issue.path, issue.keys);
    }
  }
  return { data: null, errors: [], unknownKeys };
};

const isSupportedLangKey = (value: PathSegment): value is SupportedLang =>
  typeof value === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(value);

const locateInImport: Locate = (path) => {
  if (path[0] === 'translations' && path.length > 1 && isSupportedLangKey(path[1]!)) {
    return { lang: path[1], path: formatIssuePath(path.slice(2)) };
  }
  return { lang: null, path: formatIssuePath(path) };
};

/** JSON импорта: ошибки формы — отказ, неизвестные ключи — предупреждение и вырезаются. */
export const checkAuthorImport = (input: unknown): AuthorCheckResult<AuthorImportData> =>
  runCheck(authorImportSchema, input, locateInImport, true);

/** Один блок из JSON-редактора формы; путь ошибки начинается с имени блока. */
export const checkAuthorBlock = <K extends AuthorBlockKey>(
  key: K,
  value: unknown,
  lang: SupportedLang
): AuthorCheckResult<AuthorBlockValues[K]> =>
  runCheck(
    AUTHOR_BLOCK_SCHEMAS[key] as unknown as z.ZodType<AuthorBlockValues[K]>,
    value,
    (path) => ({ lang, path: formatIssuePath([key, ...path]) }),
    false
  );

/** Сводка фактов из полей формы перед сохранением. */
export const checkAuthorFacts = (
  value: unknown,
  lang: SupportedLang
): AuthorCheckResult<AuthorFactsValue> =>
  runCheck(
    authorFactsSchema,
    value,
    (path) => ({ lang, path: formatIssuePath(['facts', ...path]) }),
    false
  );

/** Подпись портрета из полей формы перед сохранением. */
export const checkAuthorPhotoCredit = (value: unknown): AuthorCheckResult<AuthorPhotoCreditValue> =>
  runCheck(
    authorPhotoCreditSchema,
    value,
    (path) => ({ lang: null, path: formatIssuePath(['photoCredit', ...path]) }),
    false
  );
