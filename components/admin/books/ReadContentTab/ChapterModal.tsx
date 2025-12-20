'use client';

import { useEffect } from 'react';
import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import styles from './ChapterModal.module.scss';
import { type ChapterFormData, type ChapterModalProps, chapterSchema } from './ChapterModal.types';

export const ChapterModal: FC<ChapterModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isSubmitting = false,
    nextChapterNumber = 1,
  } = props;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChapterFormData>({
    resolver: zodResolver(chapterSchema),
    defaultValues: {
      title: '',
      content: '',
      number: nextChapterNumber,
    },
  });

  // Reset form when opening or when initialData changes
  useEffect(() => {
    if (isOpen) {
      reset({
        title: initialData?.title || '',
        content: initialData?.content || '',
        number: initialData?.number || nextChapterNumber,
      });
    }
  }, [isOpen, initialData, nextChapterNumber, reset]);

  const handleFormSubmit = async (data: ChapterFormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      title={initialData ? 'Edit Chapter' : 'Add Chapter'}
      confirmText={initialData ? 'Save Changes' : 'Create Chapter'}
      cancelText="Cancel"
      onConfirm={handleSubmit(handleFormSubmit)}
      onCancel={onClose}
      isLoading={isSubmitting}
      size="lg"
    >
      <form className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="title">
            Chapter Title *
          </label>
          <Input
            id="title"
            placeholder="e.g. Chapter 1: The Beginning"
            fullWidth
            error={!!errors.title}
            {...register('title')}
          />
          {errors.title && <span className={styles.error}>{errors.title.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="number">
            Chapter Number *
          </label>
          <Input
            id="number"
            type="number"
            fullWidth
            error={!!errors.number}
            {...register('number', { valueAsNumber: true })}
          />
          {errors.number && <span className={styles.error}>{errors.number.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="content">
            Content (Markdown)
          </label>
          <textarea
            id="content"
            className={styles.textarea}
            placeholder="# Chapter Content..."
            {...register('content')}
          />
          {errors.content && <span className={styles.error}>{errors.content.message}</span>}
        </div>
      </form>
    </Modal>
  );
};
