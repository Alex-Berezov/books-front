'use client';

import type { FC } from 'react';
import { Controller } from 'react-hook-form';
import { Select } from '@/components/common/Select';
import type { Control, FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form';
import { FormField } from './ui/FormField';
import { SeoCollapsible } from './ui/SeoCollapsible';

export interface SeoTwitterSectionProps<TFormData extends FieldValues> {
  /** React Hook Form register */
  register: UseFormRegister<TFormData>;
  /** React Hook Form control */
  control: Control<TFormData>;
  /** Validation errors */
  errors: FieldErrors<TFormData>;
  /** Loading flag */
  isSubmitting: boolean;
  /** Path to twitterCard field in form data */
  twitterCardField: Path<TFormData>;
  /** Styles object with CSS module classes */
  styles: Record<string, string>;
}

/**
 * Twitter Card settings section (generic)
 *
 * Contains fields:
 * - Twitter Card Type (card type for Twitter)
 *
 * Can be used for Pages, Books, Categories, etc.
 */
export const SeoTwitterSection = <TFormData extends FieldValues>(
  props: SeoTwitterSectionProps<TFormData>
): ReturnType<FC> => {
  const { control, errors, isSubmitting, twitterCardField, styles } = props;

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
        error={errors[twitterCardField]?.message as string | undefined}
        hint="Summary: small square image. Summary Large Image: wide image (recommended)."
        id={twitterCardField}
        label="Twitter Card Type"
        required
      >
        <Controller
          name={twitterCardField}
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={twitterCardOptions}
              disabled={isSubmitting}
              fullWidth
              error={!!errors[twitterCardField]}
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
