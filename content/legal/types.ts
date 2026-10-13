import type { SupportedLang } from '@/lib/i18n/lang';

export type LegalPageId = 'privacy' | 'terms';

export type LegalInline =
  | { kind: 'text'; text: string }
  | { kind: 'mailto'; text: string; email: string };

export type LegalBlock =
  | { kind: 'paragraph'; content: LegalInline[] }
  | { kind: 'list'; items: LegalInline[][] };

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
