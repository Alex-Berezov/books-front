'use client';

import { useEffect } from 'react';
import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  SeoBasicSection,
  SeoOpenGraphSection,
  SeoTechnicalSection,
  SeoTwitterSection,
} from '@/components/admin/common/SeoSections';
import { Button } from '@/components/common/Button';
import type { PageFormData, PageFormProps } from './PageForm.types';
import styles from './PageForm.module.scss';
import { pageSchema } from './PageForm.types';
import { BasicInfoSection } from './sections/BasicInfoSection';

// Re-export types for external usage
export type { PageFormData, PageFormProps } from './PageForm.types';

/**
 * Form for creating/editing CMS page
 *
 * Component with react-hook-form and zod validation.
 * Supports creating new page and editing existing one.
 *
 * Decomposed into sections:
 * - BasicInfoSection (language, type, title, slug, content)
 * - SeoBasicSection (metaTitle, metaDescription)
 * - SeoTechnicalSection (canonical, robots)
 * - SeoOpenGraphSection (OG tags)
 * - SeoTwitterSection (Twitter Card)
 */
export const PageForm: FC<PageFormProps> = (props) => {
  const { lang, initialData, onSubmit, isSubmitting = false } = props;

  // Initialize form with react-hook-form
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<PageFormData>({
    resolver: zodResolver(pageSchema),
    mode: 'onSubmit', // Validation only on form submit
    defaultValues: initialData
      ? {
          language: initialData.language,
          type: initialData.type || 'generic',
          title: initialData.title,
          slug: initialData.slug,
          content: initialData.content,
          // SEO fields from backend
          seoMetaTitle: initialData.seo?.metaTitle || '',
          seoMetaDescription: initialData.seo?.metaDescription || '',
          seoCanonicalUrl: initialData.seo?.canonicalUrl || '',
          seoRobots: initialData.seo?.robots || 'index, follow',
          seoOgTitle: initialData.seo?.ogTitle || '',
          seoOgDescription: initialData.seo?.ogDescription || '',
          seoOgImageUrl: initialData.seo?.ogImageUrl || '',
          seoTwitterCard:
            (initialData.seo?.twitterCard as 'summary' | 'summary_large_image') || 'summary',
        }
      : {
          language: lang,
          type: 'generic',
          title: '',
          slug: '',
          content: '',
          // SEO default values
          seoMetaTitle: '',
          seoMetaDescription: '',
          seoCanonicalUrl: '',
          seoRobots: 'index, follow',
          seoOgTitle: '',
          seoOgDescription: '',
          seoOgImageUrl: '',
          seoTwitterCard: 'summary',
        },
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        language: initialData.language,
        type: initialData.type || 'generic',
        title: initialData.title,
        slug: initialData.slug,
        content: initialData.content,
        seoMetaTitle: initialData.seo?.metaTitle || '',
        seoMetaDescription: initialData.seo?.metaDescription || '',
        seoCanonicalUrl: initialData.seo?.canonicalUrl || '',
        seoRobots: initialData.seo?.robots || 'index, follow',
        seoOgTitle: initialData.seo?.ogTitle || '',
        seoOgDescription: initialData.seo?.ogDescription || '',
        seoOgImageUrl: initialData.seo?.ogImageUrl || '',
        seoTwitterCard:
          (initialData.seo?.twitterCard as 'summary' | 'summary_large_image') || 'summary',
      });
    }
  }, [initialData, reset]);

  // Auto-fill OG and Twitter fields when entering Meta Title and Meta Description
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      // Auto-fill on Meta Title input
      if (name === 'seoMetaTitle') {
        const newTitle = value.seoMetaTitle || '';
        // Always sync OG Title with Meta Title
        setValue('seoOgTitle', newTitle, { shouldValidate: false, shouldDirty: false });
      }

      // Auto-fill on Meta Description input
      if (name === 'seoMetaDescription') {
        const newDescription = value.seoMetaDescription || '';
        // Always sync OG Description with Meta Description
        setValue('seoOgDescription', newDescription, { shouldValidate: false, shouldDirty: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      {/* Basic information and content */}
      <BasicInfoSection
        errors={errors}
        initialData={initialData}
        isSubmitting={isSubmitting}
        register={register}
        setValue={setValue}
        watch={watch}
      />

      {/* SEO Settings */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>SEO Settings</h2>

        <SeoBasicSection<PageFormData>
          errors={errors}
          isSubmitting={isSubmitting}
          metaDescriptionField="seoMetaDescription"
          metaTitleField="seoMetaTitle"
          register={register}
          styles={styles}
          watch={watch}
        />

        <SeoTechnicalSection<PageFormData>
          canonicalUrlField="seoCanonicalUrl"
          errors={errors}
          isSubmitting={isSubmitting}
          languageField="language"
          register={register}
          robotsField="seoRobots"
          setValue={setValue}
          slugField="slug"
          styles={styles}
          watch={watch}
        />

        <SeoOpenGraphSection<PageFormData>
          errors={errors}
          isSubmitting={isSubmitting}
          ogDescriptionField="seoOgDescription"
          ogImageUrlField="seoOgImageUrl"
          ogTitleField="seoOgTitle"
          register={register}
          styles={styles}
          watch={watch}
        />

        <SeoTwitterSection<PageFormData>
          errors={errors}
          isSubmitting={isSubmitting}
          register={register}
          styles={styles}
          twitterCardField="seoTwitterCard"
        />
      </div>

      {/* Submit Button */}
      <div className={styles.actions}>
        <Button type="submit" loading={isSubmitting} loadingText="Saving...">
          {initialData ? 'Update Page' : 'Create Page'}
        </Button>
      </div>
    </form>
  );
};
