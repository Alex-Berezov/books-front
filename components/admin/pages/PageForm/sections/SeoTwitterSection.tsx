'use client';

import type { FC } from 'react';
import type { PageFormData } from '../PageForm.types';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import styles from '../PageForm.module.scss';
import { FormField } from '../ui/FormField';
import { SeoCollapsible } from '../ui/SeoCollapsible';

export interface SeoTwitterSectionProps {
  /** React Hook Form register */
  register: UseFormRegister<PageFormData>;
  /** Validation errors */
  errors: FieldErrors<PageFormData>;
  /** Loading flag */
  isSubmitting: boolean;
}

/**
 * Twitter Card settings section
 *
 * Contains fields:
 * - Twitter Card Type (card type for Twitter)
 */
export const SeoTwitterSection: FC<SeoTwitterSectionProps> = (props) => {
  const { register, errors, isSubmitting } = props;

  return (
    <SeoCollapsible title="Twitter Card (required)">
      <div className={styles.autoFillNotice}>
        ℹ️ Twitter Title and Description are auto-filled from Basic Meta Tags
      </div>

      <FormField
        error={errors.seoTwitterCard?.message}
        hint="Summary: small square image. Summary Large Image: wide image (recommended)."
        id="seoTwitterCard"
        label="Twitter Card Type"
        required
      >
        <select
          className={styles.select}
          disabled={isSubmitting}
          id="seoTwitterCard"
          {...register('seoTwitterCard')}
        >
          <option value="summary">Summary (small image)</option>
          <option value="summary_large_image">Summary Large Image (large image)</option>
        </select>
        <div className={styles.autoFillNotice}>
          ℹ️ Twitter uses Meta Title and Meta Description automatically
        </div>
      </FormField>
    </SeoCollapsible>
  );
};
