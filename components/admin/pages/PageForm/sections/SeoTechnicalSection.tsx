'use client';

import type { FC } from 'react';
import { Controller } from 'react-hook-form';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import type { PageFormData } from '../PageForm.types';
import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import styles from '../PageForm.module.scss';
import { FormField } from '../ui/FormField';
import { SeoCollapsible } from '../ui/SeoCollapsible';

export interface SeoTechnicalSectionProps {
  /** React Hook Form register */
  register: UseFormRegister<PageFormData>;
  /** React Hook Form control */
  control: Control<PageFormData>;
  /** Validation errors */
  errors: FieldErrors<PageFormData>;
  /** React Hook Form watch */
  watch: UseFormWatch<PageFormData>;
  /** React Hook Form setValue */
  setValue: UseFormSetValue<PageFormData>;
  /** Loading flag */
  isSubmitting: boolean;
}

/**
 * Technical SEO settings section
 *
 * Contains fields:
 * - Canonical URL (canonical URL)
 * - Robots (directives for search engine robots)
 */
export const SeoTechnicalSection: FC<SeoTechnicalSectionProps> = (props) => {
  const { register, control, errors, watch, setValue, isSubmitting } = props;

  // Robots directive options
  const robotsOptions = [
    { label: 'index, follow (recommended)', value: 'index, follow' },
    { label: 'noindex, follow', value: 'noindex, follow' },
    { label: 'index, nofollow', value: 'index, nofollow' },
    { label: 'noindex, nofollow', value: 'noindex, nofollow' },
  ];

  const handleGenerateCanonicalUrl = () => {
    const currentSlug = watch('slug');
    const currentLang = watch('language');
    if (currentSlug && currentLang) {
      setValue('seoCanonicalUrl', `https://bibliaris.com/${currentLang}/${currentSlug}`);
    }
  };

  return (
    <SeoCollapsible title="Technical SEO (required)">
      <FormField
        error={errors.seoCanonicalUrl?.message}
        hint="Use to avoid duplicate content penalties. Auto-generates based on current page."
        id="seoCanonicalUrl"
        label="Canonical URL"
        required
      >
        <div className={styles.inputWithButton}>
          <Input
            disabled={isSubmitting}
            id="seoCanonicalUrl"
            placeholder="https://example.com/about-us"
            type="url"
            fullWidth
            {...register('seoCanonicalUrl')}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={isSubmitting}
            onClick={handleGenerateCanonicalUrl}
          >
            Use Current URL
          </Button>
        </div>
      </FormField>

      <FormField
        error={errors.seoRobots?.message}
        hint="Control search engine indexing and link following. Default: index, follow"
        id="seoRobots"
        label="Robots Directive"
        required
      >
        <Controller
          name="seoRobots"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={robotsOptions}
              disabled={isSubmitting}
              fullWidth
              error={!!errors.seoRobots}
              ariaLabel="Select robots directive"
            />
          )}
        />
      </FormField>
    </SeoCollapsible>
  );
};
