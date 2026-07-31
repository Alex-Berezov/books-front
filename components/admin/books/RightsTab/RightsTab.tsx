'use client';

import { type FC } from 'react';
import {
  CalendarClock,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Scale,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { useVersionRightsDashboard } from '@/api/hooks/useBookVersions';
import { BookVersionContributorsPanel } from '@/components/admin/books/BookVersionContributorsPanel/BookVersionContributorsPanel';
import { GeoBlockRulesPanel } from '@/components/admin/books/GeoBlockRulesPanel/GeoBlockRulesPanel';
import { LicenseCoveragePanel } from '@/components/admin/books/LicenseCoveragePanel/LicenseCoveragePanel';
import { PublishPanel } from '@/components/admin/books/PublishPanel/PublishPanel';
import { RightsClaimsPanel } from '@/components/admin/books/RightsClaimsPanel/RightsClaimsPanel';
import { RightsContentHashPanel } from '@/components/admin/books/RightsContentHashPanel/RightsContentHashPanel';
import { RightsRecheckPanel } from '@/components/admin/books/RightsRecheckPanel/RightsRecheckPanel';
import { ApprovalHistory } from '@/components/admin/RightsIntakeDetail/ApprovalHistory/ApprovalHistory';
import { RightsProfilePanel } from '@/components/admin/RightsIntakeDetail/RightsProfilePanel/RightsProfilePanel';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicationStatus } from '@/types/api-schema';
import type { SourceEdition } from '@/types/api-schema/rights-intake';
import styles from './RightsTab.module.scss';
import { RightsTabEmptyState } from './RightsTabEmptyState';
import { RightsTabLawyer } from './RightsTabLawyer';
import { RightsTabReviews } from './RightsTabReviews';
import { RightsTabSourceEdition } from './RightsTabSourceEdition';
import { RightsTabVersions } from './RightsTabVersions';

export interface RightsTabProps {
  versionId: string;
  bookId: string;
  lang: SupportedLang;
}

export const RightsTab: FC<RightsTabProps> = ({ versionId, bookId, lang }) => {
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

          {currentVersion.rightsClaimBlockActive && (
            <span className={styles.badge} data-status="BLOCK">
              <ShieldAlert size={14} />
              Claim block active
            </span>
          )}

          {/* Phase 18: overdue wins over merely due — only one recheck badge is shown. */}
          {(summary.overdueRecheckTasksCount ?? 0) > 0 ? (
            <span className={styles.badge} data-status="BLOCK">
              <CalendarClock size={14} />
              Recheck overdue: {summary.overdueRecheckTasksCount}
            </span>
          ) : (
            (summary.openRecheckTasksCount ?? 0) > 0 && (
              <span className={styles.badge} data-status="STALE">
                <CalendarClock size={14} />
                Recheck due: {summary.openRecheckTasksCount}
              </span>
            )
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
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Contributors</span>
          <span className={styles.metricValue}>{summary.contributorsCount ?? 0}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Authors / Translators / Narrators</span>
          <span className={styles.metricValue}>
            {summary.authorsCount ?? 0} / {summary.translatorsCount ?? 0} /{' '}
            {summary.narratorsCount ?? 0}
          </span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Licenses</span>
          <span className={styles.metricValue}>{summary.licensesCount ?? 0}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Coverage</span>
          <span className={styles.metricValue}>{summary.licenseCoverageStatus ?? '—'}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Expiring</span>
          <span className={styles.metricValue}>{summary.expiringSoonLicensesCount ?? 0}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Active Claims</span>
          <span className={styles.metricValue}>{summary.activeClaimsCount ?? 0}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Blocking Claims</span>
          <span className={styles.metricValue}>{summary.blockingClaimsCount ?? 0}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Claim Blocks</span>
          <span className={styles.metricValue}>{summary.activeClaimBlocksCount ?? 0}</span>
        </div>
      </div>

      {/* 3. Book Version Contributors Management */}
      <div className={styles.section}>
        <BookVersionContributorsPanel versionId={versionId} />
      </div>

      {/* 4. Language Versions Overview */}
      <RightsTabVersions versions={versions} currentVersionId={currentVersion.id} lang={lang} />

      {/* 4. Runtime GeoIP enforcement */}
      {(currentVersion.rightsGeoBlockRequired || summary.blockedCountriesCount > 0) && (
        <div className={styles.section}>
          <GeoBlockRulesPanel versionId={versionId} countrySource={dashboard.geoCountrySource} />
        </div>
      )}

      {/* 4b. License coverage of the markets that require a license */}
      {(summary.licenseRequiredCountriesCount > 0 || (summary.licensesCount ?? 0) > 0) && (
        <div className={styles.section}>
          <LicenseCoveragePanel versionId={versionId} />
        </div>
      )}

      {/* 5. Publication Gate Panel */}
      <div className={styles.section}>
        <PublishPanel versionId={versionId} status={currentVersion.status as PublicationStatus} />
      </div>

      {/* 5. Rights Content Hash Panel */}
      <div className={styles.section}>
        <RightsContentHashPanel versionId={versionId} />
      </div>

      {/* 5b. Automatic recheck tasks (Phase 18) — sits next to the content-hash block by design */}
      <div className={styles.section}>
        <RightsRecheckPanel versionId={versionId} />
      </div>

      {/* 5c. Legal review (Phase 19) — right after recheck, before the source edition */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Юридическая проверка</h3>
        <RightsTabLawyer versionId={versionId} />
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

      {/* 10. Copyright Claims & DMCA */}
      <div className={styles.section}>
        <RightsClaimsPanel bookId={bookId} versionId={versionId} />
      </div>
    </div>
  );
};
