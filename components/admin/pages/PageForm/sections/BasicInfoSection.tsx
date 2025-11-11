'use client';

import type { FC } from 'react';
import { SlugInput } from '@/components/common/SlugInput';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { PageFormData } from '../PageForm.types';
import type { PageResponse } from '@/types/api-schema';
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import styles from '../PageForm.module.scss';
import { FormField } from '../ui/FormField';

export interface BasicInfoSectionProps {
  /** React Hook Form register */
  register: UseFormRegister<PageFormData>;
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
  const { register, errors, watch, setValue, isSubmitting, initialData } = props;

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
          <select
            className={styles.select}
            disabled={!!initialData}
            id="language"
            {...register('language')}
          >
            {SUPPORTED_LANGS.map((langCode) => (
              <option key={langCode} value={langCode}>
                {langCode.toUpperCase()}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          error={errors.type?.message}
          hint="Generic: regular content page | Category/Author Index: special listing pages"
          id="type"
          label="Page Type"
          required
        >
          <select className={styles.select} disabled={isSubmitting} id="type" {...register('type')}>
            <option value="generic">Generic Page</option>
            <option value="category_index">Category Index</option>
            <option value="author_index">Author Index</option>
          </select>
        </FormField>

        <FormField error={errors.title?.message} id="title" label="Title" required>
          <input
            className={styles.input}
            disabled={isSubmitting}
            id="title"
            placeholder="About Us"
            type="text"
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
