import type { FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import styles from './ReadContentTab.module.scss';

interface ReadContentHeaderProps {
  count: number;
  onAddChapter: () => void;
  /** The chapter list is being refetched: the next number is not known yet */
  isAddLoading?: boolean;
}

export const ReadContentHeader: FC<ReadContentHeaderProps> = (props) => {
  const { count, onAddChapter, isAddLoading = false } = props;

  const title = count > 0 ? `Chapters (${count})` : 'Chapters';

  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      <Button onClick={onAddChapter} loading={isAddLoading}>
        + Add Chapter
      </Button>
    </div>
  );
};
