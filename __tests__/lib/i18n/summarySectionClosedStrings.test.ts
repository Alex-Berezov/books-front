// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '@/lib/i18n/locales/en.json';
import es from '@/lib/i18n/locales/es.json';
import fr from '@/lib/i18n/locales/fr.json';
import pt from '@/lib/i18n/locales/pt.json';
import ru from '@/lib/i18n/locales/ru.json';
import { summarySectionClosedStrings } from '@/lib/i18n/summarySectionClosedStrings';

/**
 * Экран 451 раздела пересказа (F04-3, `product.md` §5а): строки читает только middleware, в клиентский
 * бандл они не уходят (`tech.md` §7) - ни ключей в словарях, ни импорта из кода сайта, кроме модуля
 * закрытий, который зовёт только middleware.
 */

const REPO_ROOT = resolve(__dirname, '../../..');
const SKIP_DIRS = new Set(['node_modules', 'coverage', 'public', '__tests__', 'e2e']);
const LOCALES = { en, es, fr, pt, ru };

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx?|mts|cts)$/.test(entry.name) ? [path] : [];
  });
}

const importersOf = (module: RegExp) =>
  sourceFiles(REPO_ROOT)
    .filter((file) => module.test(readFileSync(file, 'utf8')))
    .map((file) => relative(REPO_ROOT, file).replace(/\\/g, '/'))
    .sort();

describe('строки экрана 451 раздела пересказа вне клиентского словаря (F04-3)', () => {
  it('импортирует их только модуль закрытий, а его - только middleware', () => {
    expect(importersOf(/['"]@\/lib\/i18n\/summarySectionClosedStrings['"]/)).toEqual([
      'lib/claim-closures.ts',
    ]);
    expect(importersOf(/['"]@\/lib\/claim-closures['"]/)).toEqual(['middleware.ts']);
  });

  for (const [lang, dict] of Object.entries(LOCALES)) {
    it(`${lang}.json не содержит ключей экрана`, () => {
      const json = JSON.stringify(dict);
      for (const key of Object.keys(summarySectionClosedStrings.en)) {
        expect(json).not.toContain(`"${key}"`);
      }
    });
  }

  // Буква в букву по `product.md` §5а; без «в вашей стране / регионе» - блок бывает и на весь мир.
  it.each([
    [
      'en',
      'Section unavailable',
      'This section summary is unavailable because of rights restrictions. The book page stays open.',
    ],
    [
      'es',
      'Sección no disponible',
      'El resumen de esta sección no está disponible debido a restricciones de derechos. La página del libro sigue abierta.',
    ],
    [
      'fr',
      'Section indisponible',
      "Le résumé de cette section n'est pas disponible en raison de restrictions de droits. La page du livre reste accessible.",
    ],
    [
      'pt',
      'Seção indisponível',
      'O resumo desta seção não está disponível devido a restrições de direitos. A página do livro continua aberta.',
    ],
    [
      'ru',
      'Раздел недоступен',
      'Пересказ этого раздела недоступен из-за ограничений прав. Страница книги остаётся открытой.',
    ],
  ] as const)('%s: заголовок и текст по спецификации', (lang, title, message) => {
    expect(summarySectionClosedStrings[lang]).toEqual({
      summarySectionClosedTitle: title,
      summarySectionClosedMessage: message,
    });
  });
});
