import { z } from 'zod';
import {
  BOOK_WORLD_KEY_REGEX,
  BOOK_WORLD_LIMITS as L,
  BOOK_WORLD_ROLES,
  WIKIDATA_ID_MAX,
  WIKIDATA_ID_REGEX,
  WORLD_PLACE_KINDS,
  type BookWorldIssue,
} from '@/lib/admin/book-world-blocks';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { isAbsoluteHttpsUrl } from '@/lib/utils/http-url';
import type { SaveBookWorldEntityRequest, SaveBookWorldRequest } from '@/types/api-schema';

/**
 * Мир книги (F08-1): зеркало `books/src/modules/book-world/dto/*.ts` — те же лимиты, обязательные
 * поля, перечни и закрытая форма (бэкенд с `forbidNonWhitelisted` отбивает лишний ключ 400,
 * поэтому здесь неизвестный ключ — ошибка с путём). Ссылки ключей (`relations[].to`,
 * `speakerKey`), главы версии, дословность цитат и ядро здесь **не** проверяются: их считает
 * бэкенд на слитом наборе, окно импорта спрашивает его пробным сохранением (`dryRun`).
 *
 * Модуль тяжёлый (`zod`) и грузится лениво — через `book-world-validation.ts`.
 * В теле записи ключа поля нет — поле не трогается; `null`, `''`, `[]` — очистить (слияние
 * делает сервер, как у анализа).
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

const key = () => z.string().trim().regex(BOOK_WORLD_KEY_REGEX);

const chapter = () => z.int().min(1).max(L.chapter);

const list = <T extends z.ZodType>(item: T, max: number) => z.array(item).max(max);

/** Поле тела записи: `null`, `[]` и `''` — «очистить», ключа нет — «не трогать». */
const clearable = <T extends z.ZodType>(schema: T) => schema.nullable().optional();

const optionalKey = () =>
  z
    .union([key(), z.literal('')])
    .nullable()
    .optional()
    .transform((value) => (value ? value : null));

type EntityKind = 'pair' | 'character' | 'place';

/**
 * Поле не своего типа (у пары - поле героя или места, у героя - поле пары или места, у места - поле
 * героя или пары; перечни - `WORLD_BLOCKS_OF_TYPE` в `books/src/modules/book-world/book-world-data.ts`): бэкенд принимает его пустым - после
 * слияния (`compactBlock`) оно пусто, а `checkWorldTypeFields` (`books/src/modules/book-world/world-refs.ts`)
 * отбивает только непустое. Пустое - по виду поля, как его пропускает DTO бэкенда
 * (`books/src/modules/book-world/dto/update-book-world.dto.ts`): у списка `null` и `[]`, у текста `null`
 * и строка из пробелов, у «профиля» `null` и объект с пустыми полями, у роли и пути - `null`. Пустое
 * уходит в тело записи как `null` - «очистить», как у бэкенда (ключа нет - «не трогать»): иначе при смене
 * типа старое значение осталось бы и бэкенд отбил бы запись. Непустое - ошибка с путём и тем же смыслом,
 * что у бэкенда. Копия правила бэкенда - менять вместе (`ai-context/folder-structure.md`).
 */
const notAField = (kind: EntityKind) => ({ error: `not a field of a ${kind}` });

const cleared = <T extends z.ZodType>(schema: T) =>
  schema.optional().transform((value) => (value === undefined ? undefined : null));

/** Строка из пробелов; непустая - та же ошибка «не поле этого типа», что у бэкенда. */
const emptyText = (kind: EntityKind) => z.string().trim().max(0, notAField(kind));

const foreignList = (kind: EntityKind) =>
  cleared(z.union([z.null(), z.array(z.never()).max(0)], notAField(kind)));

const foreignText = (kind: EntityKind) =>
  cleared(z.union([z.null(), emptyText(kind)], notAField(kind)));

const foreignObject = (kind: EntityKind) => cleared(z.null(notAField(kind)));

const PROFILE_KEYS: ReadonlySet<string> = new Set(['position', 'relationToMain']);

