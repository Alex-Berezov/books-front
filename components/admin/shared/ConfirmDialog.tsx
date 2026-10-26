import type { FC } from 'react';
import { Modal } from '@/components/admin/common/Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  /** Подтверждать нечего (например, цена не пришла): кнопка подтверждения неактивна. */
  isConfirmDisabled?: boolean;
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
    isConfirmDisabled = false,
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
      isConfirmDisabled={isConfirmDisabled}
      onConfirm={onConfirm}
      onCancel={onCancel}
      size="sm"
    >
      <p>{message}</p>
    </Modal>
  );
};
