import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import styles from './ReadContentTab.module.scss';

interface ReadContentHeaderProps {
  count: number;
  onAddChapter: () => void;
}

export const ReadContentHeader: FC<ReadContentHeaderProps> = (props) => {
  const { count, onAddChapter } = props;

  const title = count > 0 ? `Chapters (${count})` : 'Chapters';

  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      <Button onClick={onAddChapter}>+ Add Chapter</Button>
    </div>
  );
};
