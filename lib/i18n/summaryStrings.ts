import 'server-only';
import type { SupportedLang } from './lang';

/**
 * Строки страницы пересказа (`/{lang}/book/{slug}/summary`), которые читают только серверные
 * компоненты (F04, `product.md` §5а). Не в `locales/*.json`: словарь целиком уходит в клиентский
 * бандл. Паритет пяти языков стережёт `summaryStrings.test.ts`.
 */

const en = {
  summaryBriefTitle: 'In brief',
  summaryFullTitle: 'Full summary',
} as const;

const es: SummaryStrings = {
  summaryBriefTitle: 'En pocas palabras',
  summaryFullTitle: 'Resumen completo',
};

const fr: SummaryStrings = {
  summaryBriefTitle: 'En bref',
  summaryFullTitle: 'Résumé complet',
};

const pt: SummaryStrings = {
  summaryBriefTitle: 'Em poucas palavras',
  summaryFullTitle: 'Resumo completo',
};

const ru: SummaryStrings = {
  summaryBriefTitle: 'Очень кратко',
  summaryFullTitle: 'Полный пересказ',
};

export type SummaryStrings = { [K in keyof typeof en]: string };

export const summaryStrings: Record<SupportedLang, SummaryStrings> = { en, es, fr, pt, ru };

export const getSummaryStrings = (lang: SupportedLang): SummaryStrings =>
  summaryStrings[lang] || summaryStrings.en;
