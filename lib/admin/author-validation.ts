import {
  isEmptyBlockValue,
  unnamedLanguages,
  type AuthorFormValues,
} from '@/lib/admin/author-form-state';
import {
  collectClearedFields,
  mergeAuthorImport,
  type AuthorImportAnalysis,
} from '@/lib/admin/author-import';
import { type AuthorBlockKey, type AuthorDataIssue } from '@/lib/admin/author-page-blocks';
import {
  checkAuthorBlock,
  checkAuthorFacts,
  checkAuthorImport,
  checkAuthorPhotoCredit,
  type AuthorBlockValues,
} from '@/lib/admin/author-page-blocks.schema';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Проверки данных автора на `zod` (F02-2) — точка ленивой загрузки: форма берёт этот модуль
 * только через `loadAuthorValidation` (`import()`), чтобы `zod` не попадал в запись роутов
 * авторов (бюджет бандла, решение арбитра F02-2). Статически его импортируют только тесты.
 */

export { checkAuthorBlock, checkAuthorFacts, checkAuthorImport, checkAuthorPhotoCredit };

/**
 * Текст JSON-редактора блока. Пустое поле, `null` и `[]` — блока нет. Ошибка разбора или
 * формы оставляет значение блока прежним (`value` не возвращается).
 */
export const applyBlockText = <K extends AuthorBlockKey>(
  key: K,
  text: string,
  lang: SupportedLang
): { issues: AuthorDataIssue[] } | { issues: null; value: AuthorBlockValues[K] } => {
  if (!text.trim()) return { issues: null, value: null as AuthorBlockValues[K] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { issues: [{ lang, path: key, reason: 'invalidJson' }] };
  }
  const checked = checkAuthorBlock(key, parsed, lang);
  if (checked.errors.length > 0) return { issues: checked.errors };
  const value = isEmptyBlockValue(checked.data) ? null : checked.data;
  return { issues: null, value: value as AuthorBlockValues[K] };
};

export const analyzeAuthorImport = (prev: AuthorFormValues, text: string): AuthorImportAnalysis => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      data: null,
      errors: [{ lang: null, path: '', reason: 'invalidJson' }],
      unknownKeys: [],
      cleared: [],
      unnamed: [],
    };
  }
  const checked = checkAuthorImport(parsed);
  return {
    ...checked,
    cleared: checked.data ? collectClearedFields(prev, checked.data) : [],
    unnamed: checked.data
      ? unnamedLanguages(mergeAuthorImport(prev, checked.data).translations)
      : [],
  };
};
