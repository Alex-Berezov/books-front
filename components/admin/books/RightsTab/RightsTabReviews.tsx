'use client';

import type { FC } from 'react';
import { History, CheckCircle2 } from 'lucide-react';
import type { BookRightsDashboardReview } from '@/types/api-schema';
import styles from './RightsTab.module.scss';

interface RightsTabReviewsProps {
  reviews: BookRightsDashboardReview[];
  approvedReviewId: string | null;
}

export const RightsTabReviews: FC<RightsTabReviewsProps> = ({ reviews, approvedReviewId }) => {
  if (!reviews || reviews.length === 0) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <History size={18} />
          Review History
        </h2>
        <p className={styles.mutedText}>No expert reviews recorded yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <History size={18} />
        Review History ({reviews.length})
      </h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Review ID</th>
              <th>Overall Status</th>
              <th>Gate Recommendation</th>
              <th>Confidence</th>
              <th>Reviewer</th>
              <th>Approved</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => {
              const isApproved = r.id === approvedReviewId;
              return (
                <tr key={r.id} className={isApproved ? styles.activeRow : ''}>
                  <td>
                    <code>{r.id.substring(0, 8)}...</code>
                  </td>
                  <td>
                    <span className={styles.badge} data-status={r.overallStatus}>
                      {r.overallStatus}
                    </span>
                  </td>
                  <td>
                    <span className={styles.badge} data-status={r.publicationGate}>
                      {r.publicationGate}
                    </span>
                  </td>
                  <td>{r.confidence}</td>
                  <td>{r.reviewerType}</td>
                  <td>
                    {isApproved ? (
                      <span className={styles.badge} data-status="APPROVED">
                        <CheckCircle2 size={12} /> Approved
                      </span>
                    ) : (
                      <span className={styles.mutedText}>Historical</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
