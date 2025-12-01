'use client';

import type { FC } from 'react';
import { Modal } from '@/components/common/Modal';
import type { DeleteBookModalProps } from './DeleteBookModal.types';
import styles from './DeleteBookModal.module.scss';

/**
 * Modal for book deletion confirmation
 *
 * Displays a warning modal asking for confirmation before deleting a book.
 * Shows the book title and warns that this action cannot be undone.
 *
 * @example
 * ```tsx
 * const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
 * const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null);
 *
 * <DeleteBookModal
 *   isOpen={isDeleteModalOpen}
 *   bookTitle={bookToDelete?.title || ''}
 *   onConfirm={() => handleDeleteBook(bookToDelete?.id)}
 *   onCancel={() => setIsDeleteModalOpen(false)}
 * />
 * ```
 */
export const DeleteBookModal: FC<DeleteBookModalProps> = (props) => {
  const { isOpen, bookTitle, isDeleting = false, onConfirm, onCancel } = props;

  return (
    <Modal
      isOpen={isOpen}
      title="Delete Book"
      confirmText="Delete"
      cancelText="Cancel"
      confirmVariant="danger"
      isLoading={isDeleting}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className={styles.content}>
        <p className={styles.warningText}>
          Are you sure you want to delete <strong>&quot;{bookTitle}&quot;</strong>?
        </p>
        <p className={styles.subText}>
          This will delete the book container and all its versions. This action cannot be undone.
        </p>
      </div>
    </Modal>
  );
};
