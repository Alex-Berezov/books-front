'use client';

import { useEffect } from 'react';
import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  SeoBasicSection,
  SeoOpenGraphSection,
  SeoTechnicalSection,
  SeoTwitterSection,
} from '@/components/admin/common/SeoSections';
import { SlugInput } from '@/components/common/SlugInput';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import type { BookVersionDetail } from '@/types/api-schema';
import styles from './BookForm.module.scss';

/**
 * Validation schema for book version form
 */
const bookVersionSchema = z.object({
  /** Book slug (URL identifier) */
  bookSlug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  /** Book version language */
  language: z.enum(['en', 'es', 'fr', 'pt']),
  /** Book title */
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  /** Book author */
  author: z.string().min(1, 'Author is required').max(100, 'Author name is too long'),
  /** Book description (required) */
  description: z.string().min(1, 'Description is required').max(2000, 'Description is too long'),
  /** Cover image URL (required) */
  coverImageUrl: z.string().url('Invalid URL').min(1, 'Cover image is required'),
  /** Version type */
  type: z.enum(['text', 'audio', 'referral']),
  /** Whether version is free */
  isFree: z.boolean(),
  /** URL for referral links */
  referralUrl: z.string().url('Invalid URL').optional().or(z.literal('')),

  // ========================================
  // SEO Fields (matching PageForm structure)
  // ========================================

  // Basic Meta Tags
  /** SEO meta title - will be sent as seo.metaTitle */
  seoMetaTitle: z.string().max(60, 'Meta Title should be 50-60 characters'),
  /** SEO meta description - will be sent as seo.metaDescription */
  seoMetaDescription: z.string().max(160, 'Meta Description should be 120-160 characters'),

  // Technical SEO
  /** Canonical URL to avoid duplicate content */
  seoCanonicalUrl: z.string(),
  /** Robots meta tag for indexing control */
  seoRobots: z.string(),

  // Open Graph (Facebook, LinkedIn)
  /** OG title for social media */
  seoOgTitle: z.string().max(60, 'OG Title is too long'),
  /** OG description for social media */
  seoOgDescription: z.string().max(160, 'OG Description is too long'),
  /** OG image URL (1200x630 recommended) */
  seoOgImageUrl: z.string(),

  // Twitter Card
  /** Twitter card type */
  seoTwitterCard: z.enum(['summary', 'summary_large_image', '']),
});

/**
 * Form data type
 */
export type BookFormData = z.infer<typeof bookVersionSchema>;

/**
 * Book form component props
 */
export interface BookFormProps {
  /** Current interface language */
  lang: SupportedLang;
  /** Book ID (for creating new version) */
  bookId?: string;
  /** Existing version data (for editing) */
  initialData?: BookVersionDetail;
  /** Initial title (from URL params) */
  initialTitle?: string;
  /** Initial author (from URL params) */
  initialAuthor?: string;
  /** Callback on successful form submission */
  onSubmit: (data: BookFormData) => void | Promise<void>;
  /** Loading flag (e.g., when submitting to server) */
  isSubmitting?: boolean;
}

/**
 * Form for creating/editing book version
 *
 * Component with react-hook-form and zod validation.
 * Supports creating new version and editing existing one.
 */
