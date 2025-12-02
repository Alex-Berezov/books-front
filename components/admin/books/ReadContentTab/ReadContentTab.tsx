'use client';

import type { FC } from 'react';
import type { ReadContentTabProps } from './ReadContentTab.types';
import { ReadContentEmptyState } from './ReadContentEmptyState';
import { ReadContentHeader } from './ReadContentHeader';
import { ReadContentList } from './ReadContentList';
import styles from './ReadContentTab.module.scss';
import { useReadContentTab } from './useReadContentTab';

/**
 * Tab for managing book text content
 *
 * Allows:
 * - View chapters list
 * - Create new chapters
 * - Edit existing chapters
 * - Delete chapters
 * - Sort chapters via drag-and-drop
 */
export const ReadContentTab: FC<ReadContentTabProps> = (props) => {
  const { chapters, isLoading, error, handleAddChapter, handleEditChapter, handleDeleteChapter } =
    useReadContentTab(props);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <p>Loading chapters...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <p className={styles.errorText}>Failed to load chapters: {error.message}</p>
      </div>
    );
  }

  // Empty state
  if (chapters.length === 0) {
    return (
      <div className={styles.container}>
        <ReadContentHeader count={0} onAddChapter={handleAddChapter} />
        <ReadContentEmptyState onAddChapter={handleAddChapter} />
      </div>
    );
  }

  // Chapters list
  return (
    <div className={styles.container}>
      <ReadContentHeader count={chapters.length} onAddChapter={handleAddChapter} />
      <ReadContentList
        chapters={chapters}
        onEditChapter={handleEditChapter}
        onDeleteChapter={handleDeleteChapter}
      />
    </div>
  );
};