/** `null` или объект только из полей «профиля», каждое - `null` или строка из пробелов. */
const isEmptyProfile = (value: unknown): boolean =>
  value === null ||
  (typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([k, v]) => PROFILE_KEYS.has(k) && (v === null || (typeof v === 'string' && v.trim() === ''))
    ));

/** «Профиль» героя у пары: `null` или объект с пустыми полями (`BookWorldProfileDto`, `compactBlock`). */
const foreignProfile = (kind: EntityKind) =>
  cleared(z.unknown().refine(isEmptyProfile, notAField(kind)));

const quoteShape = () => ({
  text: requiredText(L.quote),
  chapter: chapter(),
  speakerKey: optionalKey(),
  interpretation: requiredText(L.interpretation),
});

/** Цитата героя и места: `aboutKey` - поле цитаты пары, у них принимается только пустым (как бэкенд). */
const nonPairQuoteShape = (kind: Exclude<EntityKind, 'pair'>) => ({
  ...quoteShape(),
  aboutKey: foreignText(kind),
});

/** Пустое (`null`, `''`, пробелы) - «очистить» (`null`), ключа нет - «не трогать», как `isAbsent` бэкенда. */
const absentToNull = <T>(value: T | null | undefined): T | null | undefined =>
  value === undefined ? undefined : value || null;

export const BOOK_WORLD_LIST_SCHEMAS = {
  stages: list(
    z.strictObject({
      title: requiredText(L.title),
      text: requiredText(L.text),
      chapter: chapter(),
    }),
    L.stages
  ),
  scenes: list(
    z.strictObject({
      chapter: chapter(),
      title: requiredText(L.title),
      text: requiredText(L.text),
      // Номер абзаца с 1, как `@Min(1)` бэкенда (решение арбитра `F08 | F08-10a` Q2); при чтении
      // бэкенд всё равно считает его сам из присутствия.
      paragraph: z
        .int()
        .min(1)
        .max(L.paragraph)
        .nullable()
        .optional()
        .transform((value) => value ?? null),
    }),
    L.scenes
  ),
  relations: list(z.strictObject({ to: key(), label: requiredText(L.label) }), L.relations),
  quotes: list(z.strictObject(nonPairQuoteShape('character')), L.quotes),
  placeQuotes: list(z.strictObject(nonPairQuoteShape('place')), L.quotes),
  // Цитата пары (F08-8c): кто говорит и о ком - оба обязательны и непусты (`checkWorldPair` бэкенда);
  // что оба - разные герои ключа пары, проверяет бэкенд на слитой записи.
  pairQuotes: list(
    z.strictObject({ ...quoteShape(), speakerKey: key(), aboutKey: key() }),
    L.quotes
  ),
  compare: list(
    z.strictObject({
      feature: requiredText(L.title),
      a: requiredText(L.text),
      chapterA: chapter(),
      b: requiredText(L.text),
      chapterB: chapter(),
    }),
    L.compare
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
      actor: optionalText(L.title),
      differences: requiredText(L.text),
    }),
    L.adaptations
  ),
  faq: list(
    z.strictObject({ question: requiredText(L.question), answer: requiredText(L.answer) }),
    L.faq
  ),
  sources: list(
    z.strictObject({
      title: requiredText(L.title),
      url: z.string().trim().min(1).refine(isAbsoluteHttpsUrl, 'must be an absolute https:// URL'),
    }),
    L.sources
  ),
};

/** Поля места (F08-12b) у героя и пары - только пустыми (`checkWorldTypeFields` бэкенда). */
function foreignPlaceFields(kind: Exclude<EntityKind, 'place'>) {
  return {
    kind: foreignText(kind),
    location: foreignText(kind),
    significance: foreignText(kind),
    description: foreignText(kind),
    wikidataId: foreignText(kind),
  };
}

