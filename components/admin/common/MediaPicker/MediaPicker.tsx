'use client';

import type { FC } from 'react';
import { useState } from 'react';
import { Image as ImageIcon, Pencil, Trash2 } from 'lucide-react';
import { MediaSelectModal } from '@/components/admin/media/MediaSelectModal';
import type { MediaFile } from '@/types/api-schema/media';
import styles from './MediaPicker.module.scss';

interface MediaPickerProps {
  /** Current image URL */
  value?: string | null;
  /** Callback when image is changed */
  onChange: (url: string | null) => void;
  /** Label for the field */
  label?: string;
  /** Error message */
  error?: string;
  /** Allowed media types */
  allowedTypes?: ('image' | 'video' | 'audio' | 'document')[];
  /** Disabled state */
  disabled?: boolean;
  /** Aspect ratio for image preview block */
  aspectRatio?: 'vertical' | 'square' | 'landscape';
}

export const MediaPicker: FC<MediaPickerProps> = (props) => {
  const { value, onChange, label, error, allowedTypes = ['image'], disabled, aspectRatio } = props;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelect = (file: MediaFile) => {
    onChange(file.url);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const ratioClass = {
    vertical: styles.ratioVertical,
    square: styles.ratioSquare,
    landscape: styles.ratioLandscape,
  }[aspectRatio || 'landscape'];

  return (
    <div className={styles.container}>
      {label && <label className={styles.label}>{label}</label>}

      {value ? (
        <div className={`${styles.previewContainer} ${styles.hasImage} ${ratioClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Selected media" className={styles.previewImage} />

          {!disabled && (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => setIsModalOpen(true)}
                title="Replace"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={handleRemove}
                title="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          className={`${styles.previewContainer} ${styles.empty} ${ratioClass}`}
          onClick={() => setIsModalOpen(true)}
        >
          <div className={styles.placeholder}>
            <ImageIcon size={32} />
            <span>Select Image</span>
          </div>
        </button>
      )}

      {error && <span className={styles.error}>{error}</span>}

      <MediaSelectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelect}
        initialSelectedUrl={value || undefined}
        allowedTypes={allowedTypes}
      />
    </div>
  );
};
