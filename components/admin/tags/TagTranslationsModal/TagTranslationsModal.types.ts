import { z } from 'zod';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { httpUrlOrEmpty } from '@/lib/utils/http-url-field';
import { isSlugLengthAllowed } from '@/lib/utils/slug';

/**
 * Validation schema for tag translation form.
 *
 * In addition to the core `name`/`slug` pair the form exposes:
 * - `description`  — long-form content (HTML) rendered on the public
 *   tag page in the given language;
 * - `seo*`         — SEO metadata for that localized tag page,
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

    /** Long description/content shown on the public tag page */
    description: z.string(),

    /** H1 heading for the page */
    h1: z.string(),

    /** Short description for cards/lists */
    shortDescription: z.string(),

    /** FAQ items */
    faq: z.array(z.object({ question: z.string(), answer: z.string() })),

    /** Related category slugs (line-by-line textarea → array) */
    relatedCategorySlugs: z.string(),
    /** Related collection slugs (line-by-line textarea → array) */
    relatedCollectionSlugs: z.string(),

    // ========================================
    // SEO Fields (optional — tag pages don't always need full SEO)
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

    /**
     * Editorial indexing switch of this translation (`TagTranslation.indexable`).
     * The page is indexed only when the tag, this flag and the automatic
     * book-count flag all allow it (`LEGACY-422`, `T73`).
     */
    indexable: z.boolean(),
  });

/** Схема создания перевода: предел длины слага действует всегда. */
export const translationSchema = buildTranslationSchema();

export type TranslationFormData = z.infer<typeof translationSchema>;

/**
 * Convert a string[] to a newline-separated string for textarea display.
 */
export const arrayToTextarea = (arr?: string[] | null): string =>
  Array.isArray(arr) ? arr.join('\n') : '';

/**
 * Convert a newline-separated textarea string to string[] (trimmed, non-empty).
 */
export const textareaToArray = (text: string): string[] =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
