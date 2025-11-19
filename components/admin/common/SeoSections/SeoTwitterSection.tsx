'use client';

import type { FC } from 'react';
import type { FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form';
import { FormField } from './ui/FormField';
import { SeoCollapsible } from './ui/SeoCollapsible';

export interface SeoTwitterSectionProps<TFormData extends FieldValues> {
  /** React Hook Form register */
  register: UseFormRegister<TFormData>;
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
  const { register, errors, isSubmitting, twitterCardField, styles } = props;

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
        <select
          className={styles.select}
          disabled={isSubmitting}
          id={twitterCardField}
          {...register(twitterCardField)}
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
