'use client';

import type { FC } from 'react';
import { Controller } from 'react-hook-form';
import { FormField } from '@/components/admin/common/SeoSections';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { SlugInput } from '@/components/common/SlugInput';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { PageFormData } from '../PageForm.types';
import type { PageResponse } from '@/types/api-schema';
import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import styles from '../PageForm.module.scss';

export interface BasicInfoSectionProps {
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
  /** Existing data (for edit mode) */
  initialData?: PageResponse;
}

/**
 * Page basic information section
 *
 * Contains fields:
 * - Language (language selection)
 * - Page Type (page type)
 * - Title (title)
 * - Slug (URL)
 * - Content (Markdown content)
 */
export const BasicInfoSection: FC<BasicInfoSectionProps> = (props) => {
  const { register, control, errors, watch, setValue, isSubmitting, initialData } = props;

  // Language options
  const languageOptions = SUPPORTED_LANGS.map((langCode) => ({
    label: langCode.toUpperCase(),
    value: langCode,
  }));

  // Page type options
  const pageTypeOptions = [
    { label: 'Generic Page', value: 'generic' },
    { label: 'Category Index', value: 'category_index' },
    { label: 'Author Index', value: 'author_index' },
  ];

  return (
    <>
      {/* Basic information */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Basic Information</h2>

        <FormField
          error={errors.language?.message}
          hint={initialData ? 'Language cannot be changed after creation' : undefined}
          id="language"
          label="Language"
          required
        >
          <Controller
            name="language"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                options={languageOptions}
                disabled={!!initialData}
                fullWidth
                error={!!errors.language}
                ariaLabel="Select language"
              />
            )}
          />
        </FormField>

        <FormField
          error={errors.type?.message}
          hint="Generic: regular content page | Category/Author Index: special listing pages"
          id="type"
          label="Page Type"
          required
        >
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                options={pageTypeOptions}
                disabled={isSubmitting}
                fullWidth
                error={!!errors.type}
                ariaLabel="Select page type"
              />
            )}
          />
        </FormField>

        <FormField error={errors.title?.message} id="title" label="Title" required>
          <Input
            disabled={isSubmitting}
            id="title"
            placeholder="About Us"
            type="text"
            fullWidth
            {...register('title')}
          />
        </FormField>

        <FormField error={errors.slug?.message} id="slug" label="Slug" required>
          <SlugInput
            autoGenerate
            entityType="page"
            error={errors.slug?.message}
            excludeId={initialData?.id}
            id="slug"
            lang={watch('language')}
            onChange={(value) => setValue('slug', value)}
            placeholder="about-us"
            showGenerateButton
            sourceValue={watch('title')}
            value={watch('slug')}
          />
        </FormField>
      </div>

      {/* Content */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Content</h2>

        <FormField
          error={errors.content?.message}
          hint="You can use Markdown formatting: # Heading, **bold**, *italic*, [link](url), etc."
          id="content"
          label="Page Content (Markdown supported)"
          required
        >
          <textarea
            className={styles.textarea}
            disabled={isSubmitting}
            id="content"
            placeholder="# About Us&#10;&#10;We are a team of passionate readers..."
            rows={15}
            {...register('content')}
          />
        </FormField>
      </div>
    </>
  );
};
