// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analysisStrings } from '@/lib/i18n/analysisStrings';
import en from '@/lib/i18n/locales/en.json';
import es from '@/lib/i18n/locales/es.json';
import fr from '@/lib/i18n/locales/fr.json';
import pt from '@/lib/i18n/locales/pt.json';
import ru from '@/lib/i18n/locales/ru.json';

const LOCALES = { en, es, fr, pt, ru };
// Эти два ключа читают клиентские BookActions и BookExtraDetails - им место в словаре.
const CLIENT_KEYS = ['analysis', 'analysisBreakdown'];

describe('строки анализа вне клиентского словаря (F03-2s)', () => {
  // Без этой строки модуль молча импортируется в клиентский файл: ~5 кБ строк уходят в бандл,
  // а бюджет ловит рост только больше 10 кБ. С ней такая сборка падает.
  it('модуль открывается охраной server-only', () => {
    const source = readFileSync(
      path.resolve(__dirname, '../../../lib/i18n/analysisStrings.ts'),
      'utf8'
    );
    expect(source.startsWith("import 'server-only';")).toBe(true);
  });

  for (const [lang, dict] of Object.entries(LOCALES)) {
    it(`${lang}.json не содержит серверных ключей book.analysis*`, () => {
      const stray = Object.keys(dict.book).filter(
        (key) => key.startsWith('analysis') && !CLIENT_KEYS.includes(key)
      );
      expect(stray).toEqual([]);
    });

    it(`${lang}.json хранит клиентские ключи анализа`, () => {
      for (const key of CLIENT_KEYS) {
        expect(typeof (dict.book as Record<string, unknown>)[key]).toBe('string');
      }
    });
  }

  const baseKeys = Object.keys(analysisStrings.en).sort();
  const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

  for (const lang of ['es', 'fr', 'pt', 'ru'] as const) {
    it(`${lang}: те же ключи и плейсхолдеры, что в en, строки не пустые`, () => {
      const strings = analysisStrings[lang] as Record<string, string>;
      expect(Object.keys(strings).sort()).toEqual(baseKeys);
      for (const key of baseKeys) {
        expect(strings[key].trim(), key).not.toBe('');
        expect(placeholders(strings[key]), key).toEqual(
          placeholders((analysisStrings.en as Record<string, string>)[key])
        );
      }
    });
  }
});
