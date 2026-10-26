'use client';

import type { FC } from 'react';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/admin/common/Button';
import { Spinner } from '@/components/admin/shared';
import {
  BOOK_ANALYSIS_FACT_KEYS,
  BOOK_ANALYSIS_LIST_KEYS,
  BOOK_ANALYSIS_TEXT_KEYS,
  formatBookAnalysisIssue,
  type BookAnalysisTextKey,
} from '@/lib/admin/book-analysis-blocks';
import type { AnalysisTabProps } from './AnalysisTab.types';
import { AnalysisCheckSummary } from './AnalysisCheckSummary';
import styles from './AnalysisTab.module.scss';
import { ImportAnalysisModal } from './ImportAnalysisModal';
import { useAnalysisTab } from './useAnalysisTab';

// Заготовка из досье (F05-11) — только у `admin`: в бандл страницы версии не входит.
const AnalysisDraft = dynamic(() => import('./AnalysisDraft').then((m) => m.AnalysisDraft), {
  ssr: false,
});

const TEXT_ROWS: Record<BookAnalysisTextKey, number> = {
  mainIdea: 3,
  titleMeaning: 4,
  endingMeaning: 4,
  context: 6,
  reception: 5,
};

/**
 * Tab «Analysis» (F03-1, `books-app-docs/features/F03-book-analysis/product.md` §21):
 * prompt inputs, JSON import with merge, hand edits of every block, server warnings after save.
 * Plain text with paragraphs separated by an empty line; lists are edited as JSON.
 */
export const AnalysisTab: FC<AnalysisTabProps> = (props) => {
  const tab = useAnalysisTab(props);
  const [importOpen, setImportOpen] = useState(false);
  /** JSON, с которым открыто окно импорта: заготовка из досье; `undefined` — ручной импорт. */
  const [importJson, setImportJson] = useState<string | undefined>(undefined);
  const { form } = tab;
  const { isAdmin = false, lang = 'en', versionId } = props;
  const openImport = (json?: string) => {
    setImportJson(json);
    setImportOpen(true);
  };

  if (tab.isLoading) {
    return (
      <div className={styles.container}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (tab.loadError) {
    return (
      <div className={styles.container}>
        <div className={styles.error} role="alert">
          <p>Could not load the analysis: {tab.loadError.message}</p>
          <Button type="button" variant="secondary" size="sm" onClick={tab.retryLoad}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Book Analysis</h2>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={tab.copyPromptInputs}>
            Copy prompt inputs
          </Button>
          <Button type="button" variant="secondary" onClick={() => openImport()}>
            Import JSON
          </Button>
        </div>
      </div>

      {isAdmin && (
        <AnalysisDraft
          versionId={versionId}
          lang={lang}
          versionLanguage={props.version.language}
          unsaved={tab.draftBlocksUnsaved}
          savedUpdatedAt={tab.savedUpdatedAt}
          serverUpdatedAt={tab.serverUpdatedAt}
          onOpen={openImport}
        />
      )}

      {tab.validationFailed && (
        <div className={styles.error} role="alert">
          <p>Could not load data validation: lists cannot be checked or saved.</p>
          <Button type="button" variant="secondary" size="sm" onClick={tab.retryValidation}>
            Retry
          </Button>
        </div>
      )}

      {!tab.lastCheck && tab.savedCheckError && (
        <div className={styles.error} role="alert">
          <p>Could not check what is missing to the core: {tab.savedCheckError}</p>
          <Button type="button" variant="secondary" size="sm" onClick={tab.retrySavedCheck}>
            Retry
          </Button>
        </div>
      )}

      {tab.lastCheck ? (
        <AnalysisCheckSummary check={tab.lastCheck} />
      ) : (
        tab.savedHasCore !== null &&
        !tab.savedCheckError && (
          <p className={`${styles.status} ${tab.savedHasCore ? styles.statusOk : ''}`}>
            {tab.savedHasCore
              ? 'Saved analysis has a complete core.'
              : 'Saved analysis has no complete core: checking what is missing…'}
          </p>
        )
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Work card (facts)</h3>
        <div className={styles.factsGrid}>
          {BOOK_ANALYSIS_FACT_KEYS.map((key) => (
            <div key={key} className={styles.field}>
              <label className={styles.label} htmlFor={`analysis-fact-${key}`}>
                {key}
              </label>
              <input
                id={`analysis-fact-${key}`}
                className={styles.input}
                value={form.facts[key]}
                onChange={(e) => tab.setFact(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Texts</h3>
        {BOOK_ANALYSIS_TEXT_KEYS.map((key) => (
          <div key={key} className={styles.field}>
            <label className={styles.label} htmlFor={`analysis-text-${key}`}>
              {key}
            </label>
            <textarea
              id={`analysis-text-${key}`}
              className={styles.textarea}
              rows={TEXT_ROWS[key]}
              value={form.texts[key]}
              onChange={(e) => tab.setText(key, e.target.value)}
            />
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Lists (JSON)</h3>
        {BOOK_ANALYSIS_LIST_KEYS.map((key) => {
          const draft = form.drafts[key];
          const hasIssues = !!draft.issues && draft.issues.length > 0;
          const id = `analysis-list-${key}`;
          return (
            <div key={key} className={styles.field}>
              <label className={styles.label} htmlFor={id}>
                {key}
              </label>
              <textarea
                id={id}
                className={`${styles.textarea} ${styles.jsonTextarea} ${hasIssues ? styles.textareaError : ''}`}
                rows={Math.min(14, Math.max(3, draft.text.split('\n').length))}
                value={draft.text}
                onChange={(e) => tab.setListText(key, e.target.value)}
                spellCheck={false}
                aria-invalid={hasIssues}
                aria-describedby={hasIssues ? `${id}-issues` : undefined}
              />
              {hasIssues && (
                <ul
                  id={`${id}-issues`}
                  className={`${styles.issueList} ${styles.error}`}
                  role="alert"
                >
                  {draft.issues!.map((issue, idx) => (
                    <li key={idx}>{formatBookAnalysisIssue(issue)}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      <Button onClick={tab.handleSave} loading={tab.isSaving} disabled={tab.isSaving}>
        Save analysis
      </Button>

      <ImportAnalysisModal
        isOpen={importOpen}
        initialJson={importJson}
        onCancel={() => {
          setImportOpen(false);
          setImportJson(undefined);
        }}
        analyze={tab.analyzeImport}
        loadFailed={tab.validationFailed}
        onRetryLoad={tab.retryValidation}
        preview={tab.previewImport}
        onImport={tab.applyImport}
      />
    </div>
  );
};
