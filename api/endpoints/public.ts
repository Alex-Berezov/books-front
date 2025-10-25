/**
 * Публичные эндпоинты API
 *
 * Содержит типизированные функции для работы с публичными данными:
 * книги, страницы, категории, теги и т.д.
 */

import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  BookOverview,
  PageResponse,
  CategoryBooksResponse,
  TagBooksResponse,
  SeoResolveResponse,
} from '@/types/api-schema';
import { httpGet } from '@/lib/http';
import { buildLangPath } from '@/lib/http';

/**
 * Получить обзор книги
 *
 * @param lang - Язык
 * @param slug - Slug книги
 * @returns Обзор книги
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
 * Получить CMS страницу
 *
 * @param lang - Язык
 * @param slug - Slug страницы
 * @returns Данные страницы
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
 * Получить книги категории
 *
 * @param lang - Язык
 * @param slug - Slug категории
 * @param page - Номер страницы (опционально)
 * @param limit - Лимит на страницу (опционально)
 * @returns Книги категории с пагинацией
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
 * Получить книги по тегу
 *
 * @param lang - Язык
 * @param slug - Slug тега
 * @param page - Номер страницы (опционально)
 * @param limit - Лимит на страницу (опционально)
 * @returns Книги по тегу с пагинацией
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
 * Получить SEO данные для сущности
 *
 * @param lang - Язык
 * @param type - Тип сущности (book, page, category, tag)
 * @param id - ID сущности
 * @returns SEO данные
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
