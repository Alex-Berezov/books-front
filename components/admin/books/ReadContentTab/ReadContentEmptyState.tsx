import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import styles from './ReadContentTab.module.scss';

interface ReadContentEmptyStateProps {
  onAddChapter: () => void;
}

export const ReadContentEmptyState: FC<ReadContentEmptyStateProps> = (props) => {
  const { onAddChapter } = props;

  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>📖</div>
      <p className={styles.emptyText}>No chapters yet. Start adding content to your book.</p>
      <Button onClick={onAddChapter}>Create First Chapter</Button>
    </div>
  );
};
