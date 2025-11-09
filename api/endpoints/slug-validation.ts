/**
 * Slug Validation API
 *
 * Проверка уникальности slug через оптимизированные backend endpoints.
 * Backend endpoints: GET /api/admin/pages/check-slug и GET /api/books/check-slug
 */

import { httpGetAuth } from '@/lib/http-client';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Результат проверки уникальности slug
 */
export interface SlugValidationResult {
  /** Проверяемый slug */
  slug: string;
  /** Является ли slug уникальным */
  isUnique: boolean;
  /** Предлагаемый уникальный slug (если текущий занят) */
  suggestedSlug?: string;
  /** Существующая страница с таким slug (если найдена) */
  existingPage?: {
    id: string;
    title: string;
    status: 'draft' | 'published' | 'archived';
  };
  /** Существующая книга с таким slug (если найдена) */
  existingBook?: {
    id: string;
    slug: string;
  };
}

/**
 * Backend response для Pages check-slug
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
 * Backend response для Books check-slug
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
 * Проверяет уникальность slug для страниц (Pages)
 *
 * Использует оптимизированный backend endpoint:
 * GET /api/admin/pages/check-slug?slug={slug}&lang={lang}&excludeId={id}
 *
 * @param slug - Проверяемый slug
 * @param lang - Язык страницы
 * @param excludePageId - ID страницы, которую нужно исключить из проверки (при редактировании)
 * @returns Результат проверки уникальности
 *
 * @example
 * // При создании новой страницы
 * const result = await checkPageSlugUniqueness('about-us', 'en');
 * if (!result.isUnique) {
 *   console.log(`Slug занят! Используйте: ${result.suggestedSlug}`);
 * }
 *
 * @example
 * // При редактировании существующей страницы
 * const result = await checkPageSlugUniqueness('about-us', 'en', 'current-page-id');
 * // Исключит текущую страницу из проверки
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
    // В случае ошибки (например, нет авторизации) считаем slug уникальным
    // чтобы не блокировать форму
    console.error('[checkPageSlugUniqueness] Error checking slug:', error);
    return {
      slug,
      isUnique: true,
    };
  }
};

/**
 * Проверяет уникальность slug для книг (Books)
 *
 * Использует оптимизированный backend endpoint:
 * GET /api/books/check-slug?slug={slug}&excludeId={id}
 *
 * @param slug - Проверяемый slug
 * @param excludeBookId - ID книги, которую нужно исключить из проверки (при редактировании)
 * @returns Результат проверки уникальности
 *
 * @example
 * // При создании новой книги
 * const result = await checkBookSlugUniqueness('harry-potter');
 * if (!result.isUnique) {
 *   console.log(`Slug занят! Используйте: ${result.suggestedSlug}`);
 * }
 *
 * @example
 * // При редактировании книги
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
    // В случае ошибки считаем slug уникальным чтобы не блокировать форму
    console.error('[checkBookSlugUniqueness] Error checking slug:', error);
    return {
      slug,
      isUnique: true,
    };
  }
};
