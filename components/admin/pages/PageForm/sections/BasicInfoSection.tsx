'use client';

import type { FC } from 'react';
import { Controller } from 'react-hook-form';
import { FormField } from '@/components/admin/common/SeoSections';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { RichTextEditor } from '@/components/common/RichTextEditor';
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
    { label: 'Homepage', value: 'homepage' },
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
          hint="Use the toolbar to format the content: headings, lists, links, quotes, etc."
          id="content"
          label="Page Content"
          required
        >
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <RichTextEditor
                id="content"
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isSubmitting}
                placeholder="About Us..."
                error={!!errors.content}
                minHeight="320px"
              />
            )}
          />
        </FormField>
      </div>

      {/* SEO Content Fields */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>SEO Content</h2>
        <p className={styles.hint}>
          These fields power taxonomy overview pages (categories, genres, collections, tags).
        </p>

        <FormField
          error={errors.h1?.message}
          hint="Overrides the title as the main H1 heading on the page."
          id="h1"
          label="H1 Heading"
        >
          <Input
            disabled={isSubmitting}
            id="h1"
            placeholder="Browse Book Categories"
            type="text"
            fullWidth
            {...register('h1')}
          />
        </FormField>

        <FormField
          error={errors.shortDescription?.message}
          hint="Short text shown below the H1 in the hero section."
          id="shortDescription"
          label="Short Description"
        >
          <textarea
            className={styles.textarea}
            disabled={isSubmitting}
            id="shortDescription"
            placeholder="Explore book categories on Bibliaris..."
            rows={3}
            {...register('shortDescription')}
          />
        </FormField>

        {/* FAQ section */}
        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <label className={styles.label}>FAQ</label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const current = watch('faq') || [];
                setValue('faq', [...current, { question: '', answer: '' }], {
                  shouldValidate: false,
                });
              }}
            >
              + Add FAQ
            </Button>
          </div>
          <span className={styles.hint}>Frequently asked questions about this page.</span>
          {(watch('faq') || []).map((item, idx) => (
            <div key={idx} className={styles.faqBlock}>
              <div className={styles.faqInputs}>
                <Input
                  value={item.question}
                  onChange={(e) => {
                    const list = [...(watch('faq') || [])];
                    list[idx] = { ...list[idx], question: e.target.value };
                    setValue('faq', list, { shouldValidate: false });
                  }}
                  placeholder="Question"
                  fullWidth
                />
                <Input
                  value={item.answer}
                  onChange={(e) => {
                    const list = [...(watch('faq') || [])];
                    list[idx] = { ...list[idx], answer: e.target.value };
                    setValue('faq', list, { shouldValidate: false });
                  }}
                  placeholder="Answer"
                  fullWidth
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const list = (watch('faq') || []).filter((_, i) => i !== idx);
                  setValue('faq', list, { shouldValidate: false });
                }}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
