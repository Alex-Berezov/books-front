'use client';

import type { FC } from 'react';
import { Modal } from '@/components/common/Modal';
import type { DeleteCategoryModalProps } from './DeleteCategoryModal.types';
import styles from './DeleteCategoryModal.module.scss';

/**
 * Modal for category deletion confirmation
 *
 * Displays a warning modal asking for confirmation before deleting a category.
 * Shows the category name and warns that this action cannot be undone.
 */
export const DeleteCategoryModal: FC<DeleteCategoryModalProps> = (props) => {
  const { isOpen, categoryName, isDeleting = false, onConfirm, onCancel } = props;

  return (
    <Modal
      isOpen={isOpen}
      title="Delete Category"
      confirmText="Delete"
      cancelText="Cancel"
      confirmVariant="danger"
      isLoading={isDeleting}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className={styles.content}>
        <p className={styles.warningText}>
          Are you sure you want to delete <strong>&quot;{categoryName}&quot;</strong>?
        </p>
        <p className={styles.subText}>
          This will delete the category. If there are books associated with this category, they will
          be detached. This action cannot be undone.
        </p>
      </div>
    </Modal>
  );
};
