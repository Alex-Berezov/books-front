import type { FC } from 'react';
import { SlugInput } from '@/components/common/SlugInput';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { BookFormData } from './BookForm.types';
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import styles from './BookForm.module.scss';

interface BasicInfoSectionProps {
  register: UseFormRegister<BookFormData>;
  errors: FieldErrors<BookFormData>;
  watch: UseFormWatch<BookFormData>;
  setValue: UseFormSetValue<BookFormData>;
  isEditMode: boolean;
  bookId?: string;
}

export const BasicInfoSection: FC<BasicInfoSectionProps> = (props) => {
  const { register, errors, watch, setValue, isEditMode, bookId } = props;

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Basic Information</h2>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="language">
          Language *
        </label>
        <select
          className={styles.select}
          disabled={isEditMode}
          id="language"
          {...register('language')}
        >
          {SUPPORTED_LANGS.map((langCode) => (
            <option key={langCode} value={langCode}>
              {langCode.toUpperCase()}
            </option>
          ))}
        </select>
        {errors.language && <span className={styles.error}>{errors.language.message}</span>}
        {isEditMode && (
          <span className={styles.hint}>Language cannot be changed after creation</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="title">
          Title *
        </label>
        <input
          className={styles.input}
          id="title"
          placeholder="Enter book title"
          type="text"
          {...register('title')}
        />
        {errors.title && <span className={styles.error}>{errors.title.message}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="author">
          Author *
        </label>
        <input
          className={styles.input}
          id="author"
          placeholder="Enter author name"
          type="text"
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
        <textarea
          className={styles.textarea}
          id="description"
          placeholder="Enter book description"
          rows={5}
          {...register('description')}
        />
        {errors.description && <span className={styles.error}>{errors.description.message}</span>}
      </div>
    </div>
  );
};