const characterFields = {
  name: requiredText(L.name).optional(),
  role: z.enum(BOOK_WORLD_ROLES).nullable().optional(),
  aliases: clearable(list(requiredText(L.alias), L.aliases)),
  aliasExclusions: clearable(list(requiredText(L.alias), L.aliases)),
  aliasChapterExclusions: clearable(
    list(
      z.strictObject({
        form: requiredText(L.alias),
        chapters: z.array(chapter()).min(1).max(L.chapterExclusionChapters),
      }),
      L.chapterExclusions
    )
  ),
  short: clearable(z.string().trim().max(L.short)),
  profile: clearable(
    z.strictObject({
      position: optionalText(L.profileField),
      relationToMain: optionalText(L.profileField),
    })
  ),
  appearance: clearable(z.string().trim().max(L.appearance)),
  character: clearable(z.string().trim().max(L.character)),
  arc: clearable(
    z.strictObject({
      from: requiredText(L.arcText),
      to: requiredText(L.arcText),
      stages: clearable(BOOK_WORLD_LIST_SCHEMAS.stages),
    })
  ),
  scenes: clearable(BOOK_WORLD_LIST_SCHEMAS.scenes),
  relations: clearable(BOOK_WORLD_LIST_SCHEMAS.relations),
  quotes: clearable(BOOK_WORLD_LIST_SCHEMAS.quotes),
  critique: clearable(z.string().trim().max(L.critique)),
  prototypes: clearable(z.string().trim().max(L.prototypes)),
  adaptations: clearable(BOOK_WORLD_LIST_SCHEMAS.adaptations),
  faq: clearable(BOOK_WORLD_LIST_SCHEMAS.faq),
  sources: clearable(BOOK_WORLD_LIST_SCHEMAS.sources),
  // ТЗ на иллюстрацию (F08-11d-2): у героя любой роли, по-английски; читателю не отдаётся.
  imageBrief: clearable(z.string().trim().max(L.imageBrief)),
  // Поля пары и места - у героя только пустыми.
  compare: foreignList('character'),
  bonds: foreignText('character'),
  differences: foreignText('character'),
  conclusion: foreignText('character'),
  ...foreignPlaceFields('character'),
};

/**
 * Поля пары героев (F08-8c): имя, «коротко», сравнение, связи, различия, цитаты друг о друге, вывод,
 * частые вопросы. Полей героя у пары нет: непустое бэкенд отбивает 400, пустое принимает
 * (`foreignList`, `foreignText`, `foreignObject`, `foreignProfile`).
 */
const pairFields = {
  name: requiredText(L.name).optional(),
  short: clearable(z.string().trim().max(L.short)),
  compare: clearable(BOOK_WORLD_LIST_SCHEMAS.compare),
  bonds: clearable(z.string().trim().max(L.text)),
  differences: clearable(z.string().trim().max(L.text)),
  quotes: clearable(BOOK_WORLD_LIST_SCHEMAS.pairQuotes),
  conclusion: clearable(z.string().trim().max(L.text)),
  faq: clearable(BOOK_WORLD_LIST_SCHEMAS.faq),
  // Поля героя - у пары только пустыми.
  role: foreignObject('pair'),
  aliases: foreignList('pair'),
  aliasExclusions: foreignList('pair'),
  aliasChapterExclusions: foreignList('pair'),
  profile: foreignProfile('pair'),
  appearance: foreignText('pair'),
  character: foreignText('pair'),
  arc: foreignObject('pair'),
  scenes: foreignList('pair'),
  relations: foreignList('pair'),
  critique: foreignText('pair'),
  prototypes: foreignText('pair'),
  adaptations: foreignList('pair'),
  sources: foreignList('pair'),
  imageBrief: foreignText('pair'),
  ...foreignPlaceFields('pair'),
};

/** Вид места: `real`/`fictional` после обрезки; `''` - пусто, как `@Trim() @IsIn` с `isAbsent` бэкенда. */
const placeKind = () =>
  z
    .string()
    .trim()
    .pipe(z.enum([...WORLD_PLACE_KINDS, '']))
    .nullable()
    .optional()
    .transform(absentToNull);

