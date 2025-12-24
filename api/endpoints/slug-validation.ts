/**
 * Slug Validation API
 *
 * Validates slug uniqueness through optimized backend endpoints.
 * Backend endpoints: GET /api/admin/pages/check-slug and GET /api/books/check-slug
 */

import { httpGetAuth } from '@/lib/http-client';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Slug uniqueness validation result
 */
export interface SlugValidationResult {
  /** Validated slug */
  slug: string;
  /** Is the slug unique */
  isUnique: boolean;
  /** Suggested unique slug (if current is taken) */
  suggestedSlug?: string;
  /** Existing page with this slug (if found) */
  existingPage?: {
    id: string;
    title: string;
    status: 'draft' | 'published' | 'archived';
  };
  /** Existing book with this slug (if found) */
  existingBook?: {
    id: string;
    slug: string;
  };
}

/**
 * Backend response for Pages check-slug
 */
interface CheckPageSlugResponse {
  exists: boolean;
  suggestedSlug?: string;
  existingPage?: {
    id: string;
    title: string;
    status: 'draft' | 'published' | 'archived';
  };
}

/**
 * Backend response for Books check-slug
 */
interface CheckBookSlugResponse {
  exists: boolean;
  suggestedSlug?: string;
  existingBook?: {
    id: string;
    slug: string;
  };
}

/**
 * Checks slug uniqueness for Pages
 *
 * Uses optimized backend endpoint:
 * GET /api/admin/pages/check-slug?slug={slug}&lang={lang}&excludeId={id}
 *
 * @param slug - Slug to validate
 * @param lang - Page language
 * @param excludePageId - Page ID to exclude from check (when editing)
 * @returns Uniqueness validation result
 *
 * @example
 * // When creating new page
 * const result = await checkPageSlugUniqueness('about-us', 'en');
 * if (!result.isUnique) {
 *   console.log(`Slug taken! Use: ${result.suggestedSlug}`);
 * }
 *
 * @example
 * // When editing existing page
 * const result = await checkPageSlugUniqueness('about-us', 'en', 'current-page-id');
 * // Will exclude current page from check
 */
export const checkPageSlugUniqueness = async (
  slug: string,
  lang: SupportedLang,
  excludePageId?: string
): Promise<SlugValidationResult> => {
  try {
    const params = new URLSearchParams({ slug, lang });
    if (excludePageId) {
      params.append('excludeId', excludePageId);
    }

    const endpoint = `/admin/pages/check-slug?${params.toString()}`;
    const response = await httpGetAuth<CheckPageSlugResponse>(endpoint);

    return {
      slug,
      isUnique: !response.exists,
      suggestedSlug: response.suggestedSlug,
      existingPage: response.existingPage,
    };
  } catch (error) {
    // In case of error (e.g., no authorization) consider slug unique
    // to not block the form
    console.error('[checkPageSlugUniqueness] Error checking slug:', error);
    return {
      slug,
      isUnique: true,
    };
  }
};

/**
 * Checks slug uniqueness for Books
 *
 * Uses optimized backend endpoint:
 * GET /api/books/check-slug?slug={slug}&excludeId={id}
 *
 * @param slug - Slug to validate
 * @param excludeBookId - Book ID to exclude from check (when editing)
 * @returns Uniqueness validation result
 *
 * @example
 * // When creating new book
 * const result = await checkBookSlugUniqueness('harry-potter');
 * if (!result.isUnique) {
 *   console.log(`Slug taken! Use: ${result.suggestedSlug}`);
 * }
 *
 * @example
 * // When editing book
 * const result = await checkBookSlugUniqueness('harry-potter', 'book-id');
 */
export const checkBookSlugUniqueness = async (
  slug: string,
  excludeBookId?: string
): Promise<SlugValidationResult> => {
  try {
    const params = new URLSearchParams({ slug });
    if (excludeBookId) {
      params.append('excludeId', excludeBookId);
    }

    const endpoint = `/books/check-slug?${params.toString()}`;
    const response = await httpGetAuth<CheckBookSlugResponse>(endpoint);

    return {
      slug,
      isUnique: !response.exists,
      suggestedSlug: response.suggestedSlug,
      existingBook: response.existingBook,
    };
  } catch (error) {
    // In case of error consider slug unique to not block the form
    console.error('[checkBookSlugUniqueness] Error checking slug:', error);
    return {
      slug,
      isUnique: true,
    };
  }
};

/**
 * Checks slug uniqueness for Categories
 *
 * Uses optimized backend endpoint:
 * GET /api/categories/check-slug?slug={slug}&excludeId={id}
 *
 * @param slug - Slug to validate
 * @param excludeCategoryId - Category ID to exclude from check (when editing)
 * @returns Uniqueness validation result
 */
export const checkCategorySlugUniqueness = async (
  slug: string,
  excludeCategoryId?: string
): Promise<SlugValidationResult> => {
  try {
    const params = new URLSearchParams({ slug });
    if (excludeCategoryId) {
      params.append('excludeId', excludeCategoryId);
    }

    const endpoint = `/categories/check-slug?${params.toString()}`;
    const response = await httpGetAuth<{ exists: boolean; suggestedSlug?: string }>(endpoint);

    return {
      slug,
      isUnique: !response.exists,
      suggestedSlug: response.suggestedSlug,
    };
  } catch (error) {
    console.error('[checkCategorySlugUniqueness] Error checking slug:', error);
    return {
      slug,
      isUnique: true,
    };
  }
};
