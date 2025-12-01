import type { FC } from 'react';
import styles from '../ReadContentTab/ReadContentTab.module.scss';

interface ListenContentHeaderProps {
  count: number;
  onAddChapter: () => void;
}

export const ListenContentHeader: FC<ListenContentHeaderProps> = ({ count, onAddChapter }) => {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>Audio Chapters ({count})</h2>
      <button className={styles.addButton} onClick={onAddChapter} type="button">
        + Add Audio Chapter
      </button>
    </div>
  );
};
