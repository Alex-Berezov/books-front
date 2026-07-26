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
import type { SourceEdition } from '@/types/api-schema/rights-intake';
import styles from './RightsTab.module.scss';
import { RightsTabClaims } from './RightsTabClaims';
import { RightsTabEmptyState } from './RightsTabEmptyState';
import { RightsTabReviews } from './RightsTabReviews';
import { RightsTabSourceEdition } from './RightsTabSourceEdition';
import { RightsTabVersions } from './RightsTabVersions';

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

  const { book, currentVersion, versions, summary, currentProfile, reviewHistory } = dashboard;

  if (!summary.hasClearance && !book.rightsIntakeId && !book.currentRightsProfileId) {
    return <RightsTabEmptyState lang={lang} />;
  }

  const sourceEdition = (currentProfile?.sourceEdition as SourceEdition | null) || null;

  return (
    <div className={styles.rightsTabContainer}>
      {/* 1. Top Summary Strip */}
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

      {/* 2. Metrics Summary Grid */}
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

      {/* 3. Language Versions Overview */}
      <RightsTabVersions versions={versions} currentVersionId={currentVersion.id} lang={lang} />

      {/* 4. Publication Gate Panel */}
      <div className={styles.section}>
        <PublishPanel versionId={versionId} status={currentVersion.status as PublicationStatus} />
      </div>

      {/* 5. Rights Content Hash Panel */}
      <div className={styles.section}>
        <RightsContentHashPanel versionId={versionId} />
      </div>

      {/* 6. Source Edition & Legal Basis */}
      <RightsTabSourceEdition sourceEdition={sourceEdition} />

      {/* 7. Active Rights Profile (bound directly to current version) */}
      {currentProfile && <RightsProfilePanel profile={currentProfile} />}

      {/* 8. Review History */}
      <RightsTabReviews
        reviews={reviewHistory}
        approvedReviewId={currentVersion.approvedRightsReviewId || book.approvedRightsReviewId}
      />

      {/* 9. Approval Audit Trail */}
      {book.rightsIntakeId && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Approval Audit Trail</h2>
          <ApprovalHistory intakeId={book.rightsIntakeId} />
        </div>
      )}

      {/* 10. Copyright Claims & DMCA Placeholder */}
      <RightsTabClaims />
    </div>
  );
};
