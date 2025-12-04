import type { FC } from 'react';
import { Controller } from 'react-hook-form';
import { Select } from '@/components/common/Select';
import type { BookFormData } from './BookForm.types';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import styles from './BookForm.module.scss';

interface MediaSectionProps {
  register: UseFormRegister<BookFormData>;
  control: Control<BookFormData>;
  errors: FieldErrors<BookFormData>;
}

export const MediaSection: FC<MediaSectionProps> = ({ register, control, errors }) => {
  // Version type options
  const typeOptions = [
    { label: 'Text', value: 'text' },
    { label: 'Audio', value: 'audio' },
  ];

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Media & Type</h2>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="coverImageUrl">
          Cover Image URL
        </label>
        <input
          className={styles.input}
          id="coverImageUrl"
          placeholder="https://example.com/cover.jpg"
          type="url"
          {...register('coverImageUrl')}
        />
        {errors.coverImageUrl && (
          <span className={styles.error}>{errors.coverImageUrl.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="type">
          Version Type *
        </label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={typeOptions}
              fullWidth
              error={!!errors.type}
              ariaLabel="Select version type"
            />
          )}
        />
        {errors.type && <span className={styles.error}>{errors.type.message}</span>}
      </div>

      <div className={styles.checkboxField}>
        <input className={styles.checkbox} id="isFree" type="checkbox" {...register('isFree')} />
        <label className={styles.checkboxLabel} htmlFor="isFree">
          This version is free
        </label>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="referralUrl">
          Referral URL (optional)
        </label>
        <input
          className={styles.input}
          id="referralUrl"
          placeholder="https://amazon.com/ref123"
          type="url"
          {...register('referralUrl')}
        />
        {errors.referralUrl && <span className={styles.error}>{errors.referralUrl.message}</span>}
        <span className={styles.hint}>External link for purchasing or more info</span>
      </div>
    </div>
  );
};
