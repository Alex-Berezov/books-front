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
}

export const MediaPicker: FC<MediaPickerProps> = (props) => {
  const { value, onChange, label, error, allowedTypes = ['image'], disabled } = props;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelect = (file: MediaFile) => {
    onChange(file.url);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className={styles.container}>
      {label && <label className={styles.label}>{label}</label>}

      <div
        className={`${styles.previewContainer} ${value ? styles.hasImage : styles.empty}`}
        onClick={() => !disabled && setIsModalOpen(true)}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Selected media" className={styles.previewImage} />

            {!disabled && (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModalOpen(true);
                  }}
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
          </>
        ) : (
          <div className={styles.placeholder}>
            <ImageIcon size={32} />
            <span>Select Image</span>
          </div>
        )}
      </div>

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
