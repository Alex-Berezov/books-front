'use client';

import { useEffect } from 'react';
import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import type { PageResponse } from '@/types/api-schema';
import styles from './PageForm.module.scss';

/**
 * Схема валидации для формы страницы
 */
const pageSchema = z.object({
  /** Язык страницы */
  language: z.enum(['en', 'es', 'fr', 'pt']),
  /** Тип страницы (обязательное поле!) */
  type: z.enum(['generic', 'category_index', 'author_index']),
  /** Заголовок страницы */
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  /** URL slug страницы */
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
  /** Контент страницы (Markdown) */
  content: z.string().min(1, 'Content is required'),

  // ========================================
  // SEO Fields
  // ========================================

  // Basic Meta Tags
  /** SEO мета-заголовок - будет отправлен как seo.metaTitle */
  seoMetaTitle: z.string().max(60, 'Meta Title should be 50-60 characters'),
  /** SEO мета-описание - будет отправлен как seo.metaDescription */
  seoMetaDescription: z.string().max(160, 'Meta Description should be 120-160 characters'),

  // Technical SEO
  /** Canonical URL для избежания дублирования контента */
  seoCanonicalUrl: z.string(),
  /** Robots meta tag для управления индексацией */
  seoRobots: z.string(),

  // Open Graph (Facebook, LinkedIn)
  /** OG заголовок для соцсетей */
  seoOgTitle: z.string().max(60, 'OG Title is too long'),
  /** OG описание для соцсетей */
  seoOgDescription: z.string().max(160, 'OG Description is too long'),
  /** OG изображение URL (1200x630 рекомендуется) */
  seoOgImageUrl: z.string(),

  // Twitter Card
  /** Тип Twitter карточки (использует metaTitle и metaDescription автоматически) */
  seoTwitterCard: z.enum(['summary', 'summary_large_image', '']),
});

/**
 * Тип данных формы
 */
export type PageFormData = z.infer<typeof pageSchema>;

/**
 * Пропсы компонента формы страницы
 */
export interface PageFormProps {
  /** Текущий язык интерфейса */
  lang: SupportedLang;
  /** Существующие данные страницы (для редактирования) */
  initialData?: PageResponse;
  /** Callback при успешной отправке формы */
  onSubmit: (data: PageFormData) => void | Promise<void>;
  /** Флаг загрузки (например, при отправке на сервер) */
  isSubmitting?: boolean;
}

