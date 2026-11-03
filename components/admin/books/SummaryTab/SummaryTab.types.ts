import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * SummaryTab component props
 */
export interface SummaryTabProps {
  /** Book version ID */
  versionId: string;
  /** `admin`: ход «Write Summary» (F06-3); остальным ролям его нет вовсе. */
  isAdmin?: boolean;
  /** Язык админки: ссылка на «LLM settings» из отказа и паузы хода. */
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
