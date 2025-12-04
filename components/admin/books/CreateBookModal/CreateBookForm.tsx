import type { FC, FormEvent, ChangeEvent } from 'react';
import { Input } from '@/components/common/Input';
import type { CreateBookFormData } from './CreateBookModal.types';
import styles from './CreateBookModal.module.scss';

interface CreateBookFormProps {
  formData: CreateBookFormData;
  errors: Partial<Record<keyof CreateBookFormData, string>>;
  generatedSlug: string;
  finalSlug: string;
  slugError: string | null;
  isValidatingSlug: boolean;
  isPending: boolean;
  onSubmit: (e: FormEvent) => void;
  onInputChange: (field: keyof CreateBookFormData) => (e: ChangeEvent<HTMLInputElement>) => void;
}

export const CreateBookForm: FC<CreateBookFormProps> = ({
  formData,
  errors,
  generatedSlug,
  finalSlug,
  slugError,
  isValidatingSlug,
  isPending,
  onSubmit,
  onInputChange,
}) => {
  return (
    <form className={styles.form} id="create-book-form" onSubmit={onSubmit}>
      {/* Title field */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="book-title">
          Book Title
          <span className={styles.required}>*</span>
        </label>
        <Input
          autoFocus
          error={!!errors.title}
          disabled={isPending}
          id="book-title"
          placeholder="e.g. Harry Potter and the Philosopher's Stone"
          type="text"
          value={formData.title}
          onChange={onInputChange('title')}
          fullWidth
        />
        {errors.title && <span className={styles.errorMessage}>{errors.title}</span>}
        {generatedSlug && !errors.title && (
          <div>
            <div className={styles.hint}>Generated slug:</div>
            <div className={styles.generatedSlug}>
              {slugError ? finalSlug : generatedSlug}
              {slugError && <span> (suggested alternative)</span>}
            </div>
            {isValidatingSlug && (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <span>Checking uniqueness...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Author field */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="book-author">
          Author
          <span className={styles.required}>*</span>
        </label>
        <Input
          error={!!errors.author}
          disabled={isPending}
          id="book-author"
          placeholder="e.g. J.K. Rowling"
          type="text"
          value={formData.author}
          onChange={onInputChange('author')}
          fullWidth
        />
        {errors.author && <span className={styles.errorMessage}>{errors.author}</span>}
      </div>
    </form>
  );
};
