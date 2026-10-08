import type { FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import styles from '../ReadContentTab/ReadContentTab.module.scss';

interface ListenContentEmptyStateProps {
  onUploadAudio: () => void;
  /** The chapter list is being refetched: the next number is not known yet */
  isAddLoading?: boolean;
}

export const ListenContentEmptyState: FC<ListenContentEmptyStateProps> = (props) => {
  const { onUploadAudio, isAddLoading = false } = props;

  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>🎧</div>
      <p className={styles.emptyText}>No audio chapters yet. Start by uploading audio files.</p>
      <Button onClick={onUploadAudio} loading={isAddLoading}>
        Upload Audio
      </Button>
    </div>
  );
};
