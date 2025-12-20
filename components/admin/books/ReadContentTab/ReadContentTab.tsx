'use client';

import type { FC } from 'react';
import { Modal } from '@/components/common/Modal';
import type { ReadContentTabProps } from './ReadContentTab.types';
import { ChapterModal } from './ChapterModal';
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
  const {
    chapters,
    isLoading,
    error,
    // Modal state
    isModalOpen,
    editingChapter,
    isDeleteModalOpen,
    nextChapterNumber,
    // Handlers
    handleAddChapter,
    handleEditChapter,
    handleDeleteChapter,
    handleCloseModal,
    handleSaveChapter,
    handleCloseDeleteModal,
    handleConfirmDelete,
    // Loading states
    isSubmitting,
    isDeleting,
  } = useReadContentTab(props);

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

  return (
    <div className={styles.container}>
      {chapters.length === 0 ? (
        <>
          <ReadContentHeader count={0} onAddChapter={handleAddChapter} />
          <ReadContentEmptyState onAddChapter={handleAddChapter} />
        </>
      ) : (
        <>
          <ReadContentHeader count={chapters.length} onAddChapter={handleAddChapter} />
          <ReadContentList
            chapters={chapters}
            onEditChapter={handleEditChapter}
            onDeleteChapter={handleDeleteChapter}
          />
        </>
      )}

      {/* Create/Edit Modal */}
      <ChapterModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSaveChapter}
        initialData={editingChapter}
        isSubmitting={isSubmitting}
        nextChapterNumber={nextChapterNumber}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        title="Delete Chapter"
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDeleteModal}
        isLoading={isDeleting}
      >
        <p>Are you sure you want to delete this chapter?</p>
        <p className={styles.warningText}>This action cannot be undone.</p>
      </Modal>
    </div>
  );
};
