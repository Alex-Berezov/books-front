'use client';

import type { FC } from 'react';
import { Controller } from 'react-hook-form';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import type {
  Control,
  FieldErrors,
  FieldValues,
  Path,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import { FormField } from './ui/FormField';
import { SeoCollapsible } from './ui/SeoCollapsible';

export interface SeoTechnicalSectionProps<TFormData extends FieldValues> {
  /** React Hook Form register */
  register: UseFormRegister<TFormData>;
  /** React Hook Form control */
  control: Control<TFormData>;
  /** Validation errors */
  errors: FieldErrors<TFormData>;
  /** React Hook Form watch */
  watch: UseFormWatch<TFormData>;
  /** React Hook Form setValue */
  setValue: UseFormSetValue<TFormData>;
  /** Loading flag */
  isSubmitting: boolean;
  /** Path to canonicalUrl field in form data */
  canonicalUrlField: Path<TFormData>;
  /** Path to robots field in form data */
  robotsField: Path<TFormData>;
  /** Path to slug field (for canonical URL generation) */
  slugField: Path<TFormData>;
  /** Path to language field (for canonical URL generation) */
  languageField: Path<TFormData>;
  /** Base URL for canonical URL generation */
  baseUrl?: string;
  /** Styles object with CSS module classes */
  styles: Record<string, string>;
}

/**
 * Technical SEO settings section (generic)
 *
 * Contains fields:
 * - Canonical URL (canonical URL)
 * - Robots (directives for search engine robots)
 *
 * Can be used for Pages, Books, Categories, etc.
 */
export const SeoTechnicalSection = <TFormData extends FieldValues>(
  props: SeoTechnicalSectionProps<TFormData>
): ReturnType<FC> => {
  const {
    register,
    control,
    errors,
    watch,
    setValue,
    isSubmitting,
    canonicalUrlField,
    robotsField,
    slugField,
    languageField,
    baseUrl = 'https://bibliaris.com',
    styles,
  } = props;

  // Robots directive options
  const robotsOptions = [
    { label: 'index, follow (recommended)', value: 'index, follow' },
    { label: 'noindex, follow', value: 'noindex, follow' },
    { label: 'index, nofollow', value: 'index, nofollow' },
    { label: 'noindex, nofollow', value: 'noindex, nofollow' },
  ];

  const handleGenerateCanonicalUrl = () => {
    const currentSlug = watch(slugField) as string;
    const currentLang = watch(languageField) as string;
    if (currentSlug && currentLang) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue(canonicalUrlField, `${baseUrl}/${currentLang}/${currentSlug}` as any);
    }
  };

  return (
    <SeoCollapsible title="Technical SEO (required)">
      <FormField
        error={errors[canonicalUrlField]?.message as string | undefined}
        hint="Use to avoid duplicate content penalties. Auto-generates based on current page."
        id={canonicalUrlField}
        label="Canonical URL"
        required
      >
        <div className={styles.inputWithButton}>
          <Input
            disabled={isSubmitting}
            id={canonicalUrlField}
            placeholder="https://example.com/about-us"
            type="url"
            fullWidth
            {...register(canonicalUrlField)}
          />
          <Button
            variant="secondary"
            size="md"
            disabled={isSubmitting}
            onClick={handleGenerateCanonicalUrl}
          >
            Use Current URL
          </Button>
        </div>
      </FormField>

      <FormField
        error={errors[robotsField]?.message as string | undefined}
        hint="Control search engine indexing and link following. Default: index, follow"
        id={robotsField}
        label="Robots Directive"
        required
      >
        <Controller
          name={robotsField}
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={robotsOptions}
              disabled={isSubmitting}
              fullWidth
              error={!!errors[robotsField]}
              ariaLabel="Select robots directive"
            />
          )}
        />
      </FormField>
    </SeoCollapsible>
  );
};
