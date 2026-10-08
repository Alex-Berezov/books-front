'use client';

import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { AdminRichTextEditor } from '@/components/admin/common/AdminRichTextEditor';
import { Modal } from '@/components/admin/common/Modal';
import { Input } from '@/components/common/Input';
import { useFollowUntilEdited } from '@/lib/hooks/useFollowUntilEdited';
import { useOnOpen } from '@/lib/hooks/useOnOpen';
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
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ChapterFormData>({
    resolver: zodResolver(chapterSchema),
    defaultValues: {
      title: '',
      content: '',
      number: nextChapterNumber,
    },
  });

  useOnOpen(
    isOpen,
    () =>
      reset({
        title: initialData?.title || '',
        content: initialData?.content || '',
        number: initialData?.number || nextChapterNumber,
      }),
    initialData?.id
  );

  // A new chapter's number follows the refetched list until the user edits it.
  const markNumberEdited = useFollowUntilEdited(isOpen && !initialData, nextChapterNumber, (n) =>
    setValue('number', n)
  );

  return (
    <Modal
      isOpen={isOpen}
      title={initialData ? 'Edit Chapter' : 'Add Chapter'}
      confirmText={initialData ? 'Save Changes' : 'Create Chapter'}
      cancelText="Cancel"
      // The caller closes the dialog after a successful save; after a failed one it stays open.
      onConfirm={handleSubmit(onSubmit)}
      onCancel={onClose}
      isLoading={isSubmitting}
      size="lg"
      closeOnOverlayClick={false}
      closeOnEscape={false}
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
            {...register('number', { valueAsNumber: true, onChange: markNumberEdited })}
          />
          {errors.number && <span className={styles.error}>{errors.number.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="content">
            Content
          </label>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <AdminRichTextEditor
                id="content"
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="Write chapter content..."
                error={!!errors.content}
                minHeight="280px"
              />
            )}
          />
          {errors.content && <span className={styles.error}>{errors.content.message}</span>}
        </div>
      </form>
    </Modal>
  );
};
