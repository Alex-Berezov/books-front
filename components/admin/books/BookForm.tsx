'use client';

import { useEffect } from 'react';
import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import type { BookVersionDetail, VersionType } from '@/types/api-schema';
import styles from './BookForm.module.scss';

/**
 * Схема валидации для формы версии книги
 */
const bookVersionSchema = z.object({
  /** Язык версии книги */
  language: z.enum(['en', 'es', 'fr', 'pt']),
  /** Название книги */
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  /** Автор книги */
  author: z.string().min(1, 'Author is required').max(100, 'Author name is too long'),
  /** Описание книги */
  description: z.string().max(2000, 'Description is too long').optional(),
  /** URL обложки */
  coverImageUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  /** Тип версии */
  type: z.enum(['text', 'audio']),
  /** Бесплатная ли версия */
  isFree: z.boolean(),
  /** URL для реферальных ссылок */
  referralUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  /** SEO мета-заголовок */
  seoMetaTitle: z.string().max(60, 'SEO title is too long').optional(),
  /** SEO мета-описание */
  seoMetaDescription: z.string().max(160, 'SEO description is too long').optional(),
});

/**
 * Тип данных формы
 */
export type BookFormData = z.infer<typeof bookVersionSchema>;

/**
 * Пропсы компонента формы книги
 */
export interface BookFormProps {
  /** Текущий язык интерфейса */
  lang: SupportedLang;
  /** ID книги (для создания новой версии) */
  bookId?: string;
  /** Существующие данные версии (для редактирования) */
  initialData?: BookVersionDetail;
  /** Callback при успешной отправке формы */
  onSubmit: (data: BookFormData) => void | Promise<void>;
  /** Флаг загрузки (например, при отправке на сервер) */
  isSubmitting?: boolean;
}

/**
 * Форма для создания/редактирования версии книги
 *
 * Компонент с react-hook-form и zod валидацией.
 * Поддерживает создание новой версии и редактирование существующей.
 */
export const BookForm: FC<BookFormProps> = (props) => {
  const { lang, initialData, onSubmit, isSubmitting = false } = props;

  // Инициализируем форму с react-hook-form
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<BookFormData>({
    resolver: zodResolver(bookVersionSchema),
    defaultValues: initialData
      ? {
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
          isFree: true,
          language: lang,
          type: 'text' as VersionType,
        },
  });

  // Обновляем форму при изменении initialData
  useEffect(() => {
    if (initialData) {
      reset({
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

      {/* Медиа и тип */}
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

      {/* SEO настройки */}
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

      {/* Кнопки действий */}
      <div className={styles.actions}>
        <button className={styles.submitButton} disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving...' : initialData ? 'Update Version' : 'Create Version'}
        </button>
      </div>
    </form>
  );
};
