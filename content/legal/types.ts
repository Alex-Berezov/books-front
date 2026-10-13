import type { SupportedLang } from '@/lib/i18n/lang';

export type LegalPageId = 'privacy' | 'terms' | 'cookies';

export type LegalInline =
  | { kind: 'text'; text: string }
  | { kind: 'mailto'; text: string; email: string }
  /** Внутренняя ссылка: `href` без языка (`/privacy`), язык подставляет страница. */
  | { kind: 'link'; text: string; href: string }
  /** Внешняя ссылка: полный адрес, открывается в новой вкладке. */
  | { kind: 'external'; text: string; href: string };

/** Вставки правовой страницы: таблица из перечня cookie (серверная) и блок «Ваш выбор» (клиентский). */
export type LegalWidget = 'cookie-table' | 'consent-choice';

export type LegalBlock =
  | { kind: 'paragraph'; content: LegalInline[] }
  | { kind: 'list'; items: LegalInline[][] }
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
