'use client';

import { useState, useCallback, type ReactNode } from 'react';
import {
  ArrowLeft,
  Archive,
  Send,
  Undo,
  Pencil,
  Eye,
  Copy,
  FileDown,
  FileUp,
  X,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getRightsReviewImport } from '@/api/endpoints/admin/rights-intakes';
import {
  useRightsIntake,
  useChangeRightsIntakeStatus,
  useArchiveRightsIntake,
  useRightsAgentManifest,
  useRightsReviewImports,
  useCreateRightsReviewImport,
} from '@/api/hooks/useRightsIntakes';
import { RightsIntakeForm } from '@/components/admin/rights-intakes/RightsIntakeForm/RightsIntakeForm';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  RightsAgentManifest,
  RightsReviewImportDetail,
} from '@/types/api-schema/rights-intake';
import styles from './page.module.scss';

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  ru: 'Russian',
};

export default function RightsIntakeDetailPage() {
  const params = useParams();
  const lang = params.lang as SupportedLang;
  const id = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [manifestData, setManifestData] = useState<RightsAgentManifest | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const [reviewJsonText, setReviewJsonText] = useState('');
  const [reviewSourceFileName, setReviewSourceFileName] = useState('');
  const [reviewMarkdown, setReviewMarkdown] = useState('');
  const [rawAgentOutput, setRawAgentOutput] = useState('');
  const [importResult, setImportResult] = useState<RightsReviewImportDetail | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailImportData, setDetailImportData] = useState<RightsReviewImportDetail | null>(null);
  const [importDetailCopyStatus, setImportDetailCopyStatus] = useState<string | null>(null);

  const { data: intake, isLoading, error } = useRightsIntake(id);
  const changeStatusMutation = useChangeRightsIntakeStatus();
  const archiveMutation = useArchiveRightsIntake();
  const manifestQuery = useRightsAgentManifest(id);
  const { data: reviewImportsData } = useRightsReviewImports(id, { limit: 20 });
  const createReviewImportMutation = useCreateRightsReviewImport(id);

  const editableStatuses = ['DRAFT', 'READY_FOR_AGENT'];
  const canEdit = intake && editableStatuses.includes(intake.workflowStatus);
  const canMarkReady = intake?.workflowStatus === 'DRAFT';
  const canReturnToDraft = intake?.workflowStatus === 'READY_FOR_AGENT';
  const canArchive =
    intake?.workflowStatus === 'DRAFT' || intake?.workflowStatus === 'READY_FOR_AGENT';
  const canImportReview =
    intake?.workflowStatus === 'READY_FOR_AGENT' || intake?.workflowStatus === 'REVIEW_IMPORTED';
  const reviewImports = reviewImportsData?.items ?? [];

  const handleMarkReady = async () => {
    if (!intake) return;
    await changeStatusMutation.mutateAsync({ id: intake.id, status: 'READY_FOR_AGENT' });
  };

  const handleReturnToDraft = async () => {
    if (!intake) return;
    await changeStatusMutation.mutateAsync({ id: intake.id, status: 'DRAFT' });
  };

  const handleArchive = async () => {
    if (!intake) return;
    await archiveMutation.mutateAsync(intake.id);
  };

  const fetchManifest = useCallback(async (): Promise<RightsAgentManifest | null> => {
    setManifestError(null);
    try {
      const result = await manifestQuery.refetch();
      if (result.error) {
        const msg =
          result.error instanceof Error ? result.error.message : 'Failed to load agent manifest';
        setManifestError(msg);
        return null;
      }
      return result.data ?? null;
    } catch {
      setManifestError('Failed to load agent manifest');
      return null;
    }
  }, [manifestQuery]);

  const handlePreviewManifest = async () => {
    const data = await fetchManifest();
    if (data) {
      setManifestData(data);
      setManifestModalOpen(true);
    }
  };

  const handleCopyJson = async () => {
    const data = await fetchManifest();
    if (!data) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopyStatus('Copied');
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus('Clipboard is not available. Use Preview Manifest and copy manually.');
      setTimeout(() => setCopyStatus(null), 4000);
    }
  };

  const handleDownloadJson = async () => {
    const data = await fetchManifest();
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bibliaris-rights-manifest-${id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportReview = async () => {
    setImportResult(null);
    setImportError(null);

    let parsedJson: Record<string, unknown>;
    try {
      parsedJson = JSON.parse(reviewJsonText) as Record<string, unknown>;
    } catch {
      setImportError('Invalid JSON. Please check your input.');
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
      const msg = err instanceof Error ? err.message : 'Failed to import review. Please try again.';
      setImportError(msg);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(reviewJsonText);
      setReviewJsonText(JSON.stringify(parsed, null, 2));
    } catch {
      // ignore — invalid JSON
    }
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleMdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setReviewMarkdown(event.target?.result as string);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleViewImportDetail = async (importId: string) => {
    try {
      const data = await getRightsReviewImport(importId);
      setDetailImportData(data);
      setDetailModalOpen(true);
    } catch {
      setDetailImportData(null);
    }
  };

  const handleCopyImportJson = (json: unknown) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      setImportDetailCopyStatus('Copied');
      setTimeout(() => setImportDetailCopyStatus(null), 2000);
    } catch {
      setImportDetailCopyStatus('Clipboard not available');
      setTimeout(() => setImportDetailCopyStatus(null), 4000);
    }
  };

  const handleDownloadImportJson = (json: unknown, importId: string) => {
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

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error || !intake) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Rights intake not found</p>
          <Link href={`/admin/${lang}/rights-intakes`} className={styles.backLink}>
            &larr; Back to Rights Intakes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {isEditing ? (
        <>
          <div className={styles.breadcrumb}>
            <Link href={`/admin/${lang}/rights-intakes`} className={styles.backLink}>
              <ArrowLeft size={16} />
              Rights Intakes
            </Link>
          </div>
          <h1 className={styles.title}>Edit: {intake.candidateTitle}</h1>
          <RightsIntakeForm
            lang={lang}
            mode="edit"
            initialData={intake}
            onCancel={() => setIsEditing(false)}
          />
        </>
      ) : (
        <>
          <div className={styles.header}>
            <div className={styles.breadcrumb}>
              <Link href={`/admin/${lang}/rights-intakes`} className={styles.backLink}>
                <ArrowLeft size={16} />
                Rights Intakes
              </Link>
            </div>
            <div className={styles.titleRow}>
              <div>
                <h1 className={styles.title}>{intake.candidateTitle}</h1>
                <p className={styles.subtitle}>by {intake.candidateAuthor}</p>
              </div>
              <div className={styles.headerActions}>
                {canEdit && (
                  <button className={styles.actionBtnSecondary} onClick={() => setIsEditing(true)}>
                    <Pencil size={16} />
                    Edit
                  </button>
                )}
                {canMarkReady && (
                  <button
                    className={styles.actionBtnPrimary}
                    onClick={handleMarkReady}
                    disabled={changeStatusMutation.isPending}
                  >
                    <Send size={16} />
                    Mark Ready For Agent
                  </button>
                )}
                {canReturnToDraft && (
                  <button
                    className={styles.actionBtnSecondary}
                    onClick={handleReturnToDraft}
                    disabled={changeStatusMutation.isPending}
                  >
                    <Undo size={16} />
                    Return To Draft
                  </button>
                )}
                {canArchive && (
                  <button
                    className={styles.actionBtnDanger}
                    onClick={handleArchive}
                    disabled={archiveMutation.isPending}
                  >
                    <Archive size={16} />
                    Archive
                  </button>
                )}
              </div>
            </div>
            <div className={styles.statusBar}>
              Status: <StatusBadge status={intake.workflowStatus} />
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Work</h2>
              <DetailRow label="Title" value={intake.candidateTitle} />
              <DetailRow label="Author" value={intake.candidateAuthor} />
              <DetailRow label="Original Title" value={intake.originalTitle} />
              <DetailRow label="Original Language" value={intake.originalLanguage} />
              <DetailRow label="Author Birth Year" value={intake.authorBirthYear?.toString()} />
              <DetailRow label="Author Death Year" value={intake.authorDeathYear?.toString()} />
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Source</h2>
              <DetailRow label="Provider" value={intake.sourceProvider} />
              <DetailRow label="External ID" value={intake.sourceExternalId} />
              <DetailRow
                label="URL"
                value={
                  intake.sourceUrl ? (
                    <a href={intake.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {intake.sourceUrl}
                    </a>
                  ) : null
                }
              />
              <DetailRow label="Title" value={intake.sourceTitle} />
              <DetailRow label="Language" value={intake.sourceLanguage} />
              <DetailRow label="Text Type" value={intake.sourceTextType} />
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Publication Plan</h2>
              <DetailRow
                label="Target Languages"
                value={intake.targetLanguages
                  .map((l) => LANG_LABELS[l] || l.toUpperCase())
                  .join(', ')}
              />
              <DetailRow
                label="Target Countries"
                value={`${intake.targetCountryCodes.length} countries`}
              />
              <DetailRow label="Content Types" value={intake.plannedContentTypes.join(', ')} />
              <DetailRow label="Components" value={intake.plannedComponents?.join(', ') || '-'} />
            </div>

            {intake.notesRu && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Notes</h2>
                <p className={styles.notes}>{intake.notesRu}</p>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Agent Manifest</h2>
            {intake.workflowStatus === 'DRAFT' ? (
              <>
                <p className={styles.manifestHint}>
                  Mark this intake as <strong>Ready For Agent</strong> before exporting the
                  manifest.
                </p>
                <div className={styles.manifestActions}>
                  <button className={styles.actionBtnSecondary} disabled>
                    <Eye size={16} />
                    Preview Manifest
                  </button>
                  <button className={styles.actionBtnSecondary} disabled>
                    <Copy size={16} />
                    Copy JSON
                  </button>
                  <button className={styles.actionBtnSecondary} disabled>
                    <FileDown size={16} />
                    Download JSON
                  </button>
                </div>
              </>
            ) : intake.workflowStatus === 'READY_FOR_AGENT' ? (
              <>
                <p className={styles.manifestHint}>
                  Export a structured JSON manifest for the external ChatGPT-based rights check
                  agent.
                </p>
                <div className={styles.manifestActions}>
                  <button className={styles.actionBtnSecondary} onClick={handlePreviewManifest}>
                    <Eye size={16} />
                    Preview Manifest
                  </button>
                  <button className={styles.actionBtnSecondary} onClick={handleCopyJson}>
                    <Copy size={16} />
                    {copyStatus || 'Copy JSON'}
                  </button>
                  <button className={styles.actionBtnSecondary} onClick={handleDownloadJson}>
                    <FileDown size={16} />
                    Download JSON
                  </button>
                </div>
                {manifestError && <p className={styles.manifestErrorText}>{manifestError}</p>}
              </>
            ) : (
              <p className={styles.manifestHint}>
                Manifest export is available only for intakes in <strong>Ready For Agent</strong>{' '}
                status.
              </p>
            )}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Review Import</h2>
            {canImportReview ? (
              <>
                {intake?.workflowStatus === 'REVIEW_IMPORTED' && (
                  <div className={styles.reimportWarning}>
                    This intake already has a review import. Importing again will supersede the
                    current one.
                  </div>
                )}
                <p className={styles.sectionHint}>
                  Paste the JSON review report from the external ChatGPT agent below, or upload a{' '}
                  .json file.
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
                    disabled={reviewJsonText.trim() === ''}
                  >
                    Format JSON
                  </button>
                </div>

                <textarea
                  className={styles.jsonTextarea}
                  rows={10}
                  placeholder='{"schemaVersion": "1.0", "intakeId": "...", ...}'
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
                    disabled={createReviewImportMutation.isPending || reviewJsonText.trim() === ''}
                  >
                    {createReviewImportMutation.isPending ? 'Importing...' : 'Import Review'}
                  </button>
                </div>

                <details className={styles.optionalSection}>
                  <summary className={styles.optionalSummary}>
                    Optional: Markdown report & raw agent output
                  </summary>
                  <label className={styles.fieldLabel}>Markdown Report</label>
                  <div className={styles.reviewImportRow} style={{ marginBottom: '8px' }}>
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
                    className={styles.jsonTextarea}
                    rows={6}
                    placeholder="Paste the markdown version of the report (optional)"
                    value={reviewMarkdown}
                    onChange={(e) => setReviewMarkdown(e.target.value)}
                  />
                  <label className={styles.fieldLabel}>Raw Agent Output</label>
                  <textarea
                    className={styles.jsonTextarea}
                    rows={6}
                    placeholder="Paste the raw agent output (optional)"
                    value={rawAgentOutput}
                    onChange={(e) => setRawAgentOutput(e.target.value)}
                  />
                </details>

                {importError && <p className={styles.importErrorText}>{importError}</p>}
                {importResult && (
                  <div className={styles.importResult}>
                    <p className={styles.importResultTitle}>
                      Import completed with status:{' '}
                      <ReviewImportStatusBadge status={importResult.importStatus} />
                    </p>
                    <div className={styles.manifestActions}>
                      <button
                        className={styles.actionBtnSecondary}
                        onClick={() => handleCopyImportJson(importResult.reportJson)}
                      >
                        <Copy size={14} />
                        {importDetailCopyStatus || 'Copy JSON'}
                      </button>
                      <button
                        className={styles.actionBtnSecondary}
                        onClick={() =>
                          handleDownloadImportJson(importResult.reportJson, importResult.id)
                        }
                      >
                        <Download size={14} />
                        Download JSON
                      </button>
                    </div>
                    {importResult.validationErrors && importResult.validationErrors.length > 0 && (
                      <div className={styles.validationList}>
                        <p className={styles.validationErrorsTitle}>Validation Errors:</p>
                        {importResult.validationErrors.map((v, i) => (
                          <div key={i} className={styles.validationItemError}>
                            <span className={styles.validationPath}>{v.path}</span>
                            <span className={styles.validationMessage}>{v.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {importResult.validationWarnings &&
                      importResult.validationWarnings.length > 0 && (
                        <div className={styles.validationList}>
                          <p className={styles.validationWarningsTitle}>Validation Warnings:</p>
                          {importResult.validationWarnings.map((v, i) => (
                            <div key={i} className={styles.validationItemWarning}>
                              <span className={styles.validationPath}>{v.path}</span>
                              <span className={styles.validationMessage}>{v.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    {(!importResult.validationErrors ||
                      importResult.validationErrors.length === 0) &&
                      (!importResult.validationWarnings ||
                        importResult.validationWarnings.length === 0) && (
                        <p className={styles.importNoIssues}>No validation issues.</p>
                      )}
                  </div>
                )}
              </>
            ) : intake?.workflowStatus === 'DRAFT' ? (
              <p className={styles.sectionHint}>
                Mark this intake as <strong>Ready For Agent</strong> before importing review
                results.
              </p>
            ) : (
              <p className={styles.sectionHint}>
                Review import is not available for intakes in{' '}
                <strong>{intake?.workflowStatus}</strong> status.
              </p>
            )}

            {reviewImports.length > 0 && (
              <div className={styles.importHistory}>
                <h3 className={styles.importHistoryTitle}>Import History</h3>
                <div className={styles.importHistoryList}>
                  {reviewImports.map((item) => (
                    <div
                      key={item.id}
                      className={styles.importHistoryItem}
                      onClick={() => handleViewImportDetail(item.id)}
                    >
                      <div className={styles.importHistoryItemLeft}>
                        <ReviewImportStatusBadge status={item.importStatus} />
                        {item.isCurrent && <span className={styles.currentBadge}>Current</span>}
                        <span className={styles.importHistoryDate}>
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.importHistoryItemRight}>
                        <span className={styles.importIssueCount}>
                          {item.validationErrorsCount > 0 && (
                            <span className={styles.errorCount}>
                              {item.validationErrorsCount} errors
                            </span>
                          )}
                          {item.validationWarningsCount > 0 && (
                            <span className={styles.warningCount}>
                              {item.validationWarningsCount} warnings
                            </span>
                          )}
                          {item.validationErrorsCount === 0 &&
                            item.validationWarningsCount === 0 && (
                              <span className={styles.cleanLabel}>Clean</span>
                            )}
                        </span>
                        <span className={styles.viewDetailArrow}>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.meta}>
            <span>Created: {new Date(intake.createdAt).toLocaleString()}</span>
            <span>Updated: {new Date(intake.updatedAt).toLocaleString()}</span>
            {intake.archivedAt && (
              <span>Archived: {new Date(intake.archivedAt).toLocaleString()}</span>
            )}
          </div>
        </>
      )}

      {manifestModalOpen && manifestData && (
        <div className={styles.overlay} onClick={() => setManifestModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Agent Manifest</h3>
              <button className={styles.modalClose} onClick={() => setManifestModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <pre className={styles.modalBody}>{JSON.stringify(manifestData, null, 2)}</pre>
          </div>
        </div>
      )}

      {detailModalOpen && detailImportData && (
        <div className={styles.overlay} onClick={() => setDetailModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Review Import Detail
                <ReviewImportStatusBadge status={detailImportData.importStatus} />
              </h3>
              <button className={styles.modalClose} onClick={() => setDetailModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalDetailSection}>
                <span className={styles.detailLabel}>ID:</span>
                <span className={styles.detailValue}>{detailImportData.id}</span>
              </div>
              <div className={styles.modalDetailSection}>
                <span className={styles.detailLabel}>Schema Version:</span>
                <span className={styles.detailValue}>{detailImportData.schemaVersion || '-'}</span>
              </div>
              <div className={styles.modalDetailSection}>
                <span className={styles.detailLabel}>Source File:</span>
                <span className={styles.detailValue}>{detailImportData.sourceFileName || '-'}</span>
              </div>
              <div className={styles.modalDetailSection}>
                <span className={styles.detailLabel}>Created:</span>
                <span className={styles.detailValue}>
                  {new Date(detailImportData.createdAt).toLocaleString()}
                </span>
              </div>

              <details className={styles.modalDetailCollapsible}>
                <summary>Content Hashes</summary>
                <div className={styles.modalDetailSection}>
                  <span className={styles.detailLabel}>JSON Hash:</span>
                  <span className={`${styles.detailValue} ${styles.hashValue}`}>
                    {detailImportData.reportJsonSha256 || '-'}
                  </span>
                </div>
                <div className={styles.modalDetailSection}>
                  <span className={styles.detailLabel}>Markdown Hash:</span>
                  <span className={`${styles.detailValue} ${styles.hashValue}`}>
                    {detailImportData.reportMarkdownSha256 || '-'}
                  </span>
                </div>
                <div className={styles.modalDetailSection}>
                  <span className={styles.detailLabel}>Raw Output Hash:</span>
                  <span className={`${styles.detailValue} ${styles.hashValue}`}>
                    {detailImportData.rawAgentOutputSha256 || '-'}
                  </span>
                </div>
              </details>

              {detailImportData.reportMarkdown && (
                <details className={styles.modalDetailCollapsible}>
                  <summary>Markdown Report</summary>
                  <pre className={styles.modalDetailPre}>{detailImportData.reportMarkdown}</pre>
                </details>
              )}

              {detailImportData.rawAgentOutput && (
                <details className={styles.modalDetailCollapsible}>
                  <summary>Raw Agent Output</summary>
                  <pre className={styles.modalDetailPre}>{detailImportData.rawAgentOutput}</pre>
                </details>
              )}

              {detailImportData.validationErrors &&
                detailImportData.validationErrors.length > 0 && (
                  <div className={styles.validationList}>
                    <p className={styles.validationErrorsTitle}>Validation Errors:</p>
                    {detailImportData.validationErrors.map((v, i) => (
                      <div key={i} className={styles.validationItemError}>
                        <span className={styles.validationPath}>{v.path}</span>
                        <span className={styles.validationMessage}>{v.message}</span>
                      </div>
                    ))}
                  </div>
                )}

              {detailImportData.validationWarnings &&
                detailImportData.validationWarnings.length > 0 && (
                  <div className={styles.validationList}>
                    <p className={styles.validationWarningsTitle}>Validation Warnings:</p>
                    {detailImportData.validationWarnings.map((v, i) => (
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
                  onClick={() => handleCopyImportJson(detailImportData.reportJson)}
                >
                  <Copy size={14} />
                  {importDetailCopyStatus || 'Copy JSON'}
                </button>
                <button
                  className={styles.actionBtnSecondary}
                  onClick={() =>
                    handleDownloadImportJson(detailImportData.reportJson, detailImportData.id)
                  }
                >
                  <Download size={14} />
                  Download JSON
                </button>
              </div>

              <pre className={styles.modalDetailJson}>
                {JSON.stringify(detailImportData.reportJson, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value ?? '-'}</span>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  READY_FOR_AGENT: 'Ready For Agent',
  REVIEW_IMPORTED: 'Review Imported',
  HUMAN_REVIEW_REQUIRED: 'Human Review Required',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  BOOK_CREATED: 'Book Created',
  ARCHIVED: 'Archived',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={styles.statusBadge} data-status={status}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function ReviewImportStatusBadge({ status }: { status: string }) {
  return (
    <span className={styles.reviewImportBadge} data-status={status}>
      {status}
    </span>
  );
}
