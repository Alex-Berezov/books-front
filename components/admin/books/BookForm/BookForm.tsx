'use client';

import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import type { BookFormProps } from './BookForm.types';
import { BasicInfoSection } from './BasicInfoSection';
import styles from './BookForm.module.scss';
import { MediaSection } from './MediaSection';
import { SeoSection } from './SeoSection';
import { useBookForm } from './useBookForm';

export type { BookFormData, BookFormProps } from './BookForm.types';

/**
 * Form for creating/editing book version
 *
 * Component with react-hook-form and zod validation.
 * Supports creating new version and editing existing one.
 */
export const BookForm: FC<BookFormProps> = (props) => {
  const {
    lang,
    initialData,
    initialTitle,
    initialAuthor,
    onSubmit,
    isSubmitting = false,
    id,
  } = props;

  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    watch,
  } = useBookForm({
    lang,
    initialData,
    initialTitle,
    initialAuthor,
  });

  return (
    <form className={styles.form} id={id} onSubmit={handleSubmit(onSubmit)}>
      {/* Basic Information */}
      <BasicInfoSection
        bookId={initialData?.bookId}
        control={control}
        errors={errors}
        isEditMode={!!initialData}
        register={register}
        setValue={setValue}
        watch={watch}
      />

      {/* Media & Type */}
      <MediaSection control={control} errors={errors} register={register} />

      {/* SEO Settings */}
      <SeoSection
        control={control}
        errors={errors}
        isSubmitting={isSubmitting}
        register={register}
        setValue={setValue}
        watch={watch}
      />

      {/* Action Buttons */}
      <div className={styles.actions}>
        <Button type="submit" size="lg" loading={isSubmitting}>
          {initialData ? 'Update Version' : 'Create Version'}
        </Button>
      </div>
    </form>
  );
};
