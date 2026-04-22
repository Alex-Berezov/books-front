'use client';

import type { FC } from 'react';
import { Modal } from '@/components/common/Modal';
import type { ListenContentTabProps } from './ListenContentTab.types';
import { AudioChapterModal } from './AudioChapterModal';
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
    isModalOpen,
    editingChapter,
    isDeleteModalOpen,
    nextChapterNumber,
    totalDurationSeconds,
    handleUploadAudio,
    handleAddAudioChapter,
    handleEditAudioChapter,
    handleDeleteAudioChapter,
    handleCloseModal,
    handleSaveAudioChapter,
    handleCloseDeleteModal,
    handleConfirmDelete,
    isSubmitting,
    isDeleting,
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

  return (
    <div className={styles.container}>
      {audioChapters.length === 0 ? (
        <>
          <ListenContentHeader count={0} onAddChapter={handleAddAudioChapter} />
          <ListenContentEmptyState onUploadAudio={handleUploadAudio} />
        </>
      ) : (
        <>
          <ListenContentHeader count={audioChapters.length} onAddChapter={handleAddAudioChapter} />
          <ListenContentList
            chapters={audioChapters}
            totalDurationSeconds={totalDurationSeconds}
            onEditChapter={handleEditAudioChapter}
            onDeleteChapter={handleDeleteAudioChapter}
          />
        </>
      )}

      {/* Create / Edit Modal */}
      <AudioChapterModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSaveAudioChapter}
        initialData={editingChapter}
        isSubmitting={isSubmitting}
        nextChapterNumber={nextChapterNumber}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        title="Delete Audio Chapter"
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDeleteModal}
        isLoading={isDeleting}
      >
        <p>Are you sure you want to delete this audio chapter?</p>
        <p className={styles.warningText}>This action cannot be undone.</p>
      </Modal>
    </div>
  );
};
