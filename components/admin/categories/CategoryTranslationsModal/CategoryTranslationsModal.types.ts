import { z } from 'zod';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';

/**
 * Validation schema for category translation form.
 *
 * In addition to the core `name`/`slug` pair the form exposes:
 * - `description`  — long-form content (HTML) rendered on the public
 *   category page in the given language;
 * - `seo*`         — SEO metadata for that localized category page,
 *   mapped to the shared `SeoInput` contract on submit.
 */
export const translationSchema = z.object({
  language: z.enum(SUPPORTED_LANGS),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),

  /** Long description/content shown on the public category page */
  description: z.string(),

  // ========================================
  // SEO Fields (optional — category pages don't always need full SEO)
  // ========================================
  seoMetaTitle: z.string().max(60, 'Meta Title should be 50-60 characters'),
  seoMetaDescription: z.string().max(160, 'Meta Description should be 120-160 characters'),
  seoCanonicalUrl: z.string(),
  seoRobots: z.string(),
  seoOgTitle: z.string().max(60, 'OG Title is too long'),
  seoOgDescription: z.string().max(160, 'OG Description is too long'),
  seoOgImageUrl: z.string(),
  seoTwitterCard: z.enum(['summary', 'summary_large_image', '']),
});

export type TranslationFormData = z.infer<typeof translationSchema>;
