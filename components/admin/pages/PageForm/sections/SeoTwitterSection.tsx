'use client';

import type { FC } from 'react';
import { Controller } from 'react-hook-form';
import { Select } from '@/components/common/Select';
import type { PageFormData } from '../PageForm.types';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import styles from '../PageForm.module.scss';
import { FormField } from '../ui/FormField';
import { SeoCollapsible } from '../ui/SeoCollapsible';

export interface SeoTwitterSectionProps {
  /** React Hook Form register */
  register: UseFormRegister<PageFormData>;
  /** React Hook Form control */
  control: Control<PageFormData>;
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
  const { control, errors, isSubmitting } = props;

  // Twitter card options
  const twitterCardOptions = [
    { label: 'Summary (small image)', value: 'summary' },
    { label: 'Summary Large Image (large image)', value: 'summary_large_image' },
  ];

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
        <Controller
          name="seoTwitterCard"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={twitterCardOptions}
              disabled={isSubmitting}
              fullWidth
              error={!!errors.seoTwitterCard}
              ariaLabel="Select Twitter card type"
            />
          )}
        />
        <div className={styles.autoFillNotice}>
          ℹ️ Twitter uses Meta Title and Meta Description automatically
        </div>
      </FormField>
    </SeoCollapsible>
  );
};