export const BookForm: FC<BookFormProps> = (props) => {
  const { lang, initialData, initialTitle, initialAuthor, onSubmit, isSubmitting = false } = props;

  // Initialize form with react-hook-form
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<BookFormData>({
    resolver: zodResolver(bookVersionSchema),
    defaultValues: initialData
      ? {
          bookSlug: initialData.bookSlug || '',
          author: initialData.author,
          coverImageUrl: initialData.coverImageUrl || '',
          description: initialData.description || '',
          isFree: initialData.isFree,
          language: initialData.language,
          referralUrl: initialData.referralUrl || '',
          seoMetaTitle: initialData.seo?.metaTitle || '',
          seoMetaDescription: initialData.seo?.metaDescription || '',
          seoCanonicalUrl: initialData.seo?.canonicalUrl || '',
          seoRobots: initialData.seo?.robots || 'index, follow',
          seoOgTitle: initialData.seo?.ogTitle || '',
          seoOgDescription: initialData.seo?.ogDescription || '',
          seoOgImageUrl: initialData.seo?.ogImageUrl || '',
          seoTwitterCard:
            (initialData.seo?.twitterCard as 'summary' | 'summary_large_image') || 'summary',
          title: initialData.title,
          type: initialData.type,
        }
      : {
          bookSlug: '',
          author: initialAuthor || '',
          coverImageUrl: '',
          description: '',
          isFree: true,
          language: lang,
          referralUrl: '',
          seoMetaTitle: '',
          seoMetaDescription: '',
          seoCanonicalUrl: '',
          seoRobots: 'index, follow',
          seoOgTitle: '',
          seoOgDescription: '',
          seoOgImageUrl: '',
          seoTwitterCard: 'summary',
          title: initialTitle || '',
          type: 'text' as const,
        },
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        bookSlug: initialData.bookSlug || '',
        author: initialData.author,
        coverImageUrl: initialData.coverImageUrl || '',
        description: initialData.description || '',
        isFree: initialData.isFree,
        language: initialData.language,
        referralUrl: initialData.referralUrl || '',
        seoMetaTitle: initialData.seo?.metaTitle || '',
        seoMetaDescription: initialData.seo?.metaDescription || '',
        seoCanonicalUrl: initialData.seo?.canonicalUrl || '',
        seoRobots: initialData.seo?.robots || 'index, follow',
        seoOgTitle: initialData.seo?.ogTitle || '',
        seoOgDescription: initialData.seo?.ogDescription || '',
        seoOgImageUrl: initialData.seo?.ogImageUrl || '',
        seoTwitterCard:
          (initialData.seo?.twitterCard as 'summary' | 'summary_large_image') || 'summary',
        title: initialData.title,
        type: initialData.type,
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
      {/* Basic Information */}
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
          <label className={styles.label} htmlFor="title">
            Title *
          </label>
          <input
            className={styles.input}
            id="title"
            placeholder="Enter book title"
            type="text"
            {...register('title')}
          />
          {errors.title && <span className={styles.error}>{errors.title.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="author">
            Author *
          </label>
          <input
            className={styles.input}
            id="author"
            placeholder="Enter author name"
            type="text"
            {...register('author')}
          />
          {errors.author && <span className={styles.error}>{errors.author.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="bookSlug">
            Book Slug *
          </label>
          <SlugInput
            autoGenerate
            entityType="book"
            error={errors.bookSlug?.message}
            excludeId={initialData?.bookId}
            id="bookSlug"
            onChange={(value) => setValue('bookSlug', value)}
            placeholder="harry-potter"
            showGenerateButton
            sourceValue={watch('title')}
            value={watch('bookSlug')}
          />
          <span className={styles.hint}>
            URL-friendly identifier for the book (lowercase, hyphens only). Example: about-us
          </span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="description">
            Description
          </label>
          <textarea
            className={styles.textarea}
            id="description"
            placeholder="Enter book description"
            rows={5}
            {...register('description')}
          />
          {errors.description && <span className={styles.error}>{errors.description.message}</span>}
        </div>
      </div>

      {/* Media & Type */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Media & Type</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="coverImageUrl">
            Cover Image URL
          </label>
          <input
            className={styles.input}
            id="coverImageUrl"
            placeholder="https://example.com/cover.jpg"
            type="url"
            {...register('coverImageUrl')}
          />
          {errors.coverImageUrl && (
            <span className={styles.error}>{errors.coverImageUrl.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="type">
            Version Type *
          </label>
          <select className={styles.select} id="type" {...register('type')}>
            <option value="text">Text</option>
            <option value="audio">Audio</option>
          </select>
          {errors.type && <span className={styles.error}>{errors.type.message}</span>}
        </div>

        <div className={styles.checkboxField}>
          <input className={styles.checkbox} id="isFree" type="checkbox" {...register('isFree')} />
          <label className={styles.checkboxLabel} htmlFor="isFree">
            This version is free
          </label>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="referralUrl">
            Referral URL (optional)
          </label>
          <input
            className={styles.input}
            id="referralUrl"
            placeholder="https://amazon.com/ref123"
            type="url"
            {...register('referralUrl')}
          />
          {errors.referralUrl && <span className={styles.error}>{errors.referralUrl.message}</span>}
          <span className={styles.hint}>External link for purchasing or more info</span>
        </div>
      </div>

      {/* SEO Settings */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>SEO Settings</h2>

        <SeoBasicSection<BookFormData>
          errors={errors}
          isSubmitting={isSubmitting}
          metaDescriptionField="seoMetaDescription"
          metaTitleField="seoMetaTitle"
          register={register}
          styles={styles}
          watch={watch}
        />

        <SeoTechnicalSection<BookFormData>
          canonicalUrlField="seoCanonicalUrl"
          errors={errors}
          isSubmitting={isSubmitting}
          languageField="language"
          register={register}
          robotsField="seoRobots"
          setValue={setValue}
          slugField="bookSlug"
          styles={styles}
          watch={watch}
        />

        <SeoOpenGraphSection<BookFormData>
          errors={errors}
          isSubmitting={isSubmitting}
          ogDescriptionField="seoOgDescription"
          ogImageUrlField="seoOgImageUrl"
          ogTitleField="seoOgTitle"
          register={register}
          styles={styles}
          watch={watch}
        />

        <SeoTwitterSection<BookFormData>
          errors={errors}
          isSubmitting={isSubmitting}
          register={register}
          styles={styles}
          twitterCardField="seoTwitterCard"
        />
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button className={styles.submitButton} disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving...' : initialData ? 'Update Version' : 'Create Version'}
        </button>
      </div>
    </form>
  );
};
