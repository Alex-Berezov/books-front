import type { FC } from 'react';
import { Modal } from '@/components/common/Modal';
import { MediaUpload } from './MediaUpload';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: () => void;
}

export const UploadModal: FC<UploadModalProps> = ({ isOpen, onClose, onUploadComplete }) => {
  return (
    <Modal isOpen={isOpen} onCancel={onClose} title="Upload Media" size="lg" showFooter={false}>
      <MediaUpload onUploadComplete={onUploadComplete} />
    </Modal>
  );
};