/** Номер Wikidata (`Q90`); `''` - пусто, как `@Trim() @MaxLength @Matches` с `isAbsent` бэкенда. */
const wikidataId = () =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (value.length <= WIKIDATA_ID_MAX && WIKIDATA_ID_REGEX.test(value)),
      'must be a Wikidata item ID, e.g. Q90'
    )
    .nullable()
    .optional()
    .transform(absentToNull);

/**
 * Поля места (F08-12b, решения арбитра `F08 | F08-12` Q1 и `F08 | F08-12b` Q2): имя, формы имени,
 * «коротко», вид, где, значение, описание, номер Wikidata, сцены, цитаты, частые вопросы и ТЗ на
 * иллюстрацию. Роли, источников, полей героя и пары у места нет: непустое бэкенд отбивает 400.
 */
const placeFields = {
  name: requiredText(L.name).optional(),
  aliases: characterFields.aliases,
  aliasExclusions: characterFields.aliasExclusions,
  aliasChapterExclusions: characterFields.aliasChapterExclusions,
  short: clearable(z.string().trim().max(L.short)),
  kind: placeKind(),
  location: clearable(z.string().trim().max(L.location)),
  significance: clearable(z.string().trim().max(L.significance)),
  description: clearable(z.string().trim().max(L.description)),
  wikidataId: wikidataId(),
  scenes: clearable(BOOK_WORLD_LIST_SCHEMAS.scenes),
  quotes: clearable(BOOK_WORLD_LIST_SCHEMAS.placeQuotes),
  faq: clearable(BOOK_WORLD_LIST_SCHEMAS.faq),
  imageBrief: clearable(z.string().trim().max(L.imageBrief)),
  // Поля героя и пары - у места только пустыми.
  role: foreignObject('place'),
  sources: foreignList('place'),
  profile: foreignProfile('place'),
  appearance: foreignText('place'),
  character: foreignText('place'),
  arc: foreignObject('place'),
  relations: foreignList('place'),
  critique: foreignText('place'),
  prototypes: foreignText('place'),
  adaptations: foreignList('place'),
  compare: foreignList('place'),
  bonds: foreignText('place'),
  differences: foreignText('place'),
  conclusion: foreignText('place'),
};

/**
 * Номер Wikidata - только у реального места (`checkWorldTypeFields` бэкенда). Вид в теле не задан
 * (импорт «не трогать») - вид сохранённый, его знает только сервер: решает пробная запись.
 */
const wikidataOnlyForReal = (
  value: { kind?: unknown; wikidataId?: unknown },
  ctx: z.RefinementCtx
) => {
  if (value.wikidataId && value.kind !== undefined && value.kind !== 'real') {
    ctx.addIssue({
      code: 'custom',
      path: ['wikidataId'],
      message: 'wikidataId is only for a real place (kind: real)',
    });
  }
};

const placeSchema = <T extends z.ZodRawShape>(shape: T) =>
  z
    .strictObject({ ...shape, type: z.literal('place'), ...placeFields })
    .superRefine(wikidataOnlyForReal);

const entitySchema = z.discriminatedUnion('type', [
  z.strictObject({ key: key(), type: z.literal('character'), ...characterFields }),
  z.strictObject({ key: key(), type: z.literal('pair'), ...pairFields }),
  placeSchema({ key: key() }),
]);

const importSchema = z
  .strictObject({
    language: z.enum(SUPPORTED_LANGS),
    entities: z.array(entitySchema).max(L.entities),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.entities.forEach((entity, idx) => {
      if (seen.has(entity.key)) {
        ctx.addIssue({ code: 'custom', path: ['entities', idx, 'key'], message: 'duplicate key' });
      }
      seen.add(entity.key);
    });
  });

/** Тело `PUT versions/:id/world/:key`: ключ — в адресе, в теле его нет. */
const entityRequestSchema = z.discriminatedUnion('type', [
  z.strictObject({
    language: z.enum(SUPPORTED_LANGS),
    type: z.literal('character'),
    ...characterFields,
  }),
  z.strictObject({ language: z.enum(SUPPORTED_LANGS), type: z.literal('pair'), ...pairFields }),
  placeSchema({ language: z.enum(SUPPORTED_LANGS) }),
]);

