import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * SummaryTab component props
 */
export interface SummaryTabProps {
  /** Book version ID */
  versionId: string;
  /** `admin`: заготовки из досье (F05-10); остальным ролям их нет вовсе (решение арбитра `F05 | F05-10`, В8). */
  isAdmin?: boolean;
  /** Язык админки: ссылка на «LLM settings» из отказа заготовки. */
  lang?: SupportedLang;
}

/**
 * Summary form data structure
 */
export interface SummaryFormData {
  /** Plot retelling shown on `/{lang}/book/{slug}/summary` */
  summaryText: string;
  /** Very short summary (F04): the "In brief" block at the top of `/summary` */
  briefText: string;
}
