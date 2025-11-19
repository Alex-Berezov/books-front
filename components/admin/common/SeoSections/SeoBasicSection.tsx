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

export interface SeoBasicSectionProps<TFormData extends FieldValues> {
  /** React Hook Form register */
  register: UseFormRegister<TFormData>;
  /** Validation errors */
  errors: FieldErrors<TFormData>;
  /** React Hook Form watch */
  watch: UseFormWatch<TFormData>;
  /** Loading flag */
  isSubmitting: boolean;
  /** Path to metaTitle field in form data */
  metaTitleField: Path<TFormData>;
  /** Path to metaDescription field in form data */
  metaDescriptionField: Path<TFormData>;
  /** Styles object with CSS module classes */
  styles: Record<string, string>;
}

/**
 * Basic SEO settings section (generic)
 *
 * Contains fields:
 * - Meta Title (title for search engines)
 * - Meta Description (description for search engines)
 *
 * Can be used for Pages, Books, Categories, etc.
 */
export const SeoBasicSection = <TFormData extends FieldValues>(
  props: SeoBasicSectionProps<TFormData>
): ReturnType<FC> => {
  const { register, errors, watch, isSubmitting, metaTitleField, metaDescriptionField, styles } =
    props;

  return (
    <SeoCollapsible defaultOpen title="Basic Meta Tags (required)">
      <FormField
        error={errors[metaTitleField]?.message as string | undefined}
        footer={<CharCounter current={(watch(metaTitleField) as string)?.length || 0} max={60} />}
        hint="Recommended: 50-60 characters. Shows in Google search results."
        id={metaTitleField}
        label="Meta Title"
        required
      >
        <input
          className={styles.input}
          disabled={isSubmitting}
          id={metaTitleField}
          maxLength={60}
          placeholder="About Us - Company Name"
          type="text"
          {...register(metaTitleField)}
        />
      </FormField>

      <FormField
        error={errors[metaDescriptionField]?.message as string | undefined}
        footer={
          <CharCounter current={(watch(metaDescriptionField) as string)?.length || 0} max={160} />
        }
        hint="Recommended: 120-160 characters. Shows below title in search results."
        id={metaDescriptionField}
        label="Meta Description"
        required
      >
        <textarea
          className={styles.textarea}
          disabled={isSubmitting}
          id={metaDescriptionField}
          maxLength={160}
          placeholder="Learn more about our company, mission, and team..."
          rows={3}
          {...register(metaDescriptionField)}
        />
      </FormField>
    </SeoCollapsible>
  );
};
