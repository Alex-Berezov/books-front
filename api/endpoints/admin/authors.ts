/**
 * Admin Authors Endpoints
 *
 * API endpoints for managing authors (Admin only).
 */

import { toPaginated } from '@/lib/api/paginated-envelope';
import { httpDeleteAuth, httpGetAuth, httpPostAuth, httpPutAuth } from '@/lib/http-client';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  Author,
  CreateAuthorRequest,
  UpdateAuthorRequest,
  CheckAuthorSlugResponse,
  PaginatedResult,
} from '@/types/api-schema';

export interface GetAuthorsParams {
  page?: number;
  limit?: number;
  /** LEGACY-352: серверный поиск по имени, отдаётся `q` бэкенду. */
  search?: string;
}

export const getAuthors = async (
  params: GetAuthorsParams = {}
): Promise<PaginatedResult<Author>> => {
  const { page = 1, limit = 50, search } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) {
    queryParams.append('q', search);
  }

  const endpoint = `/admin/authors?${queryParams.toString()}`;
  // Форма ответа приводится здесь, а не в экранах: в окне между выкатами сторон
  // сюда приходит прежняя `{data, meta}` (`LEGACY-177`).
  const body = await httpGetAuth<PaginatedResult<Author>>(endpoint, { requireAuth: true });
  return toPaginated(body, { page, limit });
};

export const getAuthorById = async (id: string): Promise<Author> => {
  const endpoint = `/admin/authors/${id}`;
  return httpGetAuth<Author>(endpoint, { requireAuth: true });
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
  lang: SupportedLang,
  excludeId?: string
): Promise<CheckAuthorSlugResponse> => {
  const queryParams = new URLSearchParams({ slug, lang });
  if (excludeId) {
    queryParams.append('excludeId', excludeId);
  }

  const endpoint = `/admin/authors/check-slug?${queryParams.toString()}`;
  return httpGetAuth<CheckAuthorSlugResponse>(endpoint, { requireAuth: true });
};
