import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import styles from '../ReadContentTab/ReadContentTab.module.scss';

interface ListenContentHeaderProps {
  count: number;
  onAddChapter: () => void;
  /** The chapter list is being refetched: the next number is not known yet */
  isAddLoading?: boolean;
}

export const ListenContentHeader: FC<ListenContentHeaderProps> = (props) => {
  const { count, onAddChapter, isAddLoading = false } = props;

  return (
    <div className={styles.header}>
      <h2 className={styles.title}>Audio Chapters ({count})</h2>
      <Button onClick={onAddChapter} loading={isAddLoading}>
        + Add Audio Chapter
      </Button>
    </div>
  );
};
