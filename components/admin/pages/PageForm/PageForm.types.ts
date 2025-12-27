import { z } from 'zod';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PageResponse } from '@/types/api-schema';

/**
 * Validation schema for page form
 */
export const pageSchema = z.object({
  /** Page language */
  language: z.enum(['en', 'es', 'fr', 'pt']),
  /** Page type (required field!) */
  type: z.enum(['generic', 'category_index', 'author_index']),
  /** Page title */
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  /** Page URL slug */
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
  /** Page content (Markdown) */
  content: z.string().min(1, 'Content is required'),

  // ========================================
  // SEO Fields
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
  /** Twitter card type (uses metaTitle and metaDescription automatically) */
  seoTwitterCard: z.enum(['summary', 'summary_large_image', '']),
});

/**
 * Form data type
 */
export type PageFormData = z.infer<typeof pageSchema>;

/**
 * Page form component props
 */
export interface PageFormProps {
  /** Admin interface language */
  lang: SupportedLang;
  /** Initial data for editing */
  initialData?: PageResponse;
  /** Submit handler */
  onSubmit: (data: PageFormData) => Promise<void>;
  /** Loading state */
  isSubmitting?: boolean;
  /** Translation Group ID (for creating new translation) */
  translationGroupId?: string | null;
}
