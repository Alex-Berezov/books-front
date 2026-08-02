'use client';

import { useState, type FC, type ChangeEvent } from 'react';
import { FileUp, Copy, Download } from 'lucide-react';
import { useCreateRightsReviewImport } from '@/api/hooks/useRightsIntakes';
import type {
  RightsReviewImportDetail,
  RightsReviewImportListItem,
} from '@/types/api-schema/rights-intake';
import styles from './ReviewImportPanel.module.scss';
import { ReportPdfPanel } from '../ReportPdfPanel/ReportPdfPanel';
import { ReviewImportHistory } from '../ReviewImportHistory/ReviewImportHistory';

interface ReviewImportPanelProps {
  intakeId: string;
  workflowStatus: string;
  reviewImports: RightsReviewImportListItem[];
}

export const ReviewImportPanel: FC<ReviewImportPanelProps> = ({
  intakeId,
  workflowStatus,
  reviewImports,
}) => {
  const [reviewJsonText, setReviewJsonText] = useState('');
  const [reviewSourceFileName, setReviewSourceFileName] = useState('');
  const [reviewMarkdown, setReviewMarkdown] = useState('');
  const [rawAgentOutput, setRawAgentOutput] = useState('');
  const [importResult, setImportResult] = useState<RightsReviewImportDetail | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const createReviewImportMutation = useCreateRightsReviewImport(intakeId);

  const canImport = workflowStatus === 'READY_FOR_AGENT' || workflowStatus === 'REVIEW_IMPORTED';

  // WP-9.2: PDF прикрепляется к конкретному импорту — к текущему, а сразу после загрузки
  // JSON текущим становится только что созданный.
  const currentImport = importResult ?? reviewImports.find((item) => item.isCurrent) ?? null;

  const handleImportReview = async () => {
    setImportResult(null);
    setImportError(null);

    let parsedJson: Record<string, unknown>;
    try {
      parsedJson = JSON.parse(reviewJsonText) as Record<string, unknown>;
    } catch {
      setImportError('Invalid JSON. Please check your syntax and try again.');
      return;
    }

    const sourceFileName = reviewSourceFileName.trim() || 'manual-paste.json';

    try {
      const result = await createReviewImportMutation.mutateAsync({
        reportJson: parsedJson,
        reportMarkdown: reviewMarkdown.trim() || null,
        rawAgentOutput: rawAgentOutput.trim() || null,
        sourceFileName,
      });
      setImportResult(result);
      setReviewJsonText('');
      setReviewSourceFileName('');
      setReviewMarkdown('');
      setRawAgentOutput('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to import review report.';
      setImportError(msg);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(reviewJsonText);
      setReviewJsonText(JSON.stringify(parsed, null, 2));
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    setReviewJsonText('');
    setReviewSourceFileName('');
    setReviewMarkdown('');
    setRawAgentOutput('');
    setImportError(null);
  };

  const handleJsonFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setReviewJsonText(event.target?.result as string);
      if (!reviewSourceFileName) setReviewSourceFileName(file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleMdFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setReviewMarkdown(event.target?.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyResultJson = (json: unknown) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus('Clipboard unavailable');
      setTimeout(() => setCopyStatus(null), 3000);
    }
  };

  const handleDownloadResultJson = (json: unknown, importId: string) => {
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
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Review Import</h2>
      {canImport ? (
        <>
          {workflowStatus === 'REVIEW_IMPORTED' && (
            <div className={styles.reimportWarning}>
              This intake already has a review import. Importing a new review will supersede the
              current one.
            </div>
          )}
          <p className={styles.sectionHint}>
            Paste the JSON review report from the external ChatGPT agent below, or upload a .json
            file.
          </p>

          <div className={styles.reviewImportRow}>
            <label className={styles.fileUploadLabel}>
              <FileUp size={16} />
              Upload .json
              <input
                type="file"
                accept=".json"
                className={styles.fileInput}
                onChange={handleJsonFileUpload}
              />
            </label>
            <button
              className={styles.actionBtnSecondary}
              onClick={handleFormatJson}
              disabled={!reviewJsonText.trim()}
            >
              Format JSON
            </button>
            <button
              className={styles.actionBtnSecondary}
              onClick={handleClear}
              disabled={!reviewJsonText.trim() && !reviewSourceFileName}
            >
              Clear
            </button>
          </div>

          <textarea
            className={styles.jsonTextarea}
            rows={10}
            placeholder='{"schemaVersion": "1.0", "intakeId": "...", "rightsProfile": {...}}'
            value={reviewJsonText}
            onChange={(e) => setReviewJsonText(e.target.value)}
          />

          <div className={styles.reviewImportRow}>
            <input
              className={styles.textInput}
              type="text"
              placeholder="Source file name (optional)"
              value={reviewSourceFileName}
              onChange={(e) => setReviewSourceFileName(e.target.value)}
            />
            <button
              className={styles.actionBtnPrimary}
              onClick={handleImportReview}
              disabled={createReviewImportMutation.isPending || !reviewJsonText.trim()}
            >
              {createReviewImportMutation.isPending ? 'Importing...' : 'Import Review'}
            </button>
          </div>

          <details className={styles.optionalSection}>
            <summary>Optional: Markdown report & raw agent output</summary>
            <label htmlFor="markdown-report-input" className={styles.fieldLabel}>
              Markdown Report
            </label>
            <div className={styles.reviewImportRow}>
              <label className={styles.fileUploadLabel}>
                <FileUp size={16} />
                Upload .md
                <input
                  type="file"
                  accept=".md"
                  className={styles.fileInput}
                  onChange={handleMdFileUpload}
                />
              </label>
            </div>
            <textarea
              id="markdown-report-input"
              className={styles.jsonTextarea}
              rows={5}
              placeholder="Paste markdown version of report (optional)"
              value={reviewMarkdown}
              onChange={(e) => setReviewMarkdown(e.target.value)}
            />
            <label htmlFor="raw-agent-output-input" className={styles.fieldLabel}>
              Raw Agent Output
            </label>
            <textarea
              id="raw-agent-output-input"
              className={styles.jsonTextarea}
              rows={5}
              placeholder="Paste raw agent text output (optional)"
              value={rawAgentOutput}
              onChange={(e) => setRawAgentOutput(e.target.value)}
            />
          </details>

          {importError && <p className={styles.importErrorText}>{importError}</p>}

          {importResult && (
            <div className={styles.importResult}>
              <p className={styles.importResultTitle}>
                Import completed with status:{' '}
                <span className={styles.badge} data-status={importResult.importStatus}>
                  {importResult.importStatus}
                </span>
              </p>
              <div className={styles.reviewImportRow}>
                <button
                  className={styles.actionBtnSecondary}
                  onClick={() => handleCopyResultJson(importResult.reportJson)}
                >
                  <Copy size={14} />
                  {copyStatus || 'Copy JSON'}
                </button>
                <button
                  className={styles.actionBtnSecondary}
                  onClick={() => handleDownloadResultJson(importResult.reportJson, importResult.id)}
                >
                  <Download size={14} />
                  Download JSON
                </button>
              </div>

              {/*
                WP-G.9: часть проверок стала предупреждениями, и принятый отчёт с замечаниями
                нельзя показывать так же, как отклонённый. Отказ и замечание — разные сообщения.
              */}
              {importResult.importStatus === 'VALIDATION_FAILED' ? (
                <p className={styles.importRejectedNotice} data-testid="import-rejected-notice">
                  The report was rejected: no rights profile is built until the errors below are
                  fixed and the report is re-imported.
                </p>
              ) : (
                importResult.validationWarnings &&
                importResult.validationWarnings.length > 0 && (
                  <p className={styles.importWarningsNotice} data-testid="import-warnings-notice">
                    The report was accepted. The remarks below do not block the import — review them
                    before approving the clearance.
                  </p>
                )
              )}

              {importResult.validationErrors && importResult.validationErrors.length > 0 && (
                <div className={styles.validationList}>
                  <p className={styles.validationErrorsTitle}>Validation Errors:</p>
                  {importResult.validationErrors.map((v, i) => (
                    <div key={i} className={styles.validationItemError}>
                      <span className={styles.validationPath}>{v.path}</span>
                      <span>{v.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {importResult.validationWarnings && importResult.validationWarnings.length > 0 && (
                <div className={styles.validationList}>
                  <p className={styles.validationWarningsTitle}>Validation Warnings:</p>
                  {importResult.validationWarnings.map((v, i) => (
                    <div key={i} className={styles.validationItemWarning}>
                      <span className={styles.validationPath}>{v.path}</span>
                      <span>{v.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {(!importResult.validationErrors || importResult.validationErrors.length === 0) &&
                (!importResult.validationWarnings ||
                  importResult.validationWarnings.length === 0) && (
                  <p className={styles.importNoIssues}>No validation issues detected.</p>
                )}
            </div>
          )}
        </>
      ) : workflowStatus === 'DRAFT' ? (
        <p className={styles.sectionHint}>
          Mark this intake as <strong>Ready For Agent</strong> before importing review results.
        </p>
      ) : (
        <p className={styles.sectionHint}>
          Review import is not available for intakes in <strong>{workflowStatus}</strong> status.
        </p>
      )}

      <ReportPdfPanel importId={currentImport?.id ?? null} />

      <ReviewImportHistory reviewImports={reviewImports} />
    </div>
  );
};
