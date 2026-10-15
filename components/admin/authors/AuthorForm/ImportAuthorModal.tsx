import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { Input } from 'antd';
import { Button } from '@/components/admin/common/Button';
import { Modal } from '@/components/admin/common/Modal';
import { AUTHOR_SCOPE_LABEL, formatAuthorDataIssue } from '@/lib/admin/author-page-blocks';
import type { AuthorImportAnalysis } from '@/lib/admin/author-import';
import type { AuthorImportData } from '@/lib/admin/author-page-blocks.schema';
import styles from './ImportAuthorModal.module.scss';

interface ImportAuthorModalProps {
  isOpen: boolean;
  onCancel: () => void;
  /**
   * Разбор текста против текущих значений формы — до применения (решение арбитра В7).
   * `null` — модуль проверки ещё грузится: импорт недоступен, окно показывает загрузку.
   */
  analyze: ((jsonText: string) => AuthorImportAnalysis) | null;
  /** Модуль проверки не загрузился: показать ошибку и повтор вместо загрузки. */
  loadFailed?: boolean;
  onRetryLoad?: () => void;
  onImport: (data: AuthorImportData) => void;
}

const PLACEHOLDER = `{
  "birthDate": "1828-09-09",
  "nativeName": "Лев Николаевич Толстой",
  "translations": {
    "en": {
      "name": "Leo Tolstoy",
      "slug": "leo-tolstoy",
      "tagline": "Russian writer, author of War and Peace",
      "biography": "<h3>…</h3><p>…</p>"
    }
  }
}`;

export const ImportAuthorModal: FC<ImportAuthorModalProps> = ({
  isOpen,
  onCancel,
  analyze,
  loadFailed = false,
  onRetryLoad,
  onImport,
}) => {
  const [jsonText, setJsonText] = useState('');

  const analysis = useMemo(
    () => (analyze && jsonText.trim() ? analyze(jsonText) : null),
    [analyze, jsonText]
  );

  const handleConfirm = () => {
    if (!analysis?.data) return;
    onImport(analysis.data);
    setJsonText('');
    onCancel();
  };

  const scope = (lang: string | null) => lang ?? AUTHOR_SCOPE_LABEL;

  return (
    <Modal
      isOpen={isOpen}
      title="Import author data"
      confirmText="Import"
      confirmVariant="primary"
      isConfirmDisabled={!analysis?.data}
      onCancel={onCancel}
      onConfirm={handleConfirm}
      size="lg"
    >
      <div className={styles.container}>
        <p className={styles.description}>
          Paste JSON from the data prompt or the biography prompt. Fields missing from the JSON stay
          as they are; null or [] clears a field.
        </p>
        <Input.TextArea
          rows={12}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={PLACEHOLDER}
          className={styles.textarea}
          aria-label="Import author data"
        />
        {!analyze && !loadFailed && (
          <p className={styles.description} role="status">
            Loading validation…
          </p>
        )}
        {!analyze && loadFailed && (
          <div className={styles.error} role="alert">
            <p>Could not load data validation.</p>
            <Button type="button" variant="secondary" size="sm" onClick={onRetryLoad}>
              Retry
            </Button>
          </div>
        )}
        {analysis && analysis.errors.length > 0 && (
          <div className={styles.error} role="alert">
            <p>Errors, nothing will be imported:</p>
            <ul className={styles.issueList}>
              {analysis.errors.map((issue, idx) => (
                <li key={idx}>{formatAuthorDataIssue(issue)}</li>
              ))}
            </ul>
          </div>
        )}
        {analysis && analysis.unknownKeys.length > 0 && (
          <div className={styles.warning}>
            <p>Unknown keys will be skipped:</p>
            <ul className={styles.issueList}>
              {analysis.unknownKeys.map((issue, idx) => (
                <li key={idx}>{`${scope(issue.lang)} → ${issue.path}`}</li>
              ))}
            </ul>
          </div>
        )}
        {analysis && analysis.data && analysis.unnamed.length > 0 && (
          <div className={styles.warning}>
            <p>
              No name — the translation will not be created until the name and slug are filled in:
            </p>
            <ul className={styles.issueList}>
              {analysis.unnamed.map((lang) => (
                <li key={lang}>{`${lang}: no name`}</li>
              ))}
            </ul>
          </div>
        )}
        {analysis && analysis.data && analysis.cleared.length > 0 && (
          <div className={styles.warning}>
            <p>These filled fields will be cleared:</p>
            <ul className={styles.issueList}>
              {analysis.cleared.map((item, idx) => (
                <li key={idx}>{`${scope(item.lang)} → ${item.field}`}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};
