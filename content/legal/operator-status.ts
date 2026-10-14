import 'server-only';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { OperatorStatus } from '@/lib/site/owner-facts';

/**
 * Статус оператора словами (решение арбитра 14.10.2026, F01-6): `inline` - внутри фразы
 * («…, a private individual (country: …)»), `label` - значение строки «Статус:» на `/legal-notice`.
 * Карта полная по типу: новый статус без слова на каждом языке не соберётся.
 */
export const operatorStatusText: Record<
  SupportedLang,
  Record<OperatorStatus, { inline: string; label: string }>
> = {
  en: {
    individual: { inline: 'a private individual', label: 'private individual' },
    'sole-proprietor': { inline: 'a sole proprietor', label: 'sole proprietor' },
  },
  es: {
    individual: { inline: 'una persona física', label: 'persona física' },
    'sole-proprietor': { inline: 'un empresario individual', label: 'empresario individual' },
  },
  fr: {
    individual: { inline: 'une personne physique', label: 'personne physique' },
    'sole-proprietor': { inline: 'un entrepreneur individuel', label: 'entrepreneur individuel' },
  },
  pt: {
    individual: { inline: 'pessoa física', label: 'pessoa física' },
    'sole-proprietor': { inline: 'empresário individual', label: 'empresário individual' },
  },
  ru: {
    individual: { inline: 'физическое лицо', label: 'физическое лицо' },
    'sole-proprietor': {
      inline: 'индивидуальный предприниматель',
      label: 'индивидуальный предприниматель',
    },
  },
};
