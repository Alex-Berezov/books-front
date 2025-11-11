/**
 * Tags Endpoints
 *
 * API endpoints for working with tags.
 * Tags are used for simple classification of books without hierarchy
 * (e.g., "motivation", "business", "self-development").
 */

import { httpDeleteAuth, httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type { AttachTagRequest, PaginatedResponse, Tag } from '@/types/api-schema';

/**
 * Parameters for fetching tags list
 */
export interface GetTagsParams {
  /** Page number (starting from 1) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Search by name */
  search?: string;
}

/**
 * Get list of tags
 *
 * @param params - Request parameters
 * @returns Paginated list of tags
 *
 * @example
 * ```ts
 * const tags = await getTags({ page: 1, limit: 50, search: 'motiv' });
 * ```
 */
export const getTags = async (params: GetTagsParams = {}): Promise<PaginatedResponse<Tag>> => {
  const { page = 1, limit = 50, search } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    queryParams.append('search', search);
  }

  const endpoint = `/tags?${queryParams.toString()}`;
  return httpGetAuth<PaginatedResponse<Tag>>(endpoint);
};

/**
 * Attach tag to book version
 *
 * @param versionId - Book version ID
 * @param tagId - Tag ID
 *
 * @example
 * ```ts
 * await attachTag('version-uuid', 'tag-uuid');
 * ```
 */
export const attachTag = async (versionId: string, tagId: string): Promise<void> => {
  const endpoint = `/versions/${versionId}/tags`;
  const data: AttachTagRequest = { tagId };
  return httpPostAuth<void>(endpoint, data);
};

/**
 * Detach tag from book version
 *
 * @param versionId - Book version ID
 * @param tagId - Tag ID
 *
 * @example
 * ```ts
 * await detachTag('version-uuid', 'tag-uuid');
 * ```
 */
export const detachTag = async (versionId: string, tagId: string): Promise<void> => {
  const endpoint = `/versions/${versionId}/tags/${tagId}`;
  return httpDeleteAuth<void>(endpoint);
};
