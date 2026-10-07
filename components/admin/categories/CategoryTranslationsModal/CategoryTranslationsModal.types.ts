import { z } from 'zod';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { httpUrlOrEmpty } from '@/lib/utils/http-url-field';
import { isSlugLengthAllowed } from '@/lib/utils/slug';

/**
 * Validation schema for category translation form.
 *
 * In addition to the core `name`/`slug` pair the form exposes:
 * - `description`  — long-form content (HTML) rendered on the public
 *   category page in the given language;
 * - `seo*`         — SEO metadata for that localized category page,
 *   mapped to the shared `SeoInput` contract on submit.
 *
 * @param keptSlug - слаг редактируемого перевода; на создании не задаётся, и предел длины слага
 *   действует всегда. На правке предел — только у изменённого слага (`isSlugLengthAllowed`).
 */
export const buildTranslationSchema = (keptSlug?: string) =>
  z.object({
    language: z.enum(SUPPORTED_LANGS),
    name: z.string().min(1, 'Name is required'),
    slug: z
      .string()
      .min(1, 'Slug is required')
      .refine((slug) => isSlugLengthAllowed(slug, keptSlug), 'Slug is too long'),

    /** Long description/content shown on the public category page */
    description: z.string(),

    /** H1 heading for the page */
    h1: z.string(),

    /** Short description for cards/lists */
    shortDescription: z.string(),

    /** FAQ items */
    faq: z.array(z.object({ question: z.string(), answer: z.string() })),

    // ========================================
    // SEO Fields (optional — category pages don't always need full SEO)
    // ========================================
    seoMetaTitle: z.string().max(60, 'Meta Title should be 50-60 characters'),
    seoMetaDescription: z.string().max(160, 'Meta Description should be 120-160 characters'),
    seoCanonicalUrl: httpUrlOrEmpty,
    seoRobots: z.string(),
    seoOgTitle: z.string().max(60, 'OG Title is too long'),
    seoOgDescription: z.string().max(160, 'OG Description is too long'),
    seoOgImageUrl: httpUrlOrEmpty,
    seoOgImageAlt: z.string(),
    seoTwitterCard: z.enum(['summary', 'summary_large_image', '']),
  });

/** Схема создания перевода: предел длины слага действует всегда. */
export const translationSchema = buildTranslationSchema();

export type TranslationFormData = z.infer<typeof translationSchema>;