/**
 * Форма для создания/редактирования CMS страницы
 *
 * Компонент с react-hook-form и zod валидацией.
 * Поддерживает создание новой страницы и редактирование существующей.
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
        // (пользователь может вручную изменить его позже)
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
      {/* Основная информация */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Basic Information</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="language">
            Language *
          </label>
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
          {errors.language && <span className={styles.error}>{errors.language.message}</span>}
          {initialData && (
            <span className={styles.hint}>Language cannot be changed after creation</span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="type">
            Page Type *
          </label>
          <select className={styles.select} disabled={isSubmitting} id="type" {...register('type')}>
            <option value="generic">Generic Page</option>
            <option value="category_index">Category Index</option>
            <option value="author_index">Author Index</option>
          </select>
          {errors.type && <span className={styles.error}>{errors.type.message}</span>}
          <span className={styles.hint}>
            Generic: regular content page | Category/Author Index: special listing pages
          </span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="title">
            Title *
          </label>
          <input
            className={styles.input}
            disabled={isSubmitting}
            id="title"
            placeholder="About Us"
            type="text"
            {...register('title')}
          />
          {errors.title && <span className={styles.error}>{errors.title.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="slug">
            Slug *
          </label>
          <input
            className={styles.input}
            disabled={isSubmitting}
            id="slug"
            placeholder="about-us"
            type="text"
            {...register('slug')}
          />
          {errors.slug && <span className={styles.error}>{errors.slug.message}</span>}
          <span className={styles.hint}>
            URL-friendly identifier (lowercase, hyphens only). Example: about-us
          </span>
        </div>
      </div>

      {/* Контент */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Content</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="content">
            Page Content * (Markdown supported)
          </label>
          <textarea
            className={styles.textarea}
            disabled={isSubmitting}
            id="content"
            placeholder="# About Us&#10;&#10;We are a team of passionate readers..."
            rows={15}
            {...register('content')}
          />
          {errors.content && <span className={styles.error}>{errors.content.message}</span>}
          <span className={styles.hint}>
            You can use Markdown formatting: # Heading, **bold**, *italic*, [link](url), etc.
          </span>
        </div>
      </div>

      {/* SEO Settings */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>SEO Settings</h2>

        {/* Basic Meta Tags */}
        <details className={styles.seoSection} open>
          <summary className={styles.seoSectionTitle}>Basic Meta Tags (required)</summary>
          <div className={styles.seoSectionContent}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="seoMetaTitle">
                Meta Title *
              </label>
              <input
                className={styles.input}
                disabled={isSubmitting}
                id="seoMetaTitle"
                maxLength={60}
                placeholder="About Us - Company Name"
                type="text"
                {...register('seoMetaTitle')}
              />
              {errors.seoMetaTitle && (
                <span className={styles.error}>{errors.seoMetaTitle.message}</span>
              )}
              <div className={styles.fieldFooter}>
                <span className={styles.hint}>
                  Recommended: 50-60 characters. Shows in Google search results.
                </span>
                <span className={styles.charCounter}>
                  {watch('seoMetaTitle')?.length || 0} / 60
                </span>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="seoMetaDescription">
                Meta Description *
              </label>
              <textarea
                className={styles.textarea}
                disabled={isSubmitting}
                id="seoMetaDescription"
                maxLength={160}
                placeholder="Learn more about our company, mission, and team..."
                rows={3}
                {...register('seoMetaDescription')}
              />
              {errors.seoMetaDescription && (
                <span className={styles.error}>{errors.seoMetaDescription.message}</span>
              )}
              <div className={styles.fieldFooter}>
                <span className={styles.hint}>
                  Recommended: 120-160 characters. Shows below title in search results.
                </span>
                <span className={styles.charCounter}>
                  {watch('seoMetaDescription')?.length || 0} / 160
                </span>
              </div>
            </div>
          </div>
        </details>

        {/* Technical SEO */}
        <details className={styles.seoSection}>
          <summary className={styles.seoSectionTitle}>Technical SEO (required)</summary>
          <div className={styles.seoSectionContent}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="seoCanonicalUrl">
                Canonical URL *
              </label>
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
                  onClick={() => {
                    const currentSlug = watch('slug');
                    const currentLang = watch('language');
                    if (currentSlug && currentLang) {
                      // TODO: Заменить на реальный домен из env
                      setValue(
                        'seoCanonicalUrl',
                        `https://bibliaris.com/${currentLang}/${currentSlug}`
                      );
                    }
                  }}
                  type="button"
                >
                  Use Current URL
                </button>
              </div>
              {errors.seoCanonicalUrl && (
                <span className={styles.error}>{errors.seoCanonicalUrl.message}</span>
              )}
              <span className={styles.hint}>
                Use to avoid duplicate content penalties. Auto-generates based on current page.
              </span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="seoRobots">
                Robots Directive *
              </label>
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
              {errors.seoRobots && <span className={styles.error}>{errors.seoRobots.message}</span>}
              <span className={styles.hint}>
                Control search engine indexing and link following. Default: index, follow
              </span>
            </div>
          </div>
        </details>

        {/* Open Graph (Facebook, LinkedIn) */}
        <details className={styles.seoSection}>
          <summary className={styles.seoSectionTitle}>
            Open Graph - Social Media (Facebook, LinkedIn) (required)
          </summary>
          <div className={styles.seoSectionContent}>
            <div className={styles.autoFillNotice}>
              ℹ️ OG Title and Description are auto-filled from Basic Meta Tags
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="seoOgTitle">
                OG Title *
              </label>
              <input
                className={styles.input}
                disabled={isSubmitting}
                id="seoOgTitle"
                maxLength={60}
                placeholder="About Us - Company Name"
                type="text"
                {...register('seoOgTitle')}
              />
              {errors.seoOgTitle && (
                <span className={styles.error}>{errors.seoOgTitle.message}</span>
              )}
              <div className={styles.fieldFooter}>
                <span className={styles.hint}>Title shown when shared on Facebook, LinkedIn.</span>
                <span className={styles.charCounter}>{watch('seoOgTitle')?.length || 0} / 60</span>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="seoOgDescription">
                OG Description *
              </label>
              <textarea
                className={styles.textarea}
                disabled={isSubmitting}
                id="seoOgDescription"
                maxLength={160}
                placeholder="Learn more about our company..."
                rows={3}
                {...register('seoOgDescription')}
              />
              {errors.seoOgDescription && (
                <span className={styles.error}>{errors.seoOgDescription.message}</span>
              )}
              <div className={styles.fieldFooter}>
                <span className={styles.hint}>Description shown when shared on social media.</span>
                <span className={styles.charCounter}>
                  {watch('seoOgDescription')?.length || 0} / 160
                </span>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="seoOgImageUrl">
                OG Image URL *
              </label>
              <input
                className={styles.input}
                disabled={isSubmitting}
                id="seoOgImageUrl"
                placeholder="https://example.com/images/og-image.jpg"
                type="url"
                {...register('seoOgImageUrl')}
              />
              {errors.seoOgImageUrl && (
                <span className={styles.error}>{errors.seoOgImageUrl.message}</span>
              )}
              <span className={styles.hint}>
                Recommended: 1200×630 pixels. Image shown when shared on social media.
              </span>

              {/* Превью изображения */}
              {watch('seoOgImageUrl') && (
                <div className={styles.imagePreview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="OG Image Preview" src={watch('seoOgImageUrl')} />
                </div>
              )}
            </div>
          </div>
        </details>

        {/* Twitter Card */}
        <details className={styles.seoSection}>
          <summary className={styles.seoSectionTitle}>Twitter Card (required)</summary>
          <div className={styles.seoSectionContent}>
            <div className={styles.autoFillNotice}>
              ℹ️ Twitter Title and Description are auto-filled from Basic Meta Tags
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="seoTwitterCard">
                Twitter Card Type *
              </label>
              <select
                className={styles.select}
                disabled={isSubmitting}
                id="seoTwitterCard"
                {...register('seoTwitterCard')}
              >
                <option value="summary">Summary (small image)</option>
                <option value="summary_large_image">Summary Large Image (large image)</option>
              </select>
              {errors.seoTwitterCard && (
                <span className={styles.error}>{errors.seoTwitterCard.message}</span>
              )}
              <span className={styles.hint}>
                Summary: small square image. Summary Large Image: wide image (recommended).
              </span>
              <div className={styles.autoFillNotice}>
                ℹ️ Twitter uses Meta Title and Meta Description automatically
              </div>
            </div>
          </div>
        </details>
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
