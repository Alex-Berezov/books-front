import type { BookWorldPromptVersion } from '@/lib/admin/book-world-prompt-inputs';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  BookVersionDetail,
  BookWorldSaveResponse,
  BookWorldWarning,
} from '@/types/api-schema';

/**
 * WorldTab component props
 */
export interface WorldTabProps {
  /** Book version ID */
  versionId: string;
  /**
   * Version fields for «Prompt inputs» and the language check of the import; `slug` and `status`
   * (already in the loaded version) give the link to the public page of an entity.
   */
  version: BookWorldPromptVersion & Partial<Pick<BookVersionDetail, 'slug' | 'status'>>;
  /** Language of the admin UI: links of the run panel to «LLM settings» */
  lang: SupportedLang;
  /** «Read» mark and the dossier of the prompt inputs — `admin` only */
  isAdmin?: boolean;
  /**
   * The tab is for editors (`admin`, `content_manager`); others see a stub and send no requests.
   * `null` — the session is still loading.
   */
  isEditor: boolean | null;
}

/** Удачная проба импорта (`dryRun`): что станет с сущностями тела. */
export interface WorldImportPreviewOk {
  state: 'ok';
  entities: BookWorldSaveResponse['entities'];
}

/** Итог записи сущности: ядро и предупреждения сервера. */
export interface WorldEntityCheck {
  hasCore: boolean;
  warnings: BookWorldWarning[];
  /**
   * Запись поставила пересчёт присутствия: новая карточка открывается заново по ключу и метку
   * «Saved» не теряет (решение арбитра `F08 | F08-2` S6).
   */
  recountQueued?: boolean;
}
