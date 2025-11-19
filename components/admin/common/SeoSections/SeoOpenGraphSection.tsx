'use client';

import type { FC } from 'react';
import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormRegister,
  UseFormWatch,
} from 'react-hook-form';
import { CharCounter } from './ui/CharCounter';
import { FormField } from './ui/FormField';
import { SeoCollapsible } from './ui/SeoCollapsible';

export interface SeoOpenGraphSectionProps<TFormData extends FieldValues> {
  /** React Hook Form register */
  register: UseFormRegister<TFormData>;
  /** Validation errors */
  errors: FieldErrors<TFormData>;
  /** React Hook Form watch */
  watch: UseFormWatch<TFormData>;
  /** Loading flag */
  isSubmitting: boolean;
  /** Path to ogTitle field in form data */
  ogTitleField: Path<TFormData>;
  /** Path to ogDescription field in form data */
  ogDescriptionField: Path<TFormData>;
  /** Path to ogImageUrl field in form data */
  ogImageUrlField: Path<TFormData>;
  /** Styles object with CSS module classes */
  styles: Record<string, string>;
}

/**
 * Open Graph settings section (generic)
 *
 * Contains fields:
 * - OG Title (title for social media)
 * - OG Description (description for social media)
 * - OG Image URL (image for social media)
 *
 * Can be used for Pages, Books, Categories, etc.
 */
export const SeoOpenGraphSection = <TFormData extends FieldValues>(
  props: SeoOpenGraphSectionProps<TFormData>
): ReturnType<FC> => {
  const {
    register,
    errors,
    watch,
    isSubmitting,
    ogTitleField,
    ogDescriptionField,
    ogImageUrlField,
    styles,
  } = props;

  return (
    <SeoCollapsible title="Open Graph - Social Media (Facebook, LinkedIn) (required)">
      <div className={styles.autoFillNotice}>
        ℹ️ OG Title and Description are auto-filled from Basic Meta Tags
      </div>

      <FormField
        error={errors[ogTitleField]?.message as string | undefined}
        footer={<CharCounter current={(watch(ogTitleField) as string)?.length || 0} max={60} />}
        hint="Title shown when shared on Facebook, LinkedIn."
        id={ogTitleField}
        label="OG Title"
        required
      >
        <input
          className={styles.input}
          disabled={isSubmitting}
          id={ogTitleField}
          maxLength={60}
          placeholder="About Us - Company Name"
          type="text"
          {...register(ogTitleField)}
        />
      </FormField>

      <FormField
        error={errors[ogDescriptionField]?.message as string | undefined}
        footer={
          <CharCounter current={(watch(ogDescriptionField) as string)?.length || 0} max={160} />
        }
        hint="Description shown when shared on social media."
        id={ogDescriptionField}
        label="OG Description"
        required
      >
        <textarea
          className={styles.textarea}
          disabled={isSubmitting}
          id={ogDescriptionField}
          maxLength={160}
          placeholder="Learn more about our company..."
          rows={3}
          {...register(ogDescriptionField)}
        />
      </FormField>

      <FormField
        error={errors[ogImageUrlField]?.message as string | undefined}
        hint="Recommended: 1200×630 pixels. Image shown when shared on social media."
        id={ogImageUrlField}
        label="OG Image URL"
        required
      >
        <input
          className={styles.input}
          disabled={isSubmitting}
          id={ogImageUrlField}
          placeholder="https://example.com/images/og-image.jpg"
          type="url"
          {...register(ogImageUrlField)}
        />

        {/* Image preview */}
        {watch(ogImageUrlField) && (
          <div className={styles.imagePreview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="OG Image Preview" src={watch(ogImageUrlField) as string} />
          </div>
        )}
      </FormField>
    </SeoCollapsible>
  );
};