export const toWorldIssues = (error: z.ZodError, prefix = ''): BookWorldIssue[] =>
  error.issues.flatMap((issue) => {
    const base = [prefix, ...issue.path.map(String)].filter(Boolean).join('.');
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((k) => ({ path: base ? `${base}.${k}` : k, message: 'unknown key' }));
    }
    return [{ path: base, message: issue.message }];
  });

export interface BookWorldCheckResult<T> {
  data: T | null;
  errors: BookWorldIssue[];
}

const languageIssue = (json: string, version: string): BookWorldIssue => ({
  path: 'language',
  message: `JSON is "${json}", the version is "${version}"`,
});

/** JSON импорта всей версии. Язык обязан совпасть с языком версии (§17 п.4), как на бэкенде. */
export const checkBookWorldImport = (
  value: unknown,
  versionLanguage: string
): BookWorldCheckResult<SaveBookWorldRequest> => {
  const parsed = importSchema.safeParse(value);
  if (!parsed.success) return { data: null, errors: toWorldIssues(parsed.error) };
  if (parsed.data.language !== versionLanguage) {
    return { data: null, errors: [languageIssue(parsed.data.language, versionLanguage)] };
  }
  return { data: parsed.data as SaveBookWorldRequest, errors: [] };
};

/** Тело записи одной сущности, собранное карточкой. */
export const checkBookWorldEntityRequest = (
  value: unknown
): BookWorldCheckResult<SaveBookWorldEntityRequest> => {
  const parsed = entityRequestSchema.safeParse(value);
  if (!parsed.success) return { data: null, errors: toWorldIssues(parsed.error) };
  return { data: parsed.data as SaveBookWorldEntityRequest, errors: [] };
};

/** JSON импорта одной сущности: `{language, key, type, ...поля}`. */
const entityImportSchema = z.discriminatedUnion('type', [
  z.strictObject({
    language: z.enum(SUPPORTED_LANGS),
    key: key().optional(),
    type: z.literal('character'),
    ...characterFields,
  }),
  z.strictObject({
    language: z.enum(SUPPORTED_LANGS),
    key: key().optional(),
    type: z.literal('pair'),
    ...pairFields,
  }),
  placeSchema({ language: z.enum(SUPPORTED_LANGS), key: key().optional() }),
]);

/** Импорт одной сущности: ключ адреса и тело записи (ключ — в адресе, в теле его нет). */
export interface BookWorldEntityImport {
  key: string;
  body: SaveBookWorldEntityRequest;
}

/**
 * JSON одной сущности. Ключ адреса — из JSON; у сохранённой сущности (`entityKey`) — её ключ, и
 * другой ключ в JSON — отказ: ручка сменила бы не ту сущность. Язык — как у версии.
 */
export const checkBookWorldEntityImport = (
  value: unknown,
  versionLanguage: string,
  entityKey: string | null
): BookWorldCheckResult<BookWorldEntityImport> => {
  const parsed = entityImportSchema.safeParse(value);
  if (!parsed.success) return { data: null, errors: toWorldIssues(parsed.error) };
  const { key: jsonKey, ...body } = parsed.data;
  if (body.language !== versionLanguage) {
    return { data: null, errors: [languageIssue(body.language, versionLanguage)] };
  }
  if (entityKey !== null && jsonKey !== undefined && jsonKey !== entityKey) {
    return {
      data: null,
      errors: [{ path: 'key', message: `JSON is "${jsonKey}", the entity is "${entityKey}"` }],
    };
  }
  const target = entityKey ?? jsonKey;
  if (target === undefined) {
    return { data: null, errors: [{ path: 'key', message: 'required for a new entity' }] };
  }
  return { data: { key: target, body: body as SaveBookWorldEntityRequest }, errors: [] };
};

export const checkBookWorldKey = (value: string): boolean => key().safeParse(value).success;
