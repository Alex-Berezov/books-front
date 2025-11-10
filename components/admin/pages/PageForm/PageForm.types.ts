import { z } from 'zod';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PageResponse } from '@/types/api-schema';

/**
 * Схема валидации для формы страницы
 */
export const pageSchema = z.object({
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
