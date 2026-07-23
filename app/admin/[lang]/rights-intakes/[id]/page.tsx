'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, Archive, Send, Undo } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useRightsIntake,
  useChangeRightsIntakeStatus,
  useArchiveRightsIntake,
} from '@/api/hooks/useRightsIntakes';
import type { SupportedLang } from '@/lib/i18n/lang';
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

  const { data: intake, isLoading, error } = useRightsIntake(id);
  const changeStatusMutation = useChangeRightsIntakeStatus();
  const archiveMutation = useArchiveRightsIntake();

  const canMarkReady = intake?.workflowStatus === 'DRAFT';
  const canReturnToDraft = intake?.workflowStatus === 'READY_FOR_AGENT';
  const canArchive =
    intake?.workflowStatus === 'DRAFT' || intake?.workflowStatus === 'READY_FOR_AGENT';

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
            value={intake.targetLanguages.map((l) => LANG_LABELS[l] || l.toUpperCase()).join(', ')}
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
        <h2 className={styles.sectionTitle}>Next Phases</h2>
        <div className={styles.nextPhases}>
          <div className={styles.phasePlaceholder}>
            <span className={styles.phaseIcon}>📄</span>
            <span>Agent manifest export — not implemented yet</span>
          </div>
          <div className={styles.phasePlaceholder}>
            <span className={styles.phaseIcon}>📥</span>
            <span>Review import — not implemented yet</span>
          </div>
          <div className={styles.phasePlaceholder}>
            <span className={styles.phaseIcon}>📚</span>
            <span>Create book from approved clearance — not implemented yet</span>
          </div>
        </div>
      </div>

      <div className={styles.meta}>
        <span>Created: {new Date(intake.createdAt).toLocaleString()}</span>
        <span>Updated: {new Date(intake.updatedAt).toLocaleString()}</span>
        {intake.archivedAt && <span>Archived: {new Date(intake.archivedAt).toLocaleString()}</span>}
      </div>
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
