import {
  BOOK_ANALYSIS_LIST_KEYS,
  type BookAnalysisIssue,
  type BookAnalysisListKey,
} from '@/lib/admin/book-analysis-blocks';
import {
  collectClearedBlocks,
  type BookAnalysisFormValues,
  type BookAnalysisListValues,
} from '@/lib/admin/book-analysis-form-state';
import { checkBookAnalysisBlock, checkBookAnalysisImport } from '@/lib/admin/book-analysis.schema';
import type { SaveBookAnalysisRequest } from '@/types/api-schema';

/**
 * Проверки анализа на `zod` (F03-1) — точка ленивой загрузки: вкладка берёт модуль только
 * через `loadBookAnalysisValidation` (`import()`), чтобы `zod` не попадал в запись роута версии
 * (бюджет бандла, как у автора F02). Статически его импортируют только тесты.
 */

export { checkBookAnalysisBlock, checkBookAnalysisImport };

export interface BookAnalysisImportAnalysis {
  data: SaveBookAnalysisRequest | null;
  errors: BookAnalysisIssue[];
  /** Заполненные в форме блоки, которые импорт очистит. */
  cleared: string[];
}

export const analyzeBookAnalysisImport = (
  prev: BookAnalysisFormValues,
  text: string,
  versionLanguage: string
): BookAnalysisImportAnalysis => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { data: null, errors: [{ path: '', message: 'invalid JSON' }], cleared: [] };
  }
  const checked = checkBookAnalysisImport(parsed, versionLanguage);
  return { ...checked, cleared: checked.data ? collectClearedBlocks(prev, checked.data) : [] };
};

/**
 * Текст JSON-редактора списка. Пустое поле, `null` и `[]` — блока нет. Ошибка разбора или
 * формы оставляет значение блока прежним (`value` не возвращается).
 */
export const applyListText = <K extends BookAnalysisListKey>(
  key: K,
  text: string
): { issues: BookAnalysisIssue[] } | { issues: null; value: BookAnalysisListValues[K] } => {
  if (!text.trim()) return { issues: null, value: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { issues: [{ path: key, message: 'invalid JSON' }] };
  }
  if (parsed === null) return { issues: null, value: null };
  const checked = checkBookAnalysisBlock(key, parsed);
  if (checked.errors.length > 0) return { issues: checked.errors };
  const value = (checked.data as unknown[]).length > 0 ? checked.data : null;
  return { issues: null, value: value as BookAnalysisListValues[K] };
};

/**
 * Перепроверка всех JSON-редакторов формы: значение каждого списка берётся из его текста.
 * Зовётся при загрузке модуля проверки (правки, сделанные до неё, ещё не проверены) и перед
 * сохранением — уйти может только то, что сейчас написано в редакторах.
 */
export const revalidateListDrafts = (values: BookAnalysisFormValues): BookAnalysisFormValues => {
  const lists = { ...values.lists } as Record<BookAnalysisListKey, unknown>;
  const drafts = { ...values.drafts };
  for (const key of BOOK_ANALYSIS_LIST_KEYS) {
    const result = applyListText(key, drafts[key].text);
    if (result.issues) {
      drafts[key] = { text: drafts[key].text, issues: result.issues };
    } else {
      lists[key] = result.value;
      drafts[key] = { text: drafts[key].text, issues: null };
    }
  }
  return { ...values, lists: lists as BookAnalysisListValues, drafts };
};
