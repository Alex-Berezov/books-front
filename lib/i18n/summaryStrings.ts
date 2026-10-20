import 'server-only';
import type { SupportedLang } from './lang';

/**
 * Строки страницы пересказа (`/{lang}/book/{slug}/summary`) и страниц его разделов (`/summary/{n}`), которые читают только серверные
 * компоненты (F04, `product.md` §5а). Не в `locales/*.json`: словарь целиком уходит в клиентский
 * бандл. Паритет пяти языков стережёт `summaryStrings.test.ts`.
 */

const en = {
  summaryBriefTitle: 'In brief',
  summaryFullTitle: 'Full summary',
  summarySectionsTitle: 'Chapter-by-chapter summary',
  summaryReadChapter: 'Read this chapter',
  summarySectionPageTitle: '{title}: {section} — Summary',
  summarySectionSpoiler: 'Spoiler warning: this summary covers the whole plot of this section.',
} as const;

const es: SummaryStrings = {
  summaryBriefTitle: 'En pocas palabras',
  summaryFullTitle: 'Resumen completo',
  summarySectionsTitle: 'Resumen por capítulos',
  summaryReadChapter: 'Leer este capítulo',
  summarySectionPageTitle: '{title}: {section} — resumen',
  summarySectionSpoiler: 'Aviso de spoilers: este resumen cuenta toda la trama de esta sección.',
};

const fr: SummaryStrings = {
  summaryBriefTitle: 'En bref',
  summaryFullTitle: 'Résumé complet',
  summarySectionsTitle: 'Résumé chapitre par chapitre',
  summaryReadChapter: 'Lire ce chapitre',
  summarySectionPageTitle: '{title} : {section} — résumé',
  summarySectionSpoiler:
    "Attention, spoilers : ce résumé raconte toute l'intrigue de cette section.",
};

const pt: SummaryStrings = {
  summaryBriefTitle: 'Em poucas palavras',
  summaryFullTitle: 'Resumo completo',
  summarySectionsTitle: 'Resumo por capítulos',
  summaryReadChapter: 'Ler este capítulo',
  summarySectionPageTitle: '{title}: {section} — resumo',
  summarySectionSpoiler: 'Aviso de spoilers: este resumo conta toda a trama desta seção.',
};

const ru: SummaryStrings = {
  summaryBriefTitle: 'Очень кратко',
  summaryFullTitle: 'Полный пересказ',
  summarySectionsTitle: 'Краткое содержание по главам',
  summaryReadChapter: 'Читать эту главу',
  summarySectionPageTitle: '{title}: {section} — краткое содержание',
  summarySectionSpoiler: 'Осторожно, спойлеры: пересказ раздела передаёт его сюжет целиком.',
};

export type SummaryStrings = { [K in keyof typeof en]: string };

export const summaryStrings: Record<SupportedLang, SummaryStrings> = { en, es, fr, pt, ru };

export const getSummaryStrings = (lang: SupportedLang): SummaryStrings =>
  summaryStrings[lang] || summaryStrings.en;
