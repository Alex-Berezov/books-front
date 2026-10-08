import type { FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import styles from './ReadContentTab.module.scss';

interface ReadContentEmptyStateProps {
  onAddChapter: () => void;
  /** The chapter list is being refetched: the next number is not known yet */
  isAddLoading?: boolean;
}

export const ReadContentEmptyState: FC<ReadContentEmptyStateProps> = (props) => {
  const { onAddChapter, isAddLoading = false } = props;

  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>📖</div>
      <p className={styles.emptyText}>No chapters yet. Start adding content to your book.</p>
      <Button onClick={onAddChapter} loading={isAddLoading}>
        Create First Chapter
      </Button>
    </div>
  );
};
