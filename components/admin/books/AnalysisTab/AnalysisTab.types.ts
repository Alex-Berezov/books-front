import type { BookAnalysisPromptVersion } from '@/lib/admin/book-analysis-prompt-inputs';
import type { BookAnalysisWarning } from '@/types/api-schema';

/**
 * AnalysisTab component props
 */
export interface AnalysisTabProps {
  /** Book version ID */
  versionId: string;
  /** Version fields for «Вводные для промпта» and the language check of the import */
  version: BookAnalysisPromptVersion;
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
