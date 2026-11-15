import { BOOK_WORLD_LIST_FIELDS, type BookWorldIssue } from '@/lib/admin/book-world-blocks';
import {
  checkBookWorldEntityImport,
  checkBookWorldEntityRequest,
  checkBookWorldImport,
  type BookWorldEntityImport,
  checkBookWorldKey,
} from '@/lib/admin/book-world.schema';
import type { WorldEntityFormValues } from '@/lib/admin/book-world-form-state';
import type {
  SaveBookWorldEntityRequest,
  SaveBookWorldRequest,
  WorldEntityType,
} from '@/types/api-schema';

/**
 * Проверки мира книги на `zod` (F08-1) — точка ленивой загрузки: вкладка берёт модуль только
 * через `loadBookWorldValidation` (`import()`), чтобы `zod` не попадал в запись роута версии
 * (бюджет бандла, как у анализа). Статически его импортируют только тесты.
 */

export { checkBookWorldEntityImport, checkBookWorldImport, checkBookWorldKey };
export type { BookWorldEntityImport };

export interface BookWorldImportAnalysis {
  data: SaveBookWorldRequest | null;
  errors: BookWorldIssue[];
}

export const analyzeBookWorldImport = (
  text: string,
  versionLanguage: string
): BookWorldImportAnalysis => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { data: null, errors: [{ path: '', message: 'invalid JSON' }] };
  }
  return checkBookWorldImport(parsed, versionLanguage);
};

export interface BookWorldEntityImportAnalysis {
  data: BookWorldEntityImport | null;
  errors: BookWorldIssue[];
}

/** JSON одной сущности; `entityKey` — ключ сохранённой карточки, `null` — новая. */
export const analyzeBookWorldEntityImport = (
  text: string,
  versionLanguage: string,
  entityKey: string | null
): BookWorldEntityImportAnalysis => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { data: null, errors: [{ path: '', message: 'invalid JSON' }] };
  }
  return checkBookWorldEntityImport(parsed, versionLanguage, entityKey);
};

const text = (value: string): string | null => value.trim() || null;

/**
 * Тело записи сущности из формы карточки: уходит вся сущность (пустое поле — очистить),
 * ошибки — по пути поля тела (`quotes.3.text`), как у сервера.
 */
export const worldEntityRequestFromForm = (
  values: WorldEntityFormValues,
  language: string,
  type: WorldEntityType
): { data: SaveBookWorldEntityRequest | null; errors: BookWorldIssue[] } => {
  const errors: BookWorldIssue[] = [];
  const lists: Record<string, unknown> = {};
  for (const field of BOOK_WORLD_LIST_FIELDS) {
    const raw = values.lists[field.key].trim();
    if (!raw) {
      lists[field.key] = null;
      continue;
    }
    try {
      lists[field.key] = JSON.parse(raw);
    } catch {
      errors.push({ path: field.path, message: 'invalid JSON' });
    }
  }
  if (errors.length > 0) return { data: null, errors };

  const t = values.texts;
  const position = text(t.position);
  const relationToMain = text(t.relationToMain);
  const arcFrom = text(t.arcFrom);
  const arcTo = text(t.arcTo);
  const aliases = values.aliases
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const body = {
    language,
    type,
    name: values.name.trim(),
    role: values.role || null,
    aliases: aliases.length > 0 ? aliases : null,
    short: text(t.short),
    profile: position || relationToMain ? { position, relationToMain } : null,
    appearance: text(t.appearance),
    character: text(t.character),
    arc:
      arcFrom || arcTo || lists.stages
        ? { from: arcFrom ?? '', to: arcTo ?? '', stages: lists.stages }
        : null,
    scenes: lists.scenes,
    relations: lists.relations,
    quotes: lists.quotes,
    critique: text(t.critique),
    prototypes: text(t.prototypes),
    adaptations: lists.adaptations,
    faq: lists.faq,
    sources: lists.sources,
  };
  return checkBookWorldEntityRequest(body);
};
