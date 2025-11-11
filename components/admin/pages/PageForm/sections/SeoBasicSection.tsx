'use client';

import type { FC } from 'react';
import type { PageFormData } from '../PageForm.types';
import type { FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form';
import styles from '../PageForm.module.scss';
import { CharCounter } from '../ui/CharCounter';
import { FormField } from '../ui/FormField';
import { SeoCollapsible } from '../ui/SeoCollapsible';

export interface SeoBasicSectionProps {
  /** React Hook Form register */
  register: UseFormRegister<PageFormData>;
  /** Validation errors */
  errors: FieldErrors<PageFormData>;
  /** React Hook Form watch */
  watch: UseFormWatch<PageFormData>;
  /** Loading flag */
  isSubmitting: boolean;
}

/**
 * Basic SEO settings section
 *
 * Contains fields:
 * - Meta Title (title for search engines)
 * - Meta Description (description for search engines)
 */
export const SeoBasicSection: FC<SeoBasicSectionProps> = (props) => {
  const { register, errors, watch, isSubmitting } = props;

  return (
    <SeoCollapsible defaultOpen title="Basic Meta Tags (required)">
      <FormField
        error={errors.seoMetaTitle?.message}
        footer={<CharCounter current={watch('seoMetaTitle')?.length || 0} max={60} />}
        hint="Recommended: 50-60 characters. Shows in Google search results."
        id="seoMetaTitle"
        label="Meta Title"
        required
      >
        <input
          className={styles.input}
          disabled={isSubmitting}
          id="seoMetaTitle"
          maxLength={60}
          placeholder="About Us - Company Name"
          type="text"
          {...register('seoMetaTitle')}
        />
      </FormField>

      <FormField
        error={errors.seoMetaDescription?.message}
        footer={<CharCounter current={watch('seoMetaDescription')?.length || 0} max={160} />}
        hint="Recommended: 120-160 characters. Shows below title in search results."
        id="seoMetaDescription"
        label="Meta Description"
        required
      >
        <textarea
          className={styles.textarea}
          disabled={isSubmitting}
          id="seoMetaDescription"
          maxLength={160}
          placeholder="Learn more about our company, mission, and team..."
          rows={3}
          {...register('seoMetaDescription')}
        />
      </FormField>
    </SeoCollapsible>
  );
};
