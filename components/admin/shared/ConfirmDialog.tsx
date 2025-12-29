import type { FC } from 'react';
import { Modal } from '@/components/common/Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: FC<ConfirmDialogProps> = (props) => {
  const {
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDestructive = false,
    isLoading = false,
    onConfirm,
    onCancel,
  } = props;

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      confirmText={confirmLabel}
      cancelText={cancelLabel}
      confirmVariant={isDestructive ? 'danger' : 'primary'}
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
      size="sm"
    >
      <p>{message}</p>
    </Modal>
  );
};
