'use client';

import { useState, type FC } from 'react';
import { X, Copy, Download } from 'lucide-react';
import type { RightsReviewImportDetail } from '@/types/api-schema/rights-intake';
import styles from './ReviewImportDetailModal.module.scss';

interface ReviewImportDetailModalProps {
  importData: RightsReviewImportDetail;
  onClose: () => void;
}

export const ReviewImportDetailModal: FC<ReviewImportDetailModalProps> = ({
  importData,
  onClose,
}) => {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleCopyJson = (json: unknown) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus('Clipboard unavailable');
      setTimeout(() => setCopyStatus(null), 3000);
    }
  };

  const handleDownloadJson = (json: unknown, importId: string) => {
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bibliaris-rights-review-import-${importId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="button"
      tabIndex={0}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            Review Import Detail
            <span className={styles.badge} data-status={importData.importStatus}>
              {importData.importStatus}
            </span>
          </h3>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalDetailSection}>
            <span className={styles.detailLabel}>ID:</span>
            <span className={styles.detailValue}>{importData.id}</span>
          </div>
          <div className={styles.modalDetailSection}>
            <span className={styles.detailLabel}>Schema Version:</span>
            <span className={styles.detailValue}>{importData.schemaVersion || '-'}</span>
          </div>
          <div className={styles.modalDetailSection}>
            <span className={styles.detailLabel}>Source File:</span>
            <span className={styles.detailValue}>{importData.sourceFileName || '-'}</span>
          </div>
          <div className={styles.modalDetailSection}>
            <span className={styles.detailLabel}>Created:</span>
            <span className={styles.detailValue}>
              {new Date(importData.createdAt).toLocaleString()}
            </span>
          </div>

          <details className={styles.modalDetailCollapsible}>
            <summary>Content Hashes</summary>
            <div className={styles.modalDetailSection}>
              <span className={styles.detailLabel}>JSON Hash:</span>
              <span className={`${styles.detailValue} ${styles.hashValue}`}>
                {importData.reportJsonSha256 || '-'}
              </span>
            </div>
            <div className={styles.modalDetailSection}>
              <span className={styles.detailLabel}>Markdown Hash:</span>
              <span className={`${styles.detailValue} ${styles.hashValue}`}>
                {importData.reportMarkdownSha256 || '-'}
              </span>
            </div>
            <div className={styles.modalDetailSection}>
              <span className={styles.detailLabel}>Raw Output Hash:</span>
              <span className={`${styles.detailValue} ${styles.hashValue}`}>
                {importData.rawAgentOutputSha256 || '-'}
              </span>
            </div>
          </details>

          {importData.reportMarkdown && (
            <details className={styles.modalDetailCollapsible}>
              <summary>Markdown Report</summary>
              <pre className={styles.modalDetailPre}>{importData.reportMarkdown}</pre>
            </details>
          )}

          {importData.rawAgentOutput && (
            <details className={styles.modalDetailCollapsible}>
              <summary>Raw Agent Output</summary>
              <pre className={styles.modalDetailPre}>{importData.rawAgentOutput}</pre>
            </details>
          )}

          {importData.validationErrors && importData.validationErrors.length > 0 && (
            <div className={styles.validationList}>
              <p className={styles.validationErrorsTitle}>Validation Errors:</p>
              {importData.validationErrors.map((v, i) => (
                <div key={i} className={styles.validationItemError}>
                  <span className={styles.validationPath}>{v.path}</span>
                  <span className={styles.validationMessage}>{v.message}</span>
                </div>
              ))}
            </div>
          )}

          {importData.validationWarnings && importData.validationWarnings.length > 0 && (
            <div className={styles.validationList}>
              <p className={styles.validationWarningsTitle}>Validation Warnings:</p>
              {importData.validationWarnings.map((v, i) => (
                <div key={i} className={styles.validationItemWarning}>
                  <span className={styles.validationPath}>{v.path}</span>
                  <span className={styles.validationMessage}>{v.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.manifestActions}>
            <button
              className={styles.actionBtnSecondary}
              onClick={() => handleCopyJson(importData.reportJson)}
            >
              <Copy size={14} />
              {copyStatus || 'Copy JSON'}
            </button>
            <button
              className={styles.actionBtnSecondary}
              onClick={() => handleDownloadJson(importData.reportJson, importData.id)}
            >
              <Download size={14} />
              Download JSON
            </button>
          </div>

          <pre className={styles.modalDetailPre}>
            {JSON.stringify(importData.reportJson, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};
