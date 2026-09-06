// @vitest-environment node
import { describe, expect, it } from 'vitest';
import en from '@/lib/i18n/locales/en.json';
import es from '@/lib/i18n/locales/es.json';
import fr from '@/lib/i18n/locales/fr.json';
import pt from '@/lib/i18n/locales/pt.json';
import ru from '@/lib/i18n/locales/ru.json';

type Dict = Record<string, unknown>;

// Type is derived only from en.json (see lib/i18n/dictionaries.ts), so a key added to any
// other locale - or dropped from it, or misspelled there - passes typecheck silently and
// renders as the raw dotted key on screen (LEGACY-143).
const flattenKeys = (obj: Dict, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value as Dict, path);
    }
    return [path];
  });

const LOCALES: Record<string, Dict> = { en, es, fr, pt, ru };
const baseline = new Set(flattenKeys(en));

describe('locale key parity (LEGACY-143)', () => {
  for (const [lang, dict] of Object.entries(LOCALES)) {
    if (lang === 'en') continue;

    it(`${lang}.json has exactly the same keys as en.json`, () => {
      const keys = new Set(flattenKeys(dict));
      const missing = [...baseline].filter((key) => !keys.has(key)).sort();
      const extra = [...keys].filter((key) => !baseline.has(key)).sort();
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });
  }
});
