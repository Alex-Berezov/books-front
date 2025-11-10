/**
 * Типы для Auth endpoints
 *
 * Авторизация, регистрация, refresh токенов
 */

import type { RoleName, UUID } from './common';

/**
 * Запрос на вход в систему
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Запрос на регистрацию
 */
export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Ответ при успешной авторизации
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
 * Запрос на обновление токена
 */
export interface RefreshRequest {
  refreshToken: string;
}

/**
 * Ответ при обновлении токена
 */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
