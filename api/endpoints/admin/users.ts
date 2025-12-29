/**
 * Users Endpoints
 *
 * API endpoints for working with users.
 */

import {
  httpDeleteAuth,
  httpGetAuth,
  httpPatchAuth,
  httpPostAuth,
} from '@/lib/http-client';
import type { UUID } from '@/types/api-schema/common';
import type {
  CreateUserRequest,
  GetUsersParams,
  UpdateUserRequest,
  User,
  UsersResponse,
} from '@/types/api-schema/user';

/**
 * Get list of users (for admin panel)
 *
 * @param params - Request parameters
 * @returns Paginated list of users
 */
export const getUsers = async (
  params: GetUsersParams = {}
): Promise<UsersResponse> => {
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

/**
 * Get user details by ID
 *
 * @param id - User ID
 * @returns User details
 */
export const getUser = async (id: UUID): Promise<User> => {
  return httpGetAuth<User>(`/users/${id}`);
};

/**
 * Create a new user
 *
 * @param data - User data
 * @returns Created user
 */
export const createUser = async (data: CreateUserRequest): Promise<User> => {
  return httpPostAuth<User>('/users', data);
};

/**
 * Update user details
 *
 * @param id - User ID
 * @param data - Data to update
 * @returns Updated user
 */
export const updateUser = async (
  id: UUID,
  data: UpdateUserRequest
): Promise<User> => {
  return httpPatchAuth<User>(`/users/${id}`, data);
};

/**
 * Delete a user
 *
 * @param id - User ID
 */
export const deleteUser = async (id: UUID): Promise<void> => {
  return httpDeleteAuth(`/users/${id}`);
};

/**
 * Assign a role to a user
 *
 * @param id - User ID
 * @param role - Role to assign
 */
export const assignRole = async (id: UUID, role: string): Promise<void> => {
  return httpPostAuth(`/users/${id}/roles/${role}`, {});
};

/**
 * Revoke a role from a user
 *
 * @param id - User ID
 * @param role - Role to revoke
 */
export const revokeRole = async (id: UUID, role: string): Promise<void> => {
  return httpDeleteAuth(`/users/${id}/roles/${role}`);
};

/**
 * Reset user password
 *
 * @param id - User ID
 * @param password - New password
 */
export const resetPassword = async (id: UUID, password: string): Promise<void> => {
  return httpPostAuth(`/users/${id}/password-reset`, { password });
};
