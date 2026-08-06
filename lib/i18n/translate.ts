import type { SupportedLang } from './lang';
import { getDictionary } from './dictionaries';

/**
 * Server-side counterpart of `useTranslation`.
 *
 * Server components cannot call the hook, so each of them grew its own copy of
 * the same dotted-key walk. This is that walk, once. Missing keys return the key
 * itself, exactly as the hook does — a visible `taxonomy.noItems` in the page is
 * a louder bug report than an empty string.
 */
export function translate(lang: SupportedLang, key: string): string {
  const keys = key.split('.');
  let value: unknown = getDictionary(lang);

  for (const k of keys) {
    if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
}

/** Bound form, for components that translate more than one or two keys. */
export function createTranslator(lang: SupportedLang): (key: string) => string {
  return (key: string) => translate(lang, key);
}
