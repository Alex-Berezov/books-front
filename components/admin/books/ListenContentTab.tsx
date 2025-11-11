'use client';

import type { FC } from 'react';
import { useChapters } from '@/api/hooks';
import styles from './ReadContentTab.module.scss'; // Используем те же стили

/**
 * ListenContentTab component props
 */
export interface ListenContentTabProps {
  /** Book version ID */
  versionId: string;
}

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
  const { versionId } = props;

  // Load chapters (audio)
  const { data: chapters, error, isLoading } = useChapters(versionId);

  /**
   * Audio file upload handler
   */
  const handleUploadAudio = () => {
    // TODO (M3.2.3): Implement audio upload
    console.log('Upload audio for version:', versionId);
  };

  /**
   * Audio chapter creation handler
   */
  const handleAddAudioChapter = () => {
    // TODO (M3.2.3): Implement audio chapter creation
    console.log('Add audio chapter for version:', versionId);
  };

  /**
   * Audio chapter edit handler
   */
  const handleEditAudioChapter = (chapterId: string) => {
    // TODO (M3.2.3): Implement audio chapter editing
    console.log('Edit audio chapter:', chapterId);
  };

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

  // Filter only audio chapters
  const audioChapters = chapters?.filter((ch) => ch.audioUrl) || [];

  // Empty state
  if (audioChapters.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Audio Chapters</h2>
          <button className={styles.addButton} onClick={handleAddAudioChapter} type="button">
            + Add Audio Chapter
          </button>
        </div>

        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎧</div>
          <p className={styles.emptyText}>No audio chapters yet. Start by uploading audio files.</p>
          <button className={styles.addButton} onClick={handleUploadAudio} type="button">
            Upload Audio
          </button>
        </div>
      </div>
    );
  }

  // Audio chapters list
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Audio Chapters ({audioChapters.length})</h2>
        <button className={styles.addButton} onClick={handleAddAudioChapter} type="button">
          + Add Audio Chapter
        </button>
      </div>

      <div className={styles.chaptersList}>
        {audioChapters.map((chapter) => (
          <div key={chapter.id} className={styles.chapterItem}>
            <div className={styles.chapterInfo}>
              <div className={styles.chapterTitle}>
                {chapter.orderIndex}. {chapter.title || 'Untitled Audio Chapter'}
              </div>
              <div className={styles.chapterMeta}>
                {chapter.isFree ? '🆓 Free' : '🔒 Premium'}
                {chapter.duration && ` • ${Math.floor(chapter.duration / 60)} min`}
              </div>
            </div>

            <div className={styles.chapterActions}>
              <button
                className={styles.actionButton}
                onClick={() => handleEditAudioChapter(chapter.id)}
                type="button"
              >
                ✏️ Edit
              </button>
              <button className={styles.actionButton} type="button">
                🎵 Play
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
