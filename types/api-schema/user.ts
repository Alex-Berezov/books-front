/**
 * Types for User endpoints
 *
 * User profile, settings
 */

import type { ISODate, RoleName, SupportedLang, UUID } from './common';

/**
 * Response with current user information
 */
export interface UserMeResponse {
  id: UUID;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  languagePreference?: SupportedLang;
  roles: RoleName[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * User object for admin list
 */
export interface User {
  id: UUID;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  roles: RoleName[];
  isActive: boolean;
  lastLoginAt?: ISODate;
  createdAt: ISODate;
}

/**
 * Parameters for fetching users list
 */
export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: RoleName;
  isActive?: boolean;
}

/**
 * Response for users list
 */
export interface UsersResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Request to create a new user
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roles?: RoleName[];
  isActive?: boolean;
}

/**
 * Request to update a user
 */
export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  password?: string; // Optional for admin reset
  roles?: RoleName[]; // Admin can update roles
}

/**
 * Request to change password
 */
export interface ChangePasswordRequest {
  password: string;
}
