'use client';

import type { FC } from 'react';
import type { ListenContentTabProps } from './ListenContentTab.types';
import { ListenContentEmptyState } from './ListenContentEmptyState';
import { ListenContentHeader } from './ListenContentHeader';
import { ListenContentList } from './ListenContentList';
import { useListenContentTab } from './useListenContentTab';
import styles from '../ReadContentTab/ReadContentTab.module.scss';

/**
 * Tab for managing book audio content
 *
 * Allows:
 * - View list of audio chapters
 * - Upload audio files
 * - Manage audio chapters
 * - Add transcripts for each chapter
 */
export const ListenContentTab: FC<ListenContentTabProps> = (props) => {
  const {
    audioChapters,
    isLoading,
    error,
    handleUploadAudio,
    handleAddAudioChapter,
    handleEditAudioChapter,
  } = useListenContentTab(props);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <p>Loading audio chapters...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <p className={styles.errorText}>Failed to load audio chapters: {error.message}</p>
      </div>
    );
  }

  // Empty state
  if (audioChapters.length === 0) {
    return (
      <div className={styles.container}>
        <ListenContentHeader count={0} onAddChapter={handleAddAudioChapter} />
        <ListenContentEmptyState onUploadAudio={handleUploadAudio} />
      </div>
    );
  }

  // Audio chapters list
  return (
    <div className={styles.container}>
      <ListenContentHeader count={audioChapters.length} onAddChapter={handleAddAudioChapter} />
      <ListenContentList chapters={audioChapters} onEditChapter={handleEditAudioChapter} />
    </div>
  );
};
