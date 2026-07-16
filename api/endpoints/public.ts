/**
 * Public API endpoints
 *
 * Contains typed functions for working with public data:
 * books, pages, categories, tags, etc.
 */

import { httpGet, buildLangPath } from '@/lib/http';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  AuthorListItem,
  BookOverview,
  PageResponse,
  CategoryBooksResponse,
  TagBooksResponse,
  SeoResolveResponse,
  ChapterDetail,
  PaginatedResponse,
  PublicAuthorDetail,
  RelatedBooksResponse,
} from '@/types/api-schema';

/**
 * Get public chapters list for a book version
 *
 * @param versionId - Book version ID
 * @returns Array of chapters
 */
export const getPublicChapters = async (versionId: string): Promise<ChapterDetail[]> => {
  const endpoint = `/versions/${versionId}/chapters`;
  return httpGet<ChapterDetail[]>(endpoint);
};

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
 * Get related books (compact BookCard) for a book page: same-author + similar-by-category.
 *
 * Returns only the fields required by the BookCard component (no versions/translations/JSON content).
 * `limit` is the maximum total number of unique cards across both blocks (default 8, max 16).
 */
export const getRelatedBooks = async (
  lang: SupportedLang,
  slug: string,
  limit = 8
): Promise<RelatedBooksResponse> => {
  const endpoint = buildLangPath(lang, `/books/${slug}/related?limit=${limit}`);
  return httpGet<RelatedBooksResponse>(endpoint, { language: lang });
};

export interface ReaderBootstrapResponse {
  bookId: string;
  versionId: string;
  slug: string;
  title: string;
  author: string;
  chapters: ChapterDetail[];
  lastProgress: {
    chapterNumber: number | null;
    position: number;
  } | null;
}

/**
 * Get Reader bootstrap data in a single request.
 */
export const getReaderBootstrap = async (
  lang: SupportedLang,
  slug: string,
  userId?: string
): Promise<ReaderBootstrapResponse> => {
  const endpoint = buildLangPath(
    lang,
    `/books/${slug}/reader-bootstrap${userId ? `?userId=${userId}` : ''}`
  );
  return httpGet<ReaderBootstrapResponse>(endpoint, { language: lang });
};

/**
 * Get public list of all books with pagination (without auth requirement)
 */
export const getPublicBooks = async (
  lang: SupportedLang,
  params: { page?: number; limit?: number } = {}
): Promise<PaginatedResponse<BookOverview>> => {
  const { page = 1, limit = 20 } = params;
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const endpoint = buildLangPath(lang, `/books?${queryParams.toString()}`);
  return httpGet<PaginatedResponse<BookOverview>>(endpoint, { language: lang });
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
  type: 'book' | 'page' | 'category' | 'tag' | 'catalog' | 'genre' | 'collection',
  id: string
): Promise<SeoResolveResponse> => {
  const endpoint = buildLangPath(lang, `/seo/resolve`);
  const params = new URLSearchParams({ type, id });

  return httpGet<SeoResolveResponse>(`${endpoint}?${params.toString()}`, { language: lang });
};

/**
 * Get public author detail by slug
 */
export const getPublicAuthorBySlug = async (
  lang: SupportedLang,
  slug: string
): Promise<PublicAuthorDetail> => {
  const endpoint = buildLangPath(lang, `/authors/${slug}`);
  return httpGet<PublicAuthorDetail>(endpoint, { language: lang });
};

/**
 * Get public list of authors
 */
export const getPublicAuthors = async (
  _lang: SupportedLang,
  params: { page?: number; limit?: number } = {}
): Promise<PaginatedResponse<AuthorListItem>> => {
  const { page = 1, limit = 50 } = params;
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const endpoint = buildLangPath(_lang, `/authors?${queryParams.toString()}`);
  return httpGet<PaginatedResponse<AuthorListItem>>(endpoint);
};
