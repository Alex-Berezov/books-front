import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import styles from '../ReadContentTab/ReadContentTab.module.scss';

interface ListenContentEmptyStateProps {
  onUploadAudio: () => void;
}

export const ListenContentEmptyState: FC<ListenContentEmptyStateProps> = ({ onUploadAudio }) => {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>🎧</div>
      <p className={styles.emptyText}>No audio chapters yet. Start by uploading audio files.</p>
      <Button onClick={onUploadAudio}>Upload Audio</Button>
    </div>
  );
};
