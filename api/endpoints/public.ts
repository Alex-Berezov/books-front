/**
 * Public API endpoints
 *
 * Contains typed functions for working with public data:
 * books, pages, categories, tags, etc.
 */

import { httpGet } from '@/lib/http';
import { buildLangPath } from '@/lib/http';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  BookOverview,
  PageResponse,
  CategoryBooksResponse,
  TagBooksResponse,
  SeoResolveResponse,
} from '@/types/api-schema';

/**
 * Get book overview
 *
 * @param lang - Language
 * @param slug - Book slug
 * @returns Book overview
 *
 * @example
 * ```ts
 * const book = await getBookOverview('en', 'lord-of-the-rings');
 * ```
 */
export const getBookOverview = async (lang: SupportedLang, slug: string): Promise<BookOverview> => {
  const endpoint = buildLangPath(lang, `/books/${slug}/overview`);
  return httpGet<BookOverview>(endpoint, { language: lang });
};

/**
 * Get CMS page
 *
 * @param lang - Language
 * @param slug - Page slug
 * @returns Page data
 *
 * @example
 * ```ts
 * const page = await getPage('en', 'about-us');
 * ```
 */
export const getPage = async (lang: SupportedLang, slug: string): Promise<PageResponse> => {
  const endpoint = buildLangPath(lang, `/pages/${slug}`);
  return httpGet<PageResponse>(endpoint, { language: lang });
};

/**
 * Get category books
 *
 * @param lang - Language
 * @param slug - Category slug
 * @param page - Page number (optional)
 * @param limit - Items per page (optional)
 * @returns Category books with pagination
 *
 * @example
 * ```ts
 * const result = await getCategoryBooks('en', 'fiction', 1, 20);
 * ```
 */
export const getCategoryBooks = async (
  lang: SupportedLang,
  slug: string,
  page?: number,
  limit?: number
): Promise<CategoryBooksResponse> => {
  const params = new URLSearchParams();
  if (page !== undefined) params.append('page', String(page));
  if (limit !== undefined) params.append('limit', String(limit));

  const queryString = params.toString();
  const endpoint = buildLangPath(
    lang,
    `/categories/${slug}/books${queryString ? `?${queryString}` : ''}`
  );

  return httpGet<CategoryBooksResponse>(endpoint, { language: lang });
};

/**
 * Get books by tag
 *
 * @param lang - Language
 * @param slug - Tag slug
 * @param page - Page number (optional)
 * @param limit - Items per page (optional)
 * @returns Books by tag with pagination
 *
 * @example
 * ```ts
 * const result = await getTagBooks('en', 'fantasy', 1, 20);
 * ```
 */
export const getTagBooks = async (
  lang: SupportedLang,
  slug: string,
  page?: number,
  limit?: number
): Promise<TagBooksResponse> => {
  const params = new URLSearchParams();
  if (page !== undefined) params.append('page', String(page));
  if (limit !== undefined) params.append('limit', String(limit));

  const queryString = params.toString();
  const endpoint = buildLangPath(
    lang,
    `/tags/${slug}/books${queryString ? `?${queryString}` : ''}`
  );

  return httpGet<TagBooksResponse>(endpoint, { language: lang });
};

/**
 * Get SEO data for entity
 *
 * @param lang - Language
 * @param type - Entity type (book, page, category, tag)
 * @param id - Entity ID
 * @returns SEO data
 *
 * @example
 * ```ts
 * const seo = await resolveSeo('en', 'book', 'uuid-here');
 * ```
 */
export const resolveSeo = async (
  lang: SupportedLang,
  type: 'book' | 'page' | 'category' | 'tag',
  id: string
): Promise<SeoResolveResponse> => {
  const endpoint = buildLangPath(lang, `/seo/resolve`);
  const params = new URLSearchParams({ type, id });

  return httpGet<SeoResolveResponse>(`${endpoint}?${params.toString()}`, { language: lang });
};
