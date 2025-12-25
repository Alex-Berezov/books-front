'use client';

import type { FC } from 'react';
import { Modal } from '@/components/common/Modal';
import type { DeleteTagModalProps } from './DeleteTagModal.types';
import styles from './DeleteTagModal.module.scss';

export const DeleteTagModal: FC<DeleteTagModalProps> = (props) => {
  const { isOpen, tagName, isDeleting = false, onConfirm, onCancel } = props;

  return (
    <Modal
      isOpen={isOpen}
      title="Delete Tag"
      confirmText="Delete"
      cancelText="Cancel"
      confirmVariant="danger"
      isLoading={isDeleting}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className={styles.content}>
        <p className={styles.warningText}>
          Are you sure you want to delete <strong>&quot;{tagName}&quot;</strong>?
        </p>
        <p className={styles.subText}>
          This will delete the tag. If there are books associated with this tag, they will be
          detached. This action cannot be undone.
        </p>
      </div>
    </Modal>
  );
};
