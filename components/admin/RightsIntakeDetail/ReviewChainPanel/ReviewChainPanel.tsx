'use client';

import { Fragment, type FC } from 'react';
import { useReviewChain } from '@/api/hooks/useRightsRecheck';
import type { RightsReviewChainItem } from '@/types/api-schema/rights-recheck';
import styles from './ReviewChainPanel.module.scss';

export interface ReviewChainPanelProps {
  intakeId: string;
}

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString() : '—';

/** Human-readable list of what changed between two neighbouring revisions. */
const diffLabels = (previous: RightsReviewChainItem, current: RightsReviewChainItem): string[] => {
  const diff = current.diffFromPrevious;
  if (!diff) return [];

  const labels: string[] = [];
  if (diff.overallStatusChanged) {
    labels.push(`Общий статус: ${previous.overallStatus} → ${current.overallStatus}`);
  }
  if (diff.publicationGateChanged) {
    labels.push(`Publication gate: ${previous.publicationGate} → ${current.publicationGate}`);
  }
  if (diff.confidenceChanged) {
    labels.push(`Уверенность: ${previous.confidence} → ${current.confidence}`);
  }
  if (diff.changedCountryCount > 0) {
    labels.push(`Изменено стран: ${diff.changedCountryCount}`);
  }
  return labels;
};

export const ReviewChainPanel: FC<ReviewChainPanelProps> = ({ intakeId }) => {
  const chainQuery = useReviewChain(intakeId);
  const items = chainQuery.data?.items ?? [];

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>История проверок</h2>
      <p className={styles.sectionHint}>
        Каждая новая проверка связывается с предыдущей через <code>previousReviewId</code>, поэтому
        видно, что изменилось между ревизиями clearance.
      </p>

      {items.length === 0 ? (
        <p className={styles.emptyState}>Проверок по этому интейку пока нет.</p>
      ) : (
        <>
          {items.length === 1 && (
            <p className={styles.sectionHint}>Проверка ещё не перепроверялась — это ревизия №1.</p>
          )}
          <ul className={styles.chain}>
            {items.map((item, index) => {
              const previous = index > 0 ? items[index - 1] : null;
              const labels = previous ? diffLabels(previous, item) : [];

              return (
                <Fragment key={item.id}>
                  {labels.length > 0 && (
                    <li className={styles.diff}>
                      {labels.map((label) => (
                        <span key={label} className={styles.diffItem}>
                          {label}
                        </span>
                      ))}
                    </li>
                  )}
                  <li className={item.isCurrent ? styles.revisionCurrent : styles.revision}>
                    <div className={styles.revisionHeader}>
                      <span className={styles.revisionNumber}>#{item.revisionNumber}</span>
                      <span className={styles.badge} data-status={item.status}>
                        {item.status}
                      </span>
                      <span className={styles.badge}>{item.overallStatus}</span>
                      <span className={styles.badge}>gate: {item.publicationGate}</span>
                      <span className={styles.badge}>confidence: {item.confidence}</span>
                      {item.isCurrent && <span className={styles.badge}>текущая</span>}
                    </div>
                    <p className={styles.revisionMeta}>
                      Утверждено: {formatDate(item.approvedAt)}
                      {item.approvedByUserName ? ` · ${item.approvedByUserName}` : ''} · следующая
                      проверка: {formatDate(item.nextReviewAt)} · создана{' '}
                      {formatDate(item.createdAt)}
                    </p>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};
