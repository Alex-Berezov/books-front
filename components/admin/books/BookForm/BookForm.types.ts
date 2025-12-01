import { z } from 'zod';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookVersionDetail } from '@/types/api-schema';

/**
 * Validation schema for book version form
 */
export const bookVersionSchema = z.object({
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
  /** Form ID for external submission */
  id?: string;
}
