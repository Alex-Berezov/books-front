/**
 * CMS Pages Endpoints
 *
 * API endpoints for working with static pages (CMS).
 * Pages are used for content like "About Us", "Privacy Policy",
 * "Terms of Service" and other informational pages.
 */

import { toListResult, toPaginated } from '@/lib/api/paginated-envelope';
import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  CreatePageRequest,
  PageGroup,
  PageResponse,
  PaginatedResult,
  PublicationStatus,
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
  status?: PublicationStatus;
}

/**
 * Get list of all pages (for admin panel)
 *
 * @param params - Request parameters
 * @returns Paginated list of page groups
 *
 * @example
 * ```ts
 * const pages = await getPages({ page: 1, limit: 20 });
 * ```
 */
export const getPages = async (
  params: GetPagesParams = {}
): Promise<PaginatedResult<PageGroup>> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.append('page', params.page.toString());
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.search) searchParams.append('search', params.search);
  if (params.status) searchParams.append('status', params.status);

  const queryString = searchParams.toString();
  const endpoint = queryString ? `/admin/pages?${queryString}` : '/admin/pages';

  // Форма ответа приводится здесь, а не в экранах: в окне между выкатами сторон
  // сюда приходит прежняя `{data, meta}` (`LEGACY-177`).
  const body = await httpGetAuth<PaginatedResult<PageGroup>>(endpoint);
  return toPaginated(body, { page: params.page ?? 1, limit: params.limit ?? 20 });
};

/**
 * Get page group (translations)
 *
 * @param groupId - Translation Group ID
 * @returns List of pages in the group
 */
export const getPageGroup = async (groupId: string): Promise<PaginatedResult<PageResponse>> => {
  const endpoint = `/admin/pages/group/${groupId}`;
  return toListResult(await httpGetAuth<PageResponse[] | PaginatedResult<PageResponse>>(endpoint));
};

/**
 * Get page by ID
 *
 * @param pageId - Page ID
 * @returns Page details
 */
export const getPageById = async (pageId: string): Promise<PageResponse> => {
  const endpoint = `/admin/pages/${pageId}`;
  return httpGetAuth<PageResponse>(endpoint);
};

/**
 * Create new page
 *
 * @param data - Page data
 * @param lang - Admin interface language (default 'en')
 * @returns Created page
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
 */
export const publishPage = async (pageId: string, lang = 'en'): Promise<PageResponse> => {
  const endpoint = `/admin/${lang}/pages/${pageId}/publish`;
  return httpPatchAuth<PageResponse>(endpoint);
};

/**
 * Unpublish page
 *
 * @param pageId - Page ID
 * @param lang - Admin interface language (default 'en')
 * @returns Updated page with draft status
 */
export const unpublishPage = async (pageId: string, lang = 'en'): Promise<PageResponse> => {
  const endpoint = `/admin/${lang}/pages/${pageId}/unpublish`;
  return httpPatchAuth<PageResponse>(endpoint);
};

/**
 * Delete page
 *
 * @param pageId - Page ID
 * @param lang - Admin interface language (default 'en')
 */
export const deletePage = async (pageId: string, lang = 'en'): Promise<void> => {
  const endpoint = `/admin/${lang}/pages/${pageId}`;
  return httpDeleteAuth(endpoint);
};
