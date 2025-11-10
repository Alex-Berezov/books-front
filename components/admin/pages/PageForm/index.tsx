'use client';

import { useEffect } from 'react';
import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { PageFormData, PageFormProps } from './PageForm.types';
import styles from './PageForm.module.scss';
import { pageSchema } from './PageForm.types';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { SeoBasicSection } from './sections/SeoBasicSection';
import { SeoOpenGraphSection } from './sections/SeoOpenGraphSection';
import { SeoTechnicalSection } from './sections/SeoTechnicalSection';
import { SeoTwitterSection } from './sections/SeoTwitterSection';

// Re-export types for external usage
export type { PageFormData, PageFormProps } from './PageForm.types';

/**
 * Форма для создания/редактирования CMS страницы
 *
 * Компонент с react-hook-form и zod валидацией.
 * Поддерживает создание новой страницы и редактирование существующей.
 *
 * Декомпозирован на секции:
 * - BasicInfoSection (язык, тип, заголовок, slug, контент)
 * - SeoBasicSection (metaTitle, metaDescription)
 * - SeoTechnicalSection (canonical, robots)
 * - SeoOpenGraphSection (OG tags)
 * - SeoTwitterSection (Twitter Card)
 */
export const PageForm: FC<PageFormProps> = (props) => {
  const { lang, initialData, onSubmit, isSubmitting = false } = props;

  // Инициализируем форму с react-hook-form
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<PageFormData>({
    resolver: zodResolver(pageSchema),
    mode: 'onSubmit', // Валидация только при отправке формы
    defaultValues: initialData
      ? {
          language: initialData.language,
          type: initialData.type || 'generic',
          title: initialData.title,
          slug: initialData.slug,
          content: initialData.content,
          // SEO поля из backend
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
          // SEO дефолтные значения
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

  // Обновляем форму при изменении initialData
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

  // Автозаполнение OG и Twitter полей при вводе Meta Title и Meta Description
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      // Автозаполнение при вводе Meta Title
      if (name === 'seoMetaTitle') {
        const newTitle = value.seoMetaTitle || '';
        // Всегда синхронизируем OG Title с Meta Title
        setValue('seoOgTitle', newTitle, { shouldValidate: false, shouldDirty: false });
      }

      // Автозаполнение при вводе Meta Description
      if (name === 'seoMetaDescription') {
        const newDescription = value.seoMetaDescription || '';
        // Всегда синхронизируем OG Description с Meta Description
        setValue('seoOgDescription', newDescription, { shouldValidate: false, shouldDirty: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      {/* Основная информация и контент */}
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

        <SeoBasicSection
          errors={errors}
          isSubmitting={isSubmitting}
          register={register}
          watch={watch}
        />

        <SeoTechnicalSection
          errors={errors}
          isSubmitting={isSubmitting}
          register={register}
          setValue={setValue}
          watch={watch}
        />

        <SeoOpenGraphSection
          errors={errors}
          isSubmitting={isSubmitting}
          register={register}
          watch={watch}
        />

        <SeoTwitterSection errors={errors} isSubmitting={isSubmitting} register={register} />
      </div>

      {/* Submit Button */}
      <div className={styles.actions}>
        <button className={styles.submitButton} disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving...' : initialData ? 'Update Page' : 'Create Page'}
        </button>
      </div>
    </form>
  );
};
