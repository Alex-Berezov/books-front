import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import styles from './PublishPanel.module.scss';

interface PublishConfirmModalProps {
  isOpen: boolean;
  actionType: 'publish' | 'unpublish';
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const PublishConfirmModal: FC<PublishConfirmModalProps> = ({
  isOpen,
  actionType,
  isLoading,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {actionType === 'publish' ? 'Publish Version' : 'Unpublish Version'}
          </h3>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.modalText}>
            {actionType === 'publish'
              ? 'Are you sure you want to publish this version? It will become publicly visible to all users.'
              : 'Are you sure you want to unpublish this version? It will no longer be visible to users.'}
          </p>
        </div>

        <div className={styles.modalActions}>
          <Button variant="secondary" disabled={isLoading} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={actionType === 'publish' ? 'success' : 'warning'}
            loading={isLoading}
            onClick={onConfirm}
          >
            {actionType === 'publish' ? 'Publish' : 'Unpublish'}
          </Button>
        </div>
      </div>
    </div>
  );
};
