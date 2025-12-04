import type { FC } from 'react';
import { Controller } from 'react-hook-form';
import { Checkbox } from '@/components/common/Checkbox';
import { Input } from '@/components/common/Input';
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
        <Input
          id="coverImageUrl"
          placeholder="https://example.com/cover.jpg"
          type="url"
          fullWidth
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

      <Checkbox id="isFree" label="This version is free" {...register('isFree')} />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="referralUrl">
          Referral URL (optional)
        </label>
        <Input
          id="referralUrl"
          placeholder="https://amazon.com/ref123"
          type="url"
          fullWidth
          {...register('referralUrl')}
        />
        {errors.referralUrl && <span className={styles.error}>{errors.referralUrl.message}</span>}
        <span className={styles.hint}>External link for purchasing or more info</span>
      </div>
    </div>
  );
};
