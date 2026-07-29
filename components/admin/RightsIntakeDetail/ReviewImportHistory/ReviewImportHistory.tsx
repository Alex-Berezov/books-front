'use client';

import { useState, type FC } from 'react';
import { getRightsReviewImport } from '@/api/endpoints/admin/rights-intakes';
import type {
  RightsReviewImportListItem,
  RightsReviewImportDetail,
} from '@/types/api-schema/rights-intake';
import styles from './ReviewImportHistory.module.scss';
import { ReviewImportDetailModal } from '../ReviewImportDetailModal/ReviewImportDetailModal';

interface ReviewImportHistoryProps {
  reviewImports: RightsReviewImportListItem[];
}

export const ReviewImportHistory: FC<ReviewImportHistoryProps> = ({ reviewImports }) => {
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailImportData, setDetailImportData] = useState<RightsReviewImportDetail | null>(null);

  const handleViewDetail = async (importId: string) => {
    try {
      const data = await getRightsReviewImport(importId);
      setDetailImportData(data);
      setDetailModalOpen(true);
    } catch {
      setDetailImportData(null);
    }
  };

  if (reviewImports.length === 0) return null;

  return (
    <div className={styles.importHistory} id="review-import-history">
      <h3 className={styles.importHistoryTitle}>Import History</h3>
      <div className={styles.importHistoryList}>
        {reviewImports.map((item) => (
          <div
            key={item.id}
            className={styles.importHistoryItem}
            onClick={() => handleViewDetail(item.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleViewDetail(item.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className={styles.importHistoryItemLeft}>
              <span className={styles.reviewImportBadge} data-status={item.importStatus}>
                {item.importStatus}
              </span>
              {item.isCurrent && <span className={styles.currentBadge}>Current</span>}
              {item.sourceFileName && (
                <span className={styles.fileName}>{item.sourceFileName}</span>
              )}
              <span className={styles.importHistoryDate}>
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className={styles.importHistoryItemRight}>
              <span className={styles.importIssueCount}>
                {item.validationErrorsCount > 0 && (
                  <span className={styles.errorCount}>{item.validationErrorsCount} errors</span>
                )}
                {item.validationWarningsCount > 0 && (
                  <span className={styles.warningCount}>
                    {item.validationWarningsCount} warnings
                  </span>
                )}
                {item.validationErrorsCount === 0 && item.validationWarningsCount === 0 && (
                  <span className={styles.cleanLabel}>Clean</span>
                )}
              </span>
              <span className={styles.viewDetailArrow}>→</span>
            </div>
          </div>
        ))}
      </div>

      {detailModalOpen && detailImportData && (
        <ReviewImportDetailModal
          importData={detailImportData}
          onClose={() => setDetailModalOpen(false)}
        />
      )}
    </div>
  );
};
