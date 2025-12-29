/**
 * Users Endpoints
 *
 * API endpoints for working with users.
 */

import { httpGetAuth } from '@/lib/http-client';
import type { GetUsersParams, UsersResponse } from '@/types/api-schema/user';

/**
 * Get list of users (for admin panel)
 *
 * @param params - Request parameters
 * @returns Paginated list of users
 */
export const getUsers = async (params: GetUsersParams = {}): Promise<UsersResponse> => {
  const { page = 1, limit = 20, search, role, isActive } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    queryParams.append('search', search);
  }

  if (role) {
    queryParams.append('role', role);
  }

  if (isActive !== undefined) {
    queryParams.append('isActive', String(isActive));
  }

  const endpoint = `/users?${queryParams.toString()}`;
  return httpGetAuth<UsersResponse>(endpoint);
};
