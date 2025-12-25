/**
 * Tags Endpoints
 *
 * API endpoints for working with tags.
 * Tags are used for simple classification of books without hierarchy
 * (e.g., "motivation", "business", "self-development").
 */

import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type {
  AttachTagRequest,
  CreateTagRequest,
  PaginatedResponse,
  Tag,
  UpdateTagRequest,
} from '@/types/api-schema';

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
 * @returns Paginated list of tags or array of tags
 *
 * @example
 * ```ts
 * const tags = await getTags({ page: 1, limit: 50, search: 'motiv' });
 * ```
 */
export const getTags = async (
  params: GetTagsParams = {}
): Promise<PaginatedResponse<Tag> | Tag[]> => {
  const { page = 1, limit = 50, search } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    queryParams.append('search', search);
  }

  const endpoint = `/tags?${queryParams.toString()}`;
  return httpGetAuth<PaginatedResponse<Tag> | Tag[]>(endpoint);
};

/**
 * Create a new tag
 *
 * @param data - Tag data
 * @returns Created tag
 */
export const createTag = async (data: CreateTagRequest): Promise<Tag> => {
  return httpPostAuth<Tag>('/tags', data);
};

/**
 * Update an existing tag
 *
 * @param id - Tag ID
 * @param data - Updated data
 * @returns Updated tag
 */
export const updateTag = async (id: string, data: UpdateTagRequest): Promise<Tag> => {
  return httpPatchAuth<Tag>(`/tags/${id}`, data);
};

/**
 * Delete a tag
 *
 * @param id - Tag ID
 */
export const deleteTag = async (id: string): Promise<void> => {
  return httpDeleteAuth<void>(`/tags/${id}`);
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
