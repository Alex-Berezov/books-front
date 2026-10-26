import type { BookAnalysisPromptVersion } from '@/lib/admin/book-analysis-prompt-inputs';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookAnalysisWarning } from '@/types/api-schema';

/**
 * AnalysisTab component props
 */
export interface AnalysisTabProps {
  /** Book version ID */
  versionId: string;
  /** Version fields for «Вводные для промпта» and the language check of the import */
  version: BookAnalysisPromptVersion;
  /** Draft from the dossier (F05-11) — `admin` only; others see no button and send no requests */
  isAdmin?: boolean;
  /** Admin UI language — for the «LLM settings» link of the draft */
  lang?: SupportedLang;
}

/** Итог проверки на сервере: ядро и предупреждения слитой записи (сохранения или `dryRun`). */
export interface AnalysisServerCheck {
  hasCore: boolean;
  warnings: BookAnalysisWarning[];
}

/**
 * Итог пробы импорта. `rejected` — сервер отверг данные (4xx: ссылки ключей, язык);
 * `failed` — проверить не удалось (сеть, 5xx), это не ошибка в JSON.
 */
export type AnalysisPreview =
  | { state: 'checking' }
  | { state: 'ok'; check: AnalysisServerCheck }
  | { state: 'rejected'; message: string }
  | { state: 'failed'; message: string };
