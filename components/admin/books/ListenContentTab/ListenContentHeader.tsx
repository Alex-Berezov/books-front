import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import styles from '../ReadContentTab/ReadContentTab.module.scss';

interface ListenContentHeaderProps {
  count: number;
  onAddChapter: () => void;
}

export const ListenContentHeader: FC<ListenContentHeaderProps> = ({ count, onAddChapter }) => {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>Audio Chapters ({count})</h2>
      <Button onClick={onAddChapter}>+ Add Audio Chapter</Button>
    </div>
  );
};
