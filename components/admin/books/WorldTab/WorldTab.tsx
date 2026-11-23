'use client';

import type { FC } from 'react';
import { useState } from 'react';
import { Switch } from 'antd';
import { Button } from '@/components/admin/common/Button';
import { Spinner } from '@/components/admin/shared';
import type { WorldTabProps } from './WorldTab.types';
import type { BookWorldEntitySummary } from '@/types/api-schema';
import { ImportWorldModal } from './ImportWorldModal';
import { useWorldTab } from './useWorldTab';
import { WorldEntityCard } from './WorldEntityCard';
import { isWorldPublished, worldReadLabel, worldReadState } from './worldErrors';
import { WorldPublicLink } from './WorldPublicLink';
import styles from './WorldTab.module.scss';
import { WorldWriteSection } from './WorldWriteSection';

/**
 * Tab «World» (F08-1, `books-app-docs/features/F08-book-wiki/product.md` §17): the list of
 * entities with the core, the read mark and the flags, the entity card, prompt inputs and the
 * JSON import of the whole version; a published version links to the public page of a listed entity.
 */
export const WorldTab: FC<WorldTabProps> = ({ isEditor, ...props }) => {
  // Вкладка — для редакторов (`admin`, `content_manager`): прочим ручка отдаёт только публичные
  // сущности без служебных полей, и вкладка показала бы их как весь мир. Запросов у них нет.
  if (isEditor === null) {
    return (
      <div className={styles.container}>
        <Spinner size="lg" />
      </div>
    );
  }
  if (!isEditor) {
    return (
      <div className={styles.container}>
        <p className={styles.hint}>
          Editors only: the world of the book is edited by admins and content managers.
        </p>
      </div>
    );
  }
  return <WorldTabContent {...props} />;
};

const WorldTabContent: FC<Omit<WorldTabProps, 'isEditor'>> = (props) => {
  const tab = useWorldTab(props);
  const { isAdmin = false, lang, versionId, version } = props;
  const [importOpen, setImportOpen] = useState(false);
  // Панель хода видна и без списка, на той же позиции (`null` — место шапки): не перемонтируется.
  const run = isAdmin ? (
    <WorldWriteSection versionId={versionId} language={version.language} lang={lang} />
  ) : null;

  if (tab.isLoading || tab.loadError || !tab.world) {
    return (
      <div className={styles.container}>
        {null}
        {run}
        {tab.isLoading ? (
          <Spinner size="lg" />
        ) : (
          <div className={styles.error} role="alert">
            <p>Could not load the world: {tab.loadError?.message ?? 'no data'}</p>
            <Button type="button" variant="secondary" size="sm" onClick={tab.retryLoad}>
              Retry
            </Button>
          </div>
        )}
      </div>
    );
  }

  const entities = tab.world.entities;

  const readCell = (entity: BookWorldEntitySummary) => {
    if (!entity.editor) return '—';
    const state = worldReadState(entity.editor);
    return (
      <span className={styles.cellStack}>
        <span>{worldReadLabel(entity.editor)}</span>
        {isAdmin && state === 'unread' && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={tab.pending.has(entity.key)}
            disabled={tab.pending.has(entity.key)}
            onClick={() => tab.handleMarkRead(entity)}
            ariaLabel={`Mark ${entity.key} as read`}
          >
            Mark as read
          </Button>
        )}
      </span>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Book world</h2>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={tab.copyPromptInputs}>
            Copy prompt inputs
          </Button>
          <Button type="button" variant="secondary" onClick={() => setImportOpen(true)}>
            Import JSON
          </Button>
          <Button type="button" variant="secondary" onClick={() => tab.select(null)}>
            New character
          </Button>
        </div>
      </div>

      {run}
      {tab.validationFailed && (
        <div className={styles.error} role="alert">
          <p>Could not load data validation: entities cannot be checked or saved.</p>
          <Button type="button" variant="secondary" size="sm" onClick={tab.retryValidation}>
            Retry
          </Button>
        </div>
      )}

      {tab.actionError && (
        <p className={styles.error} role="alert">
          {tab.actionError}
        </p>
      )}

      {entities.length === 0 ? (
        <p className={styles.hint}>No entities yet: import JSON or add a character.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Key</th>
                <th>Name</th>
                <th>Role</th>
                <th>Core</th>
                <th>Presence</th>
                <th>Read</th>
                <th>Visible</th>
                <th>Indexed</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {entities.map((entity) => (
                <tr key={entity.key} data-testid={`world-row-${entity.key}`}>
                  <td>{entity.type}</td>
                  <td>
                    <code>{entity.key}</code>
                  </td>
                  <td>{entity.name}</td>
                  <td>{entity.role ?? '—'}</td>
                  <td>
                    {entity.hasCore ? (
                      <span className={styles.ok}>yes</span>
                    ) : (
                      <span className={styles.missing}>
                        missing: {entity.editor?.missing.join(', ') || 'unknown'}
                      </span>
                    )}
                  </td>
                  {/* Глав присутствия (F08-2): считает бэкенд, `null` — ещё не посчитано. */}
                  <td title="Chapters the entity is found in">
                    {entity.editor?.mentionChapters ?? '—'}
                  </td>
                  <td>{readCell(entity)}</td>
                  <td>
                    <Switch
                      size="small"
                      checked={entity.editor?.isVisible ?? false}
                      disabled={!entity.editor || tab.pending.has(entity.key)}
                      onChange={(checked) => tab.handleFlags(entity, { isVisible: checked })}
                      aria-label={`Visible: ${entity.key}`}
                    />
                  </td>
                  <td>
                    <Switch
                      size="small"
                      checked={entity.isIndexable}
                      disabled={tab.pending.has(entity.key)}
                      onChange={(checked) => tab.handleFlags(entity, { isIndexable: checked })}
                      aria-label={`Indexed: ${entity.key}`}
                    />
                  </td>
                  <td>
                    <span className={styles.cellStack}>
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => tab.select(entity.key)}
                        ariaLabel={`Edit ${entity.key}`}
                      >
                        Edit
                      </Button>
                      <WorldPublicLink version={version} entity={entity} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.hint}>
            The public page link appears for a published version with a slug and a listed entity.
          </p>
        </div>
      )}

      {tab.selected !== undefined && (
        <WorldEntityCard
          key={tab.selected ?? '\u0000new'}
          versionId={versionId}
          language={version.language}
          entityKey={tab.selected}
          isAdmin={isAdmin}
          validation={tab.validation}
          validationFailed={tab.validationFailed}
          onRetryValidation={tab.retryValidation}
          initialCheck={tab.createdCheck?.key === tab.selected ? tab.createdCheck.check : null}
          onClose={() => tab.select(undefined)}
          onCreated={tab.openCreated}
        />
      )}

      <ImportWorldModal
        mode="version"
        isOpen={importOpen}
        onCancel={() => setImportOpen(false)}
        analyze={tab.analyzeImport}
        loadFailed={tab.validationFailed}
        onRetryLoad={tab.retryValidation}
        preview={tab.previewImport}
        onImport={tab.applyImport}
        publishedKeys={(data) =>
          data.entities
            .map((e) => e.key)
            .filter((key) => isWorldPublished(entities.find((e) => e.key === key)))
        }
      />
    </div>
  );
};
