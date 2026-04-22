'use client';

import { useCallback, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FC } from 'react';
import { useSnackbar } from 'notistack';
import { uploadAudioFile } from '@/api/endpoints/admin/uploads';
import { useUploadsLimits } from '@/api/hooks';
import { Button } from '@/components/common/Button';
import { toUserMessage } from '@/lib/errors';
import { detectAudioDuration, formatDuration, validateUploadFile } from '@/lib/utils/audio';
import styles from './AudioPicker.module.scss';

/**
 * Currently selected audio payload — all fields stay in sync with the form.
 */
export interface AudioPickerValue {
  audioUrl: string;
  mediaId: string | null;
  duration: number;
  /** Human-readable display name (filename / URL suffix). Not persisted. */
  displayName: string | null;
}

export interface AudioPickerProps {
  value: AudioPickerValue | null;
  onChange: (value: AudioPickerValue | null) => void;
  /** Optional: open Media Library for picking an existing MediaAsset. */
  onOpenMediaLibrary?: () => void;
  disabled?: boolean;
}

const extractFilename = (file: File): string => file.name;

export const AudioPicker: FC<AudioPickerProps> = (props) => {
  const { value, onChange, onOpenMediaLibrary, disabled = false } = props;
  const { enqueueSnackbar } = useSnackbar();
  const { data: limits } = useUploadsLimits();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const busy = isUploading || disabled;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (limits) {
        const validationError = validateUploadFile(file, limits.audio);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      // Probe duration locally before upload — we'll use this as the
      // authoritative `duration` for the AudioChapter.
      const localDuration = await detectAudioDuration(file);

      setIsUploading(true);
      setProgress(0);
      try {
        const asset = await uploadAudioFile(file, {
          onProgress: (percent) => setProgress(percent),
        });

        const duration = localDuration ?? asset.duration ?? 0;
        onChange({
          audioUrl: asset.url,
          mediaId: asset.id,
          duration,
          displayName: extractFilename(file),
        });
      } catch (uploadError) {
        const message = toUserMessage(uploadError);
        setError(message);
        enqueueSnackbar(message, { variant: 'error' });
      } finally {
        setIsUploading(false);
      }
    },
    [enqueueSnackbar, limits, onChange]
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so selecting the same file twice still fires onChange.
    event.target.value = '';
    if (file) {
      void handleFile(file);
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
      void handleFile(file);
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
