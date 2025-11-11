/**
 * CMS Pages Endpoints
 *
 * API endpoints for working with static pages (CMS).
 * Pages are used for content like "About Us", "Privacy Policy",
 * "Terms of Service" and other informational pages.
 */

import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  CreatePageRequest,
  PageResponse,
  PaginatedResponse,
  UpdatePageRequest,
} from '@/types/api-schema';

/**
 * Parameters for fetching pages list
 */
export interface GetPagesParams {
  /** Page number (starting from 1) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Search by title or slug */
  search?: string;
  /** Filter by publication status */
  status?: 'draft' | 'published' | 'archived';
  /** Admin interface language (default 'en') */
  lang?: string;
}

/**
 * Get list of all pages (for admin panel)
 *
 * @param params - Request parameters
 * @returns Paginated list of pages
 *
 * @example
 * ```ts
 * const pages = await getPages({ page: 1, limit: 20, status: 'published', lang: 'en' });
 * ```
 */
export const getPages = async (
  params: GetPagesParams = {}
): Promise<PaginatedResponse<PageResponse>> => {
  const { page = 1, limit = 20, search, status, lang = 'en' } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    queryParams.append('search', search);
  }

  if (status) {
    queryParams.append('status', status);
  }

  const endpoint = `/admin/${lang}/pages?${queryParams.toString()}`;
  const response = await httpGetAuth<PaginatedResponse<PageResponse> | PageResponse[]>(endpoint);

  // Temporary workaround: if backend returns array instead of paginated response,
  // wrap it in correct format
  if (Array.isArray(response)) {
    return {
      data: response,
      meta: {
        page,
        limit,
        total: response.length,
        totalPages: Math.ceil(response.length / limit),
      },
    };
  }

  return response;
};

/**
 * Get page details by ID (admin endpoint)
 *
 * IMPORTANT: Uses /admin/pages/:id WITHOUT :lang (like versions)
 *
 * @param pageId - Page ID
 * @returns Detailed information about the page
 *
 * @example
 * ```ts
 * const page = await getPageById('uuid-here');
 * ```
 */
export const getPageById = async (pageId: string): Promise<PageResponse> => {
  const endpoint = `/admin/pages/${pageId}`;
  return httpGetAuth<PageResponse>(endpoint);
};

/**
 * Create a new page
 *
 * @param data - Data for creating the page
 * @param lang - Admin interface language (default 'en')
 * @returns Created page
 *
 * @example
 * ```ts
 * const page = await createPage({
 *   slug: 'about-us',
 *   title: 'About Us',
 *   content: '# About Us\n\nWe are...',
 *   language: 'en'
 * }, 'en');
 * ```
 */
export const createPage = async (data: CreatePageRequest, lang = 'en'): Promise<PageResponse> => {
  const endpoint = `/admin/${lang}/pages`;
  return httpPostAuth<PageResponse>(endpoint, data);
};

/**
 * Update page
 *
 * @param pageId - Page ID
 * @param data - Data for update
 * @param lang - Admin interface language (default 'en')
 * @returns Updated page
 *
 * @example
 * ```ts
 * const page = await updatePage('uuid-here', {
 *   title: 'Updated Title'
 * }, 'en');
 * ```
 */
export const updatePage = async (
  pageId: string,
  data: UpdatePageRequest,
  lang = 'en'
): Promise<PageResponse> => {
  const endpoint = `/admin/${lang}/pages/${pageId}`;
  return httpPatchAuth<PageResponse>(endpoint, data);
};

/**
 * Publish page
 *
 * @param pageId - Page ID
 * @param lang - Admin interface language (default 'en')
 * @returns Updated page with published status
 *
 * @example
 * ```ts
 * await publishPage('uuid-here', 'en');
 * ```
 */
export const publishPage = async (pageId: string, lang = 'en'): Promise<PageResponse> => {
  const endpoint = `/admin/${lang}/pages/${pageId}/publish`;
  return httpPostAuth<PageResponse>(endpoint);
};

/**
 * Unpublish page
 *
 * @param pageId - Page ID
 * @param lang - Admin interface language (default 'en')
 * @returns Updated page with draft status
 *
 * @example
 * ```ts
 * await unpublishPage('uuid-here', 'en');
 * ```
 */
export const unpublishPage = async (pageId: string, lang = 'en'): Promise<PageResponse> => {
  const endpoint = `/admin/${lang}/pages/${pageId}/unpublish`;
  return httpPostAuth<PageResponse>(endpoint);
};

/**
 * Delete page
 *
 * @param pageId - Page ID to delete
 * @param lang - Admin interface language (default 'en')
 *
 * @example
 * ```ts
 * await deletePage('uuid-here', 'en');
 * ```
 */
export const deletePage = async (pageId: string, lang = 'en'): Promise<void> => {
  const endpoint = `/admin/${lang}/pages/${pageId}`;
  return httpDeleteAuth<void>(endpoint);
};
