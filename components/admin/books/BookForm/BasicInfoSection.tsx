import type { FC } from 'react';
import { Controller } from 'react-hook-form';
import { Input } from '@/components/common/Input';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import { Select } from '@/components/common/Select';
import { SlugInput } from '@/components/common/SlugInput';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import type { BookFormData } from './BookForm.types';
import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import styles from './BookForm.module.scss';

interface BasicInfoSectionProps {
  register: UseFormRegister<BookFormData>;
  control: Control<BookFormData>;
  errors: FieldErrors<BookFormData>;
  watch: UseFormWatch<BookFormData>;
  setValue: UseFormSetValue<BookFormData>;
  isEditMode: boolean;
  bookId?: string;
  existingLanguages?: SupportedLang[];
}

export const BasicInfoSection: FC<BasicInfoSectionProps> = (props) => {
  const {
    register,
    control,
    errors,
    watch,
    setValue,
    isEditMode,
    bookId,
    existingLanguages = [],
  } = props;

  // Language options
  const languageOptions = SUPPORTED_LANGS.filter(
    (langCode) => isEditMode || !existingLanguages.includes(langCode)
  ).map((langCode) => ({
    label: langCode.toUpperCase(),
    value: langCode,
  }));

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Basic Information</h2>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="language">
          Language *
        </label>
        <Controller
          name="language"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={languageOptions}
              disabled={isEditMode}
              fullWidth
              error={!!errors.language}
              ariaLabel="Select language"
            />
          )}
        />
        {errors.language && <span className={styles.error}>{errors.language.message}</span>}
        {isEditMode && (
          <span className={styles.hint}>Language cannot be changed after creation</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="title">
          Title *
        </label>
        <Input
          id="title"
          placeholder="Enter book title"
          type="text"
          fullWidth
          {...register('title')}
        />
        {errors.title && <span className={styles.error}>{errors.title.message}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="author">
          Author *
        </label>
        <Input
          id="author"
          placeholder="Enter author name"
          type="text"
          fullWidth
          {...register('author')}
        />
        {errors.author && <span className={styles.error}>{errors.author.message}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="bookSlug">
          Book Slug *
        </label>
        <SlugInput
          autoGenerate
          entityType="book"
          error={errors.bookSlug?.message}
          excludeId={bookId}
          id="bookSlug"
          onChange={(value) => setValue('bookSlug', value)}
          placeholder="harry-potter"
          showGenerateButton
          sourceValue={watch('title')}
          value={watch('bookSlug')}
        />
        <span className={styles.hint}>
          URL-friendly identifier for the book (lowercase, hyphens only). Example: about-us
        </span>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="description">
          Description
        </label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              id="description"
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="Enter book description"
              error={!!errors.description}
              minHeight="160px"
            />
          )}
        />
        {errors.description && <span className={styles.error}>{errors.description.message}</span>}
      </div>
    </div>
  );
};
