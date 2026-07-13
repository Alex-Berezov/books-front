import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { MediaFile } from '@/types/api-schema/media';
import styles from './MediaPreviewModal.module.scss';

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: MediaFile | null;
}

export const MediaPreviewModal: FC<MediaPreviewModalProps> = ({ isOpen, onClose, file }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasError(false);
    }
  }, [file, isOpen]);

  if (!file) return null;

  return (
    <Modal
      isOpen={isOpen}
      onCancel={() => {
        setHasError(false);
        onClose();
      }}
      title={file.filename}
      size="xl"
      showFooter={false}
    >
      <div className={styles.container}>
        {file.type === 'image' && !hasError ? (
          <div className={styles.imageWrapper}>
            <img
              src={file.url}
              alt={file.filename}
              className={styles.image}
              onError={() => setHasError(true)}
            />
          </div>
        ) : (
          <div className={styles.errorContainer}>
            {file.type === 'image' ? (
              <>
                <ImageOff size={48} className={styles.errorIcon} />
                <p>Failed to load image</p>
              </>
            ) : (
              <p>Preview not available for this file type.</p>
            )}
          </div>
        )}

        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Type:</span>
            <span className={styles.metaValue}>{file.type}</span>
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Size:</span>
            <span className={styles.metaValue}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>

          <div className={styles.urlRow}>
            <span className={styles.metaLabel}>URL:</span>
            <div className={styles.urlBox} title={file.url}>
              {file.url}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
