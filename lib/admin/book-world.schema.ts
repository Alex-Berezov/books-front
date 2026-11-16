import { z } from 'zod';
import {
  BOOK_WORLD_KEY_REGEX,
  BOOK_WORLD_LIMITS as L,
  BOOK_WORLD_ROLES,
  BOOK_WORLD_WRITABLE_TYPES,
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
      paragraph: z
        .int()
        .min(0)
        .max(L.paragraph)
        .nullable()
        .optional()
        .transform((value) => value ?? null),
    }),
    L.scenes
  ),
  relations: list(z.strictObject({ to: key(), label: requiredText(L.label) }), L.relations),
  quotes: list(
    z.strictObject({
      text: requiredText(L.quote),
      chapter: chapter(),
      speakerKey: z
        .union([key(), z.literal('')])
        .nullable()
        .optional()
        .transform((value) => (value ? value : null)),
      interpretation: requiredText(L.interpretation),
    }),
    L.quotes
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

const characterFields = {
  name: requiredText(L.name).optional(),
  role: z.enum(BOOK_WORLD_ROLES).nullable().optional(),
  aliases: clearable(list(requiredText(L.alias), L.aliases)),
  aliasExclusions: clearable(list(requiredText(L.alias), L.aliases)),
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
};

const entitySchema = z.strictObject({
  key: key(),
  type: z.enum(BOOK_WORLD_WRITABLE_TYPES),
  ...characterFields,
});

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
const entityRequestSchema = z.strictObject({
  language: z.enum(SUPPORTED_LANGS),
  type: z.enum(BOOK_WORLD_WRITABLE_TYPES),
  ...characterFields,
});

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
const entityImportSchema = z.strictObject({
  language: z.enum(SUPPORTED_LANGS),
  key: key().optional(),
  type: z.enum(BOOK_WORLD_WRITABLE_TYPES),
  ...characterFields,
});

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
