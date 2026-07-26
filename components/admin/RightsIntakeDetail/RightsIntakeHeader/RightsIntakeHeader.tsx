'use client';

import type { FC } from 'react';
import { ArrowLeft, Pencil, Send, Undo, Archive, BookOpen } from 'lucide-react';
import Link from 'next/link';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { RightsIntake } from '@/types/api-schema/rights-intake';
import styles from './RightsIntakeHeader.module.scss';

interface RightsIntakeHeaderProps {
  intake: RightsIntake;
  lang: SupportedLang;
  onEdit?: () => void;
  onMarkReady?: () => void;
  onReturnToDraft?: () => void;
  onArchive?: () => void;
  isPendingStatusChange?: boolean;
  isPendingArchive?: boolean;
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

export const RightsIntakeHeader: FC<RightsIntakeHeaderProps> = ({
  intake,
  lang,
  onEdit,
  onMarkReady,
  onReturnToDraft,
  onArchive,
  isPendingStatusChange = false,
  isPendingArchive = false,
}) => {
  const editableStatuses = ['DRAFT', 'READY_FOR_AGENT'];
  const canEdit = editableStatuses.includes(intake.workflowStatus);
  const canMarkReady = intake.workflowStatus === 'DRAFT';
  const canReturnToDraft = intake.workflowStatus === 'READY_FOR_AGENT';
  const canArchive = ['DRAFT', 'READY_FOR_AGENT'].includes(intake.workflowStatus);

  return (
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
          {canEdit && onEdit && (
            <button className={styles.actionBtnSecondary} onClick={onEdit}>
              <Pencil size={16} />
              Edit
            </button>
          )}

          {canMarkReady && onMarkReady && (
            <button
              className={styles.actionBtnPrimary}
              onClick={onMarkReady}
              disabled={isPendingStatusChange}
            >
              <Send size={16} />
              {isPendingStatusChange ? 'Updating...' : 'Mark Ready For Agent'}
            </button>
          )}

          {canReturnToDraft && onReturnToDraft && (
            <button
              className={styles.actionBtnSecondary}
              onClick={onReturnToDraft}
              disabled={isPendingStatusChange}
            >
              <Undo size={16} />
              Return To Draft
            </button>
          )}

          {canArchive && onArchive && (
            <button
              className={styles.actionBtnDanger}
              onClick={onArchive}
              disabled={isPendingArchive}
            >
              <Archive size={16} />
              {isPendingArchive ? 'Archiving...' : 'Archive'}
            </button>
          )}

          {intake.createdBookId && (
            <Link
              href={`/admin/${lang}/books/${intake.createdBookId}`}
              className={styles.actionBtnPrimary}
            >
              <BookOpen size={16} />
              Open Book
            </Link>
          )}
        </div>
      </div>

      <div className={styles.statusBar}>
        <span>Status:</span>
        <span className={styles.statusBadge} data-status={intake.workflowStatus}>
          {STATUS_LABELS[intake.workflowStatus] || intake.workflowStatus}
        </span>
      </div>
    </div>
  );
};
