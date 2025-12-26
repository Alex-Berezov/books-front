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
  TagTranslation,
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
 */
export const detachTag = async (versionId: string, tagId: string): Promise<void> => {
  const endpoint = `/versions/${versionId}/tags/${tagId}`;
  return httpDeleteAuth<void>(endpoint);
};

/**
 * Get tag translations
 *
 * @param id - Tag ID
 * @returns List of translations
 */
export const getTagTranslations = async (id: string): Promise<TagTranslation[]> => {
  return httpGetAuth<TagTranslation[]>(`/tags/${id}/translations`);
};

/**
 * Create tag translation
 *
 * @param id - Tag ID
 * @param data - Translation data
 * @returns Created translation
 */
export const createTagTranslation = async (
  id: string,
  data: TagTranslation
): Promise<TagTranslation> => {
  return httpPostAuth<TagTranslation>(`/tags/${id}/translations`, data);
};

/**
 * Update tag translation
 *
 * @param id - Tag ID
 * @param language - Language code
 * @param data - Updated data
 * @returns Updated translation
 */
export const updateTagTranslation = async (
  id: string,
  language: string,
  data: Partial<Omit<TagTranslation, 'language'>>
): Promise<TagTranslation> => {
  return httpPatchAuth<TagTranslation>(`/tags/${id}/translations/${language}`, data);
};

/**
 * Delete tag translation
 *
 * @param id - Tag ID
 * @param language - Language code
 */
export const deleteTagTranslation = async (id: string, language: string): Promise<void> => {
  return httpDeleteAuth<void>(`/tags/${id}/translations/${language}`);
};
