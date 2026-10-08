'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FC, KeyboardEvent } from 'react';
import { Button } from '@/components/admin/common/Button';
import { formatDuration } from '@/lib/utils/audio';
import type { AudioPickerProps } from './AudioPicker.types';
import styles from './AudioPicker.module.scss';
import { useAudioUpload } from './useAudioUpload';

export type { AudioPickerProps, AudioPickerValue } from './AudioPicker.types';

export const AudioPicker: FC<AudioPickerProps> = (props) => {
  const { value, onChange, onOpenMediaLibrary, disabled = false, onUploadingChange } = props;
  const { limits, isUploading, progress, error, setError, setProgress, uploadFile, cancelUpload } =
    useAudioUpload({ onChange, onUploadingChange });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const busy = isUploading || disabled;

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so selecting the same file twice still fires onChange.
    event.target.value = '';
    if (file) {
      void uploadFile(file);
    }
  };

  const handleBrowseClick = () => {
    if (busy) return;
    inputRef.current?.click();
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (busy) return;
    setIsDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    if (busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void uploadFile(file);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setError(null);
    setProgress(0);
  };

  const dropzoneClassName = [
    styles.dropzone,
    isDragActive ? styles.dragActive : '',
    busy ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.picker}>
      {!value && !isUploading && (
        <div
          className={dropzoneClassName}
          onClick={handleBrowseClick}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            handleBrowseClick();
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-disabled={busy}
        >
          <span className={styles.dropzoneTitle}>Drop an audio file here or click to browse</span>
          <span className={styles.dropzoneHint}>
            {limits
              ? `${limits.audio.allowedContentTypes.join(', ')} · up to ${limits.audio.maxSizeMb} MB`
              : 'MP3, M4A, AAC or OGG'}
          </span>
        </div>
      )}

      {isUploading && (
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressLabel}>Uploading… {progress}%</span>
          <Button variant="ghost" size="sm" onClick={cancelUpload}>
            Cancel upload
          </Button>
        </div>
      )}

      {value && !isUploading && (
        <div className={styles.selected}>
          <div className={styles.selectedHeader}>
            <span className={styles.selectedName}>{value.displayName || value.audioUrl}</span>
            <span className={styles.selectedMeta}>{formatDuration(value.duration)}</span>
          </div>
          <span className={styles.selectedUrl}>{value.audioUrl}</span>
          <div className={styles.actions}>
            <Button variant="ghost" size="sm" onClick={handleBrowseClick} disabled={busy}>
              Replace file
            </Button>
            {onOpenMediaLibrary && (
              <Button variant="ghost" size="sm" onClick={onOpenMediaLibrary} disabled={busy}>
                From Media Library
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleRemove} disabled={busy}>
              Remove
            </Button>
          </div>
        </div>
      )}

      {!value && !isUploading && onOpenMediaLibrary && (
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={onOpenMediaLibrary} disabled={busy}>
            Pick from Media Library
          </Button>
        </div>
      )}

      {error && <span className={styles.error}>{error}</span>}

      <input
        ref={inputRef}
        type="file"
        accept={limits?.audio.allowedContentTypes.join(',') || 'audio/*'}
        className={styles.hiddenInput}
        onChange={handleInputChange}
        disabled={busy}
      />
    </div>
  );
};
