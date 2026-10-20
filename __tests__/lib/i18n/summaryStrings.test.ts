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

describe('строки страницы пересказа вне клиентского словаря (F04-2, F04-3)', () => {
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
    [
      'en',
      'In brief',
      'Full summary',
      'Chapter-by-chapter summary',
      'Read this chapter',
      '{title}: {section} — Summary',
      'Spoiler warning: this summary covers the whole plot of this section.',
    ],
    [
      'es',
      'En pocas palabras',
      'Resumen completo',
      'Resumen por capítulos',
      'Leer este capítulo',
      '{title}: {section} — resumen',
      'Aviso de spoilers: este resumen cuenta toda la trama de esta sección.',
    ],
    [
      'fr',
      'En bref',
      'Résumé complet',
      'Résumé chapitre par chapitre',
      'Lire ce chapitre',
      '{title} : {section} — résumé',
      "Attention, spoilers : ce résumé raconte toute l'intrigue de cette section.",
    ],
    [
      'pt',
      'Em poucas palavras',
      'Resumo completo',
      'Resumo por capítulos',
      'Ler este capítulo',
      '{title}: {section} — resumo',
      'Aviso de spoilers: este resumo conta toda a trama desta seção.',
    ],
    [
      'ru',
      'Очень кратко',
      'Полный пересказ',
      'Краткое содержание по главам',
      'Читать эту главу',
      '{title}: {section} — краткое содержание',
      'Осторожно, спойлеры: пересказ раздела передаёт его сюжет целиком.',
    ],
  ] as const)('%s: подписи по спецификации', (lang, brief, full, toc, read, h1, spoiler) => {
    expect(summaryStrings[lang]).toEqual({
      summaryBriefTitle: brief,
      summaryFullTitle: full,
      summarySectionsTitle: toc,
      summaryReadChapter: read,
      summarySectionPageTitle: h1,
      summarySectionSpoiler: spoiler,
    });
  });
});
