import type { FC } from 'react';
import { useState } from 'react';
import { Button } from '@/components/admin/common/Button';
import { MessageLines } from '@/components/admin/common/MessageLines';
import { Modal } from '@/components/admin/common/Modal';
import { Spinner } from '@/components/admin/shared';
import { formatDataIssue } from '@/lib/admin/data-issue';
import { ImportWorldModal } from './ImportWorldModal';
import { useWorldEntityCard, type WorldEntityCardOptions } from './useWorldEntityCard';
import { unplacedIssues, WorldEntityFields } from './WorldEntityFields';
import { isWorldPublished, WORLD_HIDDEN_UNTIL_READ, worldReadLabel } from './worldErrors';
import { FieldIssues } from './WorldFieldIssues';
import styles from './WorldTab.module.scss';

interface WorldEntityCardProps extends WorldEntityCardOptions {
  /** Модуль проверок не загрузился: окно импорта показывает повтор. */
  validationFailed: boolean;
  onRetryValidation: () => void;
}

/**
 * Карточка героя вкладки World (F08-1, `product.md` §17 п.3, поля — `tech.md` §3): правка всех
 * полей, запись всей сущности со сверкой, удаление, импорт JSON одной сущности. Ключ
 * существующей сущности только для чтения: ручки меняют сущность по ключу, переименования нет.
 * Логика — `useWorldEntityCard`, поля — `WorldEntityFields`.
 */
export const WorldEntityCard: FC<WorldEntityCardProps> = (props) => {
  const { entityKey, validation, validationFailed, onRetryValidation, onClose } = props;
  const card = useWorldEntityCard(props);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const label = card.isNew ? 'New entity' : `Entity ${entityKey}`;

  if (!card.hydrated) {
    return (
      <section className={styles.card} aria-label={label}>
        {card.loadError ? (
          <div className={styles.error} role="alert">
            <p>Could not load the entity: {card.loadError.message}</p>
            <Button type="button" variant="secondary" size="sm" onClick={card.reload}>
              Retry
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <Spinner size="md" />
        )}
      </section>
    );
  }

  const { entity, lastCheck } = card;
  const editor = entity?.editor;
  const entityType = entity?.type ?? 'character';

  return (
    <section className={styles.card} aria-label={label}>
      <div className={styles.header}>
        <h3 className={styles.sectionTitle}>
          {card.isNew ? 'New character' : `${entity?.name ?? ''} (${entityKey})`}
        </h3>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            Import JSON
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {editor && (
        <p className={`${styles.status} ${editor.missing.length === 0 ? styles.statusOk : ''}`}>
          {editor.missing.length === 0
            ? 'Core complete.'
            : `Missing to the core: ${editor.missing.join(', ')}.`}{' '}
          Read: {worldReadLabel(editor)}. Visible: {editor.isVisible ? 'yes' : 'no'}.
          {editor.firstPublishedAt && ' Was public on the site.'}
        </p>
      )}

      <WorldEntityFields
        form={card.form}
        setForm={card.setForm}
        issues={card.issues}
        entityKey={entityKey}
        type={entityType}
        mentions={entity?.mentions ?? null}
        stale={entity?.editor?.stale ?? []}
        versionHasChapters={card.chapterNumbers === null ? null : card.chapterNumbers.length > 0}
        recountNotice={card.recountNotice}
        onReloadPresence={card.reloadPresence}
        presenceReloadError={card.presenceReloadError}
      />

      {card.issues.length > 0 && (
        <div className={styles.error} role="alert">
          <p>Fix the errors in the fields first, nothing was saved.</p>
          <FieldIssues issues={unplacedIssues(card.issues, entityType)} />
        </div>
      )}
      {card.serverError && (
        <div className={styles.error} role="alert">
          <p>The server rejected the entity:</p>
          <MessageLines text={card.serverError} />
        </div>
      )}
      {card.stale && (
        <div className={styles.error} role="alert">
          <p>
            The entity was changed on the server since it was opened: reload it (your edits are
            lost) or copy them out first.
          </p>
          {card.reloadError && <p>Could not reload: {card.reloadError}</p>}
          <Button type="button" variant="secondary" size="sm" onClick={card.reload}>
            Reload
          </Button>
        </div>
      )}
      {lastCheck && (
        <div className={`${styles.status} ${lastCheck.hasCore ? styles.statusOk : ''}`}>
          <p>{lastCheck.hasCore ? 'Saved: core complete.' : 'Saved without a complete core.'}</p>
          {lastCheck.warnings.length > 0 && (
            <ul className={styles.issueList}>
              {lastCheck.warnings.map((w, idx) => (
                <li key={idx}>{formatDataIssue(w)}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <Button
          type="button"
          onClick={card.handleSave}
          loading={card.isSaving}
          disabled={card.isSaving || card.stale || !validation}
        >
          Save entity
        </Button>
        {isWorldPublished(entity) && (
          <p className={styles.hint} role="note">
            {WORLD_HIDDEN_UNTIL_READ}
          </p>
        )}
        {!card.isNew && (
          <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
      </div>

      <ImportWorldModal
        mode="entity"
        isOpen={importOpen}
        onCancel={() => setImportOpen(false)}
        analyze={card.analyzeImport}
        loadFailed={validationFailed}
        onRetryLoad={onRetryValidation}
        preview={card.previewImport}
        onImport={card.applyImport}
        publishedKeys={(data) => (card.isPublished(data.key) ? [data.key] : [])}
      />

      <Modal
        isOpen={confirmDelete}
        title="Delete entity"
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={card.isDeleting}
        onCancel={() => {
          setConfirmDelete(false);
          card.resetDeleteError();
        }}
        onConfirm={() => card.handleDelete(() => setConfirmDelete(false))}
        size="sm"
      >
        <p>
          Delete «{entityKey}» with all its fields? An entity that is or was public cannot be
          deleted: turn off «Visible» instead.
        </p>
        {card.deleteError && (
          <p className={styles.error} role="alert">
            {card.deleteError}
          </p>
        )}
      </Modal>
    </section>
  );
};
