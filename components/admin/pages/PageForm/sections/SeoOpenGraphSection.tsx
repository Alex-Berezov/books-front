'use client';

import type { FC } from 'react';
import { Input } from '@/components/common/Input';
import type { PageFormData } from '../PageForm.types';
import type { FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form';
import styles from '../PageForm.module.scss';
import { CharCounter } from '../ui/CharCounter';
import { FormField } from '../ui/FormField';
import { SeoCollapsible } from '../ui/SeoCollapsible';

export interface SeoOpenGraphSectionProps {
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
 * Open Graph settings section (Facebook, LinkedIn)
 *
 * Contains fields:
 * - OG Title (title for social media)
 * - OG Description (description for social media)
 * - OG Image URL (image for social media)
 */
export const SeoOpenGraphSection: FC<SeoOpenGraphSectionProps> = (props) => {
  const { register, errors, watch, isSubmitting } = props;

  return (
    <SeoCollapsible title="Open Graph - Social Media (Facebook, LinkedIn) (required)">
      <div className={styles.autoFillNotice}>
        ℹ️ OG Title and Description are auto-filled from Basic Meta Tags
      </div>

      <FormField
        error={errors.seoOgTitle?.message}
        footer={<CharCounter current={watch('seoOgTitle')?.length || 0} max={60} />}
        hint="Title shown when shared on Facebook, LinkedIn."
        id="seoOgTitle"
        label="OG Title"
        required
      >
        <Input
          disabled={isSubmitting}
          id="seoOgTitle"
          maxLength={60}
          placeholder="About Us - Company Name"
          type="text"
          fullWidth
          {...register('seoOgTitle')}
        />
      </FormField>

      <FormField
        error={errors.seoOgDescription?.message}
        footer={<CharCounter current={watch('seoOgDescription')?.length || 0} max={160} />}
        hint="Description shown when shared on social media."
        id="seoOgDescription"
        label="OG Description"
        required
      >
        <textarea
          className={styles.textarea}
          disabled={isSubmitting}
          id="seoOgDescription"
          maxLength={160}
          placeholder="Learn more about our company..."
          rows={3}
          {...register('seoOgDescription')}
        />
      </FormField>

      <FormField
        error={errors.seoOgImageUrl?.message}
        hint="Recommended: 1200×630 pixels. Image shown when shared on social media."
        id="seoOgImageUrl"
        label="OG Image URL"
        required
      >
        <Input
          disabled={isSubmitting}
          id="seoOgImageUrl"
          placeholder="https://example.com/images/og-image.jpg"
          type="url"
          fullWidth
          {...register('seoOgImageUrl')}
        />

        {/* Image preview */}
        {watch('seoOgImageUrl') && (
          <div className={styles.imagePreview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="OG Image Preview" src={watch('seoOgImageUrl')} />
          </div>
        )}
      </FormField>
    </SeoCollapsible>
  );
};
