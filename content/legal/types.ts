import type { SupportedLang } from '@/lib/i18n/lang';

export type LegalPageId =
  | 'privacy'
  | 'terms'
  | 'cookies'
  | 'about'
  | 'contact'
  | 'editorial-policy'
  | 'legal-notice';

export type LegalInline =
  | { kind: 'text'; text: string }
  /** `subject` - тема письма на языке страницы (`?subject=`). */
  | { kind: 'mailto'; text: string; email: string; subject?: string }
  /** Внутренняя ссылка: `href` без языка (`/privacy`), язык подставляет страница. */
  | { kind: 'link'; text: string; href: string }
  /** Внешняя ссылка: полный адрес, открывается в новой вкладке. */
  | { kind: 'external'; text: string; href: string };

/** Вставки правовой страницы: таблица из перечня cookie (серверная) и блок «Ваш выбор» (клиентский). */
export type LegalWidget = 'cookie-table' | 'consent-choice';

/**
 * Клиентские вставки приходят от страницы слотом (`LegalPage` `widgets`), а не импортом в `LegalPage`:
 * иначе их код уезжает в бандл каждой правовой страницы (решение арбитра 14.10.2026, F01-6).
 */
export type LegalClientWidget = Extract<LegalWidget, 'consent-choice'>;

export type LegalBlock =
  | { kind: 'paragraph'; content: LegalInline[] }
  | { kind: 'list'; items: LegalInline[][] }
  /** Таблица: `head` - подписи колонок, `rows` - строки из ячеек; число ячеек равно числу колонок. */
  | { kind: 'table'; head: string[]; rows: LegalInline[][][] }
  | { kind: 'widget'; widget: LegalWidget };

export type LegalSection = { id: string; heading: string; blocks: LegalBlock[] };

export type LegalDocument = {
  page: LegalPageId;
  lang: SupportedLang;
  metaTitle: string;
  metaDescription: string;
  title: string;
  updatedAt: string;
  toc: boolean;
  sections: LegalSection[];
};
