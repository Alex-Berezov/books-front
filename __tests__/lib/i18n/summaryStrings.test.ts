// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '@/lib/i18n/locales/en.json';
import es from '@/lib/i18n/locales/es.json';
import fr from '@/lib/i18n/locales/fr.json';
import pt from '@/lib/i18n/locales/pt.json';
import ru from '@/lib/i18n/locales/ru.json';
import { getSummaryStrings, summaryStrings } from '@/lib/i18n/summaryStrings';

const LOCALES = { en, es, fr, pt, ru };

describe('строки страницы пересказа вне клиентского словаря (F04-2)', () => {
  it('модуль открывается охраной server-only', () => {
    const source = readFileSync(
      path.resolve(__dirname, '../../../lib/i18n/summaryStrings.ts'),
      'utf8'
    );
    expect(source).toMatch(/^import 'server-only';$/m);
  });

  it('неизвестный язык - строки en', () => {
    expect(getSummaryStrings('xx' as never)).toBe(summaryStrings.en);
  });

  for (const [lang, dict] of Object.entries(LOCALES)) {
    it(`${lang}.json не содержит серверных ключей страницы пересказа`, () => {
      const serverKeys = Object.keys(summaryStrings.en);
      expect(Object.keys(dict.book).filter((key) => serverKeys.includes(key))).toEqual([]);
    });
  }

  // Подписи - буква в букву по `product.md` §5а фичи F04.
  it.each([
    ['en', 'In brief', 'Full summary'],
    ['es', 'En pocas palabras', 'Resumen completo'],
    ['fr', 'En bref', 'Résumé complet'],
    ['pt', 'Em poucas palavras', 'Resumo completo'],
    ['ru', 'Очень кратко', 'Полный пересказ'],
  ] as const)('%s: подписи блоков по спецификации', (lang, brief, full) => {
    expect(summaryStrings[lang]).toEqual({ summaryBriefTitle: brief, summaryFullTitle: full });
  });
});
