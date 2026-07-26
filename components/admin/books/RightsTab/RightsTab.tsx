'use client';

import { type FC } from 'react';
import { ExternalLink, ShieldCheck, Scale, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useVersionRightsDashboard } from '@/api/hooks/useBookVersions';
import { PublishPanel } from '@/components/admin/books/PublishPanel/PublishPanel';
import { RightsContentHashPanel } from '@/components/admin/books/RightsContentHashPanel/RightsContentHashPanel';
import { ApprovalHistory } from '@/components/admin/RightsIntakeDetail/ApprovalHistory/ApprovalHistory';
import { RightsProfilePanel } from '@/components/admin/RightsIntakeDetail/RightsProfilePanel/RightsProfilePanel';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicationStatus } from '@/types/api-schema';
import styles from './RightsTab.module.scss';
import { RightsTabEmptyState } from './RightsTabEmptyState';

export interface RightsTabProps {
  versionId: string;
  bookId: string;
  lang: SupportedLang;
}

export const RightsTab: FC<RightsTabProps> = ({ versionId, lang }) => {
  const { data: dashboard, isLoading, isError, refetch } = useVersionRightsDashboard(versionId);

  if (isLoading) {
    return (
      <div className={styles.spinner}>
        <span>Loading rights dashboard...</span>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className={styles.emptyState}>
        <AlertTriangle size={48} className={styles.emptyIcon} />
        <h3 className={styles.emptyTitle}>Failed to load rights dashboard</h3>
        <button onClick={() => refetch()} className={styles.intakeLinkBtn}>
          Retry Loading
        </button>
      </div>
    );
  }

  const { book, currentVersion, summary, intake } = dashboard;

  if (!summary.hasClearance && !book.rightsIntakeId && !book.currentRightsProfileId) {
    return <RightsTabEmptyState lang={lang} />;
  }

  return (
    <div className={styles.rightsTabContainer}>
      {/* Top summary strip */}
      <div className={styles.summaryStrip}>
        <div className={styles.summaryBadges}>
          <span
            className={styles.badge}
            data-status={summary.canPublishCurrentVersion ? 'ALLOW' : 'BLOCK'}
          >
            {summary.canPublishCurrentVersion ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            Gate:{' '}
            {summary.publicationGate || (summary.canPublishCurrentVersion ? 'ALLOW' : 'BLOCK')}
          </span>

          <span className={styles.badge} data-status={summary.overallStatus || 'UNKNOWN'}>
            <ShieldCheck size={14} />
            Clearance: {summary.overallStatus || 'No profile'}
          </span>

          <span className={styles.badge} data-status={summary.confidence || 'MEDIUM'}>
            <Scale size={14} />
            Confidence: {summary.confidence || 'MEDIUM'}
          </span>

          {summary.isStale && (
            <span className={styles.badge} data-status="STALE">
              Stale / Hash Mismatch
            </span>
          )}
        </div>

        {book.rightsIntakeId && (
          <Link
            href={`/admin/${lang}/rights-intakes/${book.rightsIntakeId}`}
            className={styles.intakeLinkBtn}
          >
            <ExternalLink size={16} />
            Open Rights Intake
          </Link>
        )}
      </div>

      {/* Metrics Summary Grid */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Blocked Countries</span>
          <span className={styles.metricValue}>{summary.blockedCountriesCount}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>License Required</span>
          <span className={styles.metricValue}>{summary.licenseRequiredCountriesCount}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Pending Countries</span>
          <span className={styles.metricValue}>{summary.pendingCountriesCount}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Geo-block Required</span>
          <span className={styles.metricValue}>{summary.geoBlockRequiredCount}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Blocking Actions</span>
          <span className={styles.metricValue}>{summary.unresolvedBlockingActionsCount}</span>
        </div>
      </div>

      {/* Publication Gate Panel */}
      <div className={styles.section}>
        <PublishPanel versionId={versionId} status={currentVersion.status as PublicationStatus} />
      </div>

      {/* Rights Content Hash Panel */}
      <div className={styles.section}>
        <RightsContentHashPanel versionId={versionId} />
      </div>

      {/* Rights Profile Panel (Territories, Components, Evidence, Actions) */}
      {book.rightsIntakeId && (
        <RightsProfilePanel
          intakeId={book.rightsIntakeId}
          workflowStatus={intake?.workflowStatus || 'APPROVED'}
          reviewImports={[]}
        />
      )}

      {/* Approval Audit Trail */}
      {book.rightsIntakeId && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Approval Audit Trail</h2>
          <ApprovalHistory intakeId={book.rightsIntakeId} />
        </div>
      )}
    </div>
  );
};
