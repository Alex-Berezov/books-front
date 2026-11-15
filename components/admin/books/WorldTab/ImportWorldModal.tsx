import type { ReactElement } from 'react';
import { JsonImportPreviewModal } from '@/components/admin/common/JsonImportPreviewModal';
import { formatDataIssue } from '@/lib/admin/data-issue';
import type { WorldImportPreviewOk } from './WorldTab.types';
import type {
  JsonImportAnalysis,
  JsonImportPreview,
  JsonImportResult,
} from '@/components/admin/common/JsonImportPreviewModal';
import { WORLD_HIDDEN_UNTIL_READ } from './worldErrors';
import styles from './WorldTab.module.scss';

/** Режим окна: вся версия (`PUT .../world`) или одна сущность (`PUT .../world/:key`). */
export type WorldImportMode = 'version' | 'entity';

interface ImportWorldModalProps<T extends object> {
  mode: WorldImportMode;
  isOpen: boolean;
  onCancel: () => void;
  /** Разбор формы JSON; `null` — модуль проверки ещё грузится. */
  analyze: ((jsonText: string) => JsonImportAnalysis<T>) | null;
  loadFailed: boolean;
  onRetryLoad: () => void;
  /** Пробная запись на сервере (`dryRun`): ссылки, главы, дословность цитат, ядро. */
  preview: (data: T) => Promise<JsonImportPreview<WorldImportPreviewOk>>;
  /** Запись: слияние делает сервер. */
  onImport: (data: T) => Promise<JsonImportResult>;
  /** Ключи сущностей тела, которые были на сайте: импорт снимет их страницы до «прочитано» (R9). */
  publishedKeys: (data: T) => string[];
}

const TEXTS: Record<WorldImportMode, { title: string; placeholder: string; hint: string }> = {
  version: {
    title: 'Import world JSON',
    placeholder: `{
  "language": "en",
  "entities": [{ "key": "raskolnikov", "type": "character", "name": "…", "short": "…" }]
}`,
    hint: 'Paste JSON of the whole version. Entities missing from the JSON stay as they are; fields missing from an entity stay as they are; null, "" or [] clears a field; a list replaces the previous one entirely.',
  },
  entity: {
    title: 'Import entity JSON',
    placeholder: `{
  "language": "en",
  "key": "raskolnikov",
  "type": "character",
  "short": "…"
}`,
    hint: 'Paste JSON of one entity: language, key, type and its fields. The entity is written at once: fields missing from the JSON stay as they are; null, "" or [] clears a field; a list replaces the previous one entirely. Unsaved edits in the card are replaced by the saved entity.',
  },
};

const PreviewOk = ({ entities }: WorldImportPreviewOk) => (
  <div className={styles.status}>
    <p>The check passed. After the import:</p>
    <ul className={styles.issueList}>
      {entities.map((e) => (
        <li key={e.key}>
          {e.key}: {e.created ? 'new' : 'updated'},{' '}
          {e.hasCore ? 'core complete' : 'no complete core'}
          {e.warnings.length > 0 && (
            <ul className={styles.issueList}>
              {e.warnings.map((w, idx) => (
                <li key={idx}>{formatDataIssue(w)}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Окно «Import JSON» вкладки World (`product.md` §17 п.4) на всю версию или на одну сущность
 * (`mode`). Импорт пишет сразу после удачной пробы: сущности и поля вне JSON не трогаются,
 * `null`/`[]` очищают поле. Само окно — общее `JsonImportPreviewModal`.
 */
export const ImportWorldModal = <T extends object>({
  mode,
  isOpen,
  onCancel,
  analyze,
  loadFailed,
  onRetryLoad,
  preview,
  onImport,
  publishedKeys,
}: ImportWorldModalProps<T>): ReactElement => {
  const texts = TEXTS[mode];
  return (
    <JsonImportPreviewModal<JsonImportAnalysis<T>, WorldImportPreviewOk>
      isOpen={isOpen}
      onCancel={onCancel}
      title={texts.title}
      confirmText="Import"
      hint={texts.hint}
      placeholder={texts.placeholder}
      analyze={analyze}
      loadFailed={loadFailed}
      onRetryLoad={onRetryLoad}
      preview={preview}
      renderOk={(ok) => <PreviewOk {...ok} />}
      renderAnalysis={(analysis) => {
        const keys = analysis.data ? publishedKeys(analysis.data) : [];
        return keys.length > 0 ? (
          <p className={styles.status} role="note">
            {`These entities are on the site: ${keys.join(', ')}. ${WORLD_HIDDEN_UNTIL_READ}`}
          </p>
        ) : null;
      }}
      onConfirm={onImport}
    />
  );
};
