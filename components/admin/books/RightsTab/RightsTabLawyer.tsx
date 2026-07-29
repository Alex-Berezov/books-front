'use client';

import { useState, type FC } from 'react';
import { Scale } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useVersionLawyerReview } from '@/api/hooks/useRightsLawyer';
import {
  LAWYER_CONDITION_STATUS_LABELS,
  LAWYER_REVIEW_STATUS_COLORS,
  LAWYER_REVIEW_STATUS_LABELS,
  RISK_LEVEL_COLORS,
  RISK_LEVEL_LABELS,
  lawyerGateCodeLabel,
} from '@/components/admin/rights-lawyer/lawyerLabels';
import { LawyerReviewDrawer } from '@/components/admin/rights-lawyer/LawyerReviewDrawer/LawyerReviewDrawer';
import styles from './RightsTab.module.scss';

export interface RightsTabLawyerProps {
  versionId: string;
}

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString() : '—';

/** Legal review section of the book rights tab (Phase 19). */
export const RightsTabLawyer: FC<RightsTabLawyerProps> = ({ versionId }) => {
  const { data: session } = useSession();
  const roles = session?.user?.roles ?? [];
  const isAdmin = roles.includes('admin');
  const isStaff = isAdmin || roles.includes('content_manager');
  const canDecide = isAdmin || roles.includes('lawyer');

  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const versionQuery = useVersionLawyerReview(versionId);
  const data = versionQuery.data ?? null;

  if (versionQuery.isLoading) {
    return <p className={styles.emptyText}>Загрузка юридического состояния…</p>;
  }

  if (!data || (!data.lawyerReviewRequired && data.reviews.length === 0)) {
    return (
      <p className={styles.emptyText}>
        <Scale size={14} /> Юридическая проверка для этой версии не требуется.
      </p>
    );
  }

  return (
    <div>
      <div className={styles.badgeRow}>
        {data.riskLevel && (
          <span className={styles.lawyerBadge} data-tone={RISK_LEVEL_COLORS[data.riskLevel]}>
            {RISK_LEVEL_LABELS[data.riskLevel]}
          </span>
        )}
        <span className={styles.lawyerBadge} data-tone={data.lawyerApproved ? 'green' : 'orange'}>
          {data.lawyerApproved ? 'Юрист согласовал' : 'Заключения юриста нет'}
        </span>
        {data.lawyerApprovedLawyerName && (
          <span className={styles.lawyerBadge}>{data.lawyerApprovedLawyerName}</span>
        )}
        {data.lawyerOpinionValidUntil && (
          <span className={styles.lawyerBadge} data-tone={data.isExpiringSoon ? 'orange' : 'blue'}>
            действует до {formatDate(data.lawyerOpinionValidUntil)}
          </span>
        )}
      </div>

      {data.blockers.length > 0 && (
        <ul className={styles.lawyerList}>
          {data.blockers.map((blocker) => (
            <li key={`${blocker.code}-${blocker.lawyerReviewId ?? 'none'}`}>
              <strong>{lawyerGateCodeLabel(blocker.code)}</strong> — {blocker.messageRu}
            </li>
          ))}
        </ul>
      )}

      {data.pendingConditions.length > 0 && (
        <ul className={styles.lawyerList}>
          {data.pendingConditions.map((condition) => (
            <li key={condition.id}>
              {condition.code}: {condition.textRu} (
              {LAWYER_CONDITION_STATUS_LABELS[condition.status]})
            </li>
          ))}
        </ul>
      )}

      {data.reviews.length > 0 && (
        <ul className={styles.lawyerList}>
          {data.reviews.map((review) => (
            <li key={review.id}>
              <button
                type="button"
                className={styles.lawyerLink}
                onClick={() => setActiveReviewId(review.id)}
              >
                {review.reviewNumber}
              </button>{' '}
              <span
                className={styles.lawyerBadge}
                data-tone={LAWYER_REVIEW_STATUS_COLORS[review.effectiveStatus]}
              >
                {LAWYER_REVIEW_STATUS_LABELS[review.effectiveStatus]}
              </span>{' '}
              {review.lawyerNameSnapshot ?? review.assignedLawyerName ?? '—'}
            </li>
          ))}
        </ul>
      )}

      <LawyerReviewDrawer
        reviewId={activeReviewId}
        onClose={() => setActiveReviewId(null)}
        isStaff={isStaff}
        isAdmin={isAdmin}
        canDecide={canDecide}
      />
    </div>
  );
};
