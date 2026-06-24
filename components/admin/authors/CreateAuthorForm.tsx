import type { FC, ChangeEvent } from 'react';
import { Input } from '@/components/common/Input';
import type { CreateAuthorFormData } from './CreateAuthorModal.types';
import styles from '../books/CreateBookModal/CreateBookModal.module.scss';

interface CreateAuthorFormProps {
  formData: CreateAuthorFormData;
  errors: Partial<Record<keyof CreateAuthorFormData, string>>;
  generatedSlug: string;
  finalSlug: string;
  slugError: string | null;
  isValidatingSlug: boolean;
  isPending: boolean;
  onInputChange: (field: keyof CreateAuthorFormData) => (e: ChangeEvent<HTMLInputElement>) => void;
}

export const CreateAuthorForm: FC<CreateAuthorFormProps> = ({
  formData,
  errors,
  generatedSlug,
  finalSlug,
  slugError,
  isValidatingSlug,
  isPending,
  onInputChange,
}) => {
  return (
    <form className={styles.form} id="create-author-form" onSubmit={(e) => e.preventDefault()}>
      {/* Name field */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="author-name">
          Author Name (English / Base)
          <span className={styles.required}>*</span>
        </label>
        <Input
          autoFocus
          error={!!errors.name}
          disabled={isPending}
          id="author-name"
          placeholder="e.g. J.K. Rowling"
          type="text"
          value={formData.name}
          onChange={onInputChange('name')}
          fullWidth
        />
        {errors.name && <span className={styles.errorMessage}>{errors.name}</span>}
        {generatedSlug && !errors.name && (
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
    </form>
  );
};
