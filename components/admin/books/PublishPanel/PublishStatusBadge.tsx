import type { FC } from 'react';
import type { PublicationStatus } from '@/types/api-schema';
import styles from './PublishPanel.module.scss';

interface PublishStatusBadgeProps {
  status: PublicationStatus;
  isPublished: boolean;
  isDraft: boolean;
  isArchived: boolean;
}

export const PublishStatusBadge: FC<PublishStatusBadgeProps> = ({
  status,
  isPublished,
  isDraft,
  isArchived,
}) => {
  return (
    <div className={styles.statusSection}>
      <div className={styles.statusLabel}>Current Status:</div>
      <div className={`${styles.statusBadge} ${styles[status]}`}>
        {isPublished && '✓ Published'}
        {isDraft && '○ Draft'}
        {isArchived && '📦 Archived'}
      </div>
    </div>
  );
};
