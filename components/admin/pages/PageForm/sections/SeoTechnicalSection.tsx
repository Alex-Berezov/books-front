'use client';

import type { FC } from 'react';
import type { PageFormData } from '../PageForm.types';
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import styles from '../PageForm.module.scss';
import { FormField } from '../ui/FormField';
import { SeoCollapsible } from '../ui/SeoCollapsible';

export interface SeoTechnicalSectionProps {
  /** React Hook Form register */
  register: UseFormRegister<PageFormData>;
  /** Ошибки валидации */
  errors: FieldErrors<PageFormData>;
  /** React Hook Form watch */
  watch: UseFormWatch<PageFormData>;
  /** React Hook Form setValue */
  setValue: UseFormSetValue<PageFormData>;
  /** Флаг загрузки */
  isSubmitting: boolean;
}

/**
 * Секция технических SEO настроек
 *
 * Содержит поля:
 * - Canonical URL (канонический URL)
 * - Robots (директивы для поисковых роботов)
 */
export const SeoTechnicalSection: FC<SeoTechnicalSectionProps> = (props) => {
  const { register, errors, watch, setValue, isSubmitting } = props;

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
          <input
            className={styles.input}
            disabled={isSubmitting}
            id="seoCanonicalUrl"
            placeholder="https://example.com/about-us"
            type="url"
            {...register('seoCanonicalUrl')}
          />
          <button
            className={styles.inputButton}
            disabled={isSubmitting}
            onClick={handleGenerateCanonicalUrl}
            type="button"
          >
            Use Current URL
          </button>
        </div>
      </FormField>

      <FormField
        error={errors.seoRobots?.message}
        hint="Control search engine indexing and link following. Default: index, follow"
        id="seoRobots"
        label="Robots Directive"
        required
      >
        <select
          className={styles.select}
          disabled={isSubmitting}
          id="seoRobots"
          {...register('seoRobots')}
        >
          <option value="index, follow">index, follow (recommended)</option>
          <option value="noindex, follow">noindex, follow</option>
          <option value="index, nofollow">index, nofollow</option>
          <option value="noindex, nofollow">noindex, nofollow</option>
        </select>
      </FormField>
    </SeoCollapsible>
  );
};
