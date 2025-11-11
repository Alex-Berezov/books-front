/**
 * Types for Auth endpoints
 *
 * Authorization, registration, token refresh
 */

import type { RoleName, UUID } from './common';

/**
 * Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Registration request
 */
export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Response on successful authorization
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: UUID;
    email: string;
    displayName?: string;
    roles: RoleName[];
  };
}

/**
 * Token refresh request
 */
export interface RefreshRequest {
  refreshToken: string;
}

/**
 * Token refresh response
 */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
