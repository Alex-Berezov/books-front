'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import styles from './AudioChapterModal.module.scss';
import {
  type AudioChapterFormData,
  type AudioChapterModalProps,
  audioChapterSchema,
} from './AudioChapterModal.types';
import { AudioPicker, type AudioPickerValue } from './AudioPicker';

const deriveDisplayName = (url: string | undefined | null): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    return decodeURIComponent(segments[segments.length - 1] || parsed.hostname);
  } catch {
    return url;
  }
};

export const AudioChapterModal: FC<AudioChapterModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isSubmitting = false,
    nextChapterNumber = 1,
  } = props;

  const defaultValues = useMemo<AudioChapterFormData>(
    () => ({
      number: nextChapterNumber,
      title: '',
      audioUrl: '',
      mediaId: null,
      duration: 0,
      description: '',
      transcript: '',
    }),
    [nextChapterNumber]
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AudioChapterFormData>({
    resolver: zodResolver(audioChapterSchema),
    defaultValues,
  });

  const audioUrl = watch('audioUrl');
  const mediaId = watch('mediaId');
  const duration = watch('duration');

  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      reset({
        number: initialData.number,
        title: initialData.title,
        audioUrl: initialData.audioUrl,
        mediaId: initialData.mediaId,
        duration: initialData.duration,
        description: initialData.description ?? '',
        transcript: initialData.transcript ?? '',
      });
      setDisplayName(deriveDisplayName(initialData.audioUrl));
    } else {
      reset(defaultValues);
      setDisplayName(null);
    }
  }, [isOpen, initialData, defaultValues, reset]);

  const pickerValue: AudioPickerValue | null = audioUrl
    ? {
        audioUrl,
        mediaId: mediaId ?? null,
        duration: duration ?? 0,
        displayName,
      }
    : null;

  const handlePickerChange = (next: AudioPickerValue | null) => {
    if (!next) {
      setValue('audioUrl', '', { shouldValidate: true, shouldDirty: true });
      setValue('mediaId', null, { shouldDirty: true });
      setValue('duration', 0, { shouldValidate: true, shouldDirty: true });
      setDisplayName(null);
      return;
    }

    setValue('audioUrl', next.audioUrl, { shouldValidate: true, shouldDirty: true });
    setValue('mediaId', next.mediaId, { shouldDirty: true });
    setValue('duration', next.duration, { shouldValidate: true, shouldDirty: true });
    setDisplayName(next.displayName ?? deriveDisplayName(next.audioUrl));
  };

  const handleFormSubmit = async (data: AudioChapterFormData) => {
    // Normalise empty strings to null for nullable text fields.
    const payload: AudioChapterFormData = {
      ...data,
      description: data.description ? data.description : null,
      transcript: data.transcript ? data.transcript : null,
      mediaId: data.mediaId ?? null,
    };
    await onSubmit(payload);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      title={initialData ? 'Edit Audio Chapter' : 'Add Audio Chapter'}
      confirmText={initialData ? 'Save Changes' : 'Create Chapter'}
      cancelText="Cancel"
      onConfirm={handleSubmit(handleFormSubmit)}
      onCancel={onClose}
      isLoading={isSubmitting}
      size="lg"
    >
      <form className={styles.form}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="title">
              Title *
            </label>
            <Input
              id="title"
              placeholder="e.g. Chapter 1: The Boy Who Lived"
              fullWidth
              error={!!errors.title}
              {...register('title')}
            />
            {errors.title && <span className={styles.error}>{errors.title.message}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="number">
              Number *
            </label>
            <Input
              id="number"
              type="number"
              min={1}
              fullWidth
              error={!!errors.number}
              {...register('number', { valueAsNumber: true })}
            />
            {errors.number && <span className={styles.error}>{errors.number.message}</span>}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Audio file *</span>
          <Controller
            name="audioUrl"
            control={control}
            render={() => <AudioPicker value={pickerValue} onChange={handlePickerChange} />}
          />
          {errors.audioUrl && <span className={styles.error}>{errors.audioUrl.message}</span>}
          {errors.duration && <span className={styles.error}>{errors.duration.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className={styles.textarea}
            placeholder="Short description shown in listings (optional)"
            maxLength={5000}
            {...register('description')}
          />
          {errors.description && <span className={styles.error}>{errors.description.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="transcript">
            Transcript
          </label>
          <textarea
            id="transcript"
            className={styles.textarea}
            placeholder="Full transcript of the audio (optional)"
            {...register('transcript')}
          />
          {errors.transcript && <span className={styles.error}>{errors.transcript.message}</span>}
        </div>
      </form>
    </Modal>
  );
};
