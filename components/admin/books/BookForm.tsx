'use client';

import { useEffect } from 'react';
import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
  /** SEO meta title */
  seoMetaTitle: z.string().max(60, 'SEO title is too long').optional(),
  /** SEO meta description */
  seoMetaDescription: z.string().max(160, 'SEO description is too long').optional(),
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
          seoMetaDescription: initialData.seo?.metaDescription || '',
          seoMetaTitle: initialData.seo?.metaTitle || '',
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
          seoMetaDescription: '',
          seoMetaTitle: '',
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
        seoMetaDescription: initialData.seo?.metaDescription || '',
        seoMetaTitle: initialData.seo?.metaTitle || '',
        title: initialData.title,
        type: initialData.type,
      });
    }
  }, [initialData, reset]);

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

        <div className={styles.field}>
          <label className={styles.label} htmlFor="seoMetaTitle">
            Meta Title
          </label>
          <input
            className={styles.input}
            id="seoMetaTitle"
            maxLength={60}
            placeholder="SEO meta title (max 60 characters)"
            type="text"
            {...register('seoMetaTitle')}
          />
          {errors.seoMetaTitle && (
            <span className={styles.error}>{errors.seoMetaTitle.message}</span>
          )}
          <span className={styles.hint}>Recommended: 50-60 characters</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="seoMetaDescription">
            Meta Description
          </label>
          <textarea
            className={styles.textarea}
            id="seoMetaDescription"
            maxLength={160}
            placeholder="SEO meta description (max 160 characters)"
            rows={3}
            {...register('seoMetaDescription')}
          />
          {errors.seoMetaDescription && (
            <span className={styles.error}>{errors.seoMetaDescription.message}</span>
          )}
          <span className={styles.hint}>Recommended: 120-160 characters</span>
        </div>
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
