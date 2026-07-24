/**
 * Modal for creating a new book
 *
 * Books are now created from approved rights intakes.
 * This modal redirects to the rights intakes creation page.
 */

'use client';

import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/common/Modal';
import type { CreateBookModalProps } from './CreateBookModal.types';
import styles from './CreateBookModal.module.scss';

export const CreateBookModal: FC<CreateBookModalProps> = (props) => {
  const { isOpen, onClose, lang } = props;
  const router = useRouter();

  const handleStartRightsIntake = () => {
    onClose();
    router.push(`/admin/${lang}/rights-intakes/new`);
  };

  const handleConfirm = () => {
    handleStartRightsIntake();
  };

  return (
    <Modal
      confirmText="Start Rights Intake"
      confirmVariant="primary"
      isOpen={isOpen}
      title="Create New Book"
      onCancel={onClose}
      onConfirm={handleConfirm}
    >
      <div className={styles.redirectContainer}>
        <p className={styles.redirectText}>
          Books are created from approved rights intakes. Start a new rights intake to begin the
          process of clearing rights and creating a book.
        </p>
      </div>
    </Modal>
  );
};
