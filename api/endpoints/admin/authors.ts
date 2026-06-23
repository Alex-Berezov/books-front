/**
 * Admin Authors Endpoints
 *
 * API endpoints for managing authors (Admin only).
 */

import { httpDeleteAuth, httpGetAuth, httpPostAuth, httpPutAuth } from '@/lib/http-client';
import type {
  Author,
  CreateAuthorRequest,
  UpdateAuthorRequest,
  CheckAuthorSlugResponse,
  PaginatedResponse,
} from '@/types/api-schema';

export interface GetAuthorsParams {
  page?: number;
  limit?: number;
}

export const getAuthors = async (
  params: GetAuthorsParams = {}
): Promise<PaginatedResponse<Author>> => {
  const { page = 1, limit = 50 } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const endpoint = `/admin/authors?${queryParams.toString()}`;
  return httpGetAuth<PaginatedResponse<Author>>(endpoint, { requireAuth: true });
};

export const createAuthor = async (data: CreateAuthorRequest): Promise<Author> => {
  const endpoint = '/admin/authors';
  return httpPostAuth<Author>(endpoint, data, { requireAuth: true });
};

export const updateAuthor = async (id: string, data: UpdateAuthorRequest): Promise<Author> => {
  const endpoint = `/admin/authors/${id}`;
  return httpPutAuth<Author>(endpoint, data, { requireAuth: true });
};

export const deleteAuthor = async (id: string): Promise<void> => {
  const endpoint = `/admin/authors/${id}`;
  return httpDeleteAuth<void>(endpoint, { requireAuth: true });
};

export const checkAuthorSlug = async (
  slug: string,
  excludeId?: string
): Promise<CheckAuthorSlugResponse> => {
  const queryParams = new URLSearchParams({ slug });
  if (excludeId) {
    queryParams.append('excludeId', excludeId);
  }

  const endpoint = `/admin/authors/check-slug?${queryParams.toString()}`;
  return httpGetAuth<CheckAuthorSlugResponse>(endpoint, { requireAuth: true });
};
