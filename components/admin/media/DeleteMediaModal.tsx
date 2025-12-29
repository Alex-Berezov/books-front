import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';

interface DeleteMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fileName?: string;
  isDeleting?: boolean;
}

export const DeleteMediaModal: FC<DeleteMediaModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  fileName,
  isDeleting,
}) => {
  return (
    <Modal isOpen={isOpen} onCancel={onClose} title="Delete File" size="sm" showFooter={false}>
      <div className="flex flex-col gap-4">
        <p>
          Are you sure you want to delete <strong>{fileName}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={isDeleting}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
};
