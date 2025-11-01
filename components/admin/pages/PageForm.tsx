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
  /** SEO мета-заголовок */
  seoTitle: z.string().max(60, 'SEO title is too long').optional(),
  /** SEO мета-описание */
  seoDescription: z.string().max(160, 'SEO description is too long').optional(),
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
  } = useForm<PageFormData>({
    resolver: zodResolver(pageSchema),
    defaultValues: initialData
      ? {
          language: initialData.language,
          title: initialData.title,
          slug: initialData.slug,
          content: initialData.content,
          seoTitle: initialData.seo?.title || '',
          seoDescription: initialData.seo?.description || '',
        }
      : {
          language: lang,
          title: '',
          slug: '',
          content: '',
          seoTitle: '',
          seoDescription: '',
        },
  });

  // Обновляем форму при изменении initialData
  useEffect(() => {
    if (initialData) {
      reset({
        language: initialData.language,
        title: initialData.title,
        slug: initialData.slug,
        content: initialData.content,
        seoTitle: initialData.seo?.title || '',
        seoDescription: initialData.seo?.description || '',
      });
    }
  }, [initialData, reset]);

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

        <div className={styles.field}>
          <label className={styles.label} htmlFor="seoTitle">
            Meta Title (optional)
          </label>
          <input
            className={styles.input}
            disabled={isSubmitting}
            id="seoTitle"
            placeholder="About Us - Company Name"
            type="text"
            {...register('seoTitle')}
          />
          {errors.seoTitle && <span className={styles.error}>{errors.seoTitle.message}</span>}
          <span className={styles.hint}>Recommended length: 50-60 characters</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="seoDescription">
            Meta Description (optional)
          </label>
          <textarea
            className={styles.textarea}
            disabled={isSubmitting}
            id="seoDescription"
            placeholder="Learn more about our company, mission, and team..."
            rows={3}
            {...register('seoDescription')}
          />
          {errors.seoDescription && (
            <span className={styles.error}>{errors.seoDescription.message}</span>
          )}
          <span className={styles.hint}>Recommended length: 120-160 characters</span>
        </div>
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
