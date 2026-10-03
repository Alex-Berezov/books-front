/**
 * Types for Auth endpoints
 *
 * Authorization, registration, token refresh
 */

import type { UserMeResponse } from './user';

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
  name?: string;
}

/**
 * Пользователь в ответе входа — `AuthUserResponse` бэкенда (`auth/dto/auth-response.dto.ts`), а не
 * `PublicUserWithRolesDto`: схема объявляет `firstName`, `lastName`, `nickname`, `isActive`, `lastLogin`
 * необязательными. Поля `displayName` у сервера нет (`LEGACY-380`).
 */
export type AuthUser = Omit<
  UserMeResponse,
  'firstName' | 'lastName' | 'nickname' | 'isActive' | 'lastLogin'
> &
  Partial<Pick<UserMeResponse, 'firstName' | 'lastName' | 'nickname' | 'isActive' | 'lastLogin'>>;

/**
 * Response on successful authorization (`POST /auth/login`, `/auth/register`, `/auth/social`)
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
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
