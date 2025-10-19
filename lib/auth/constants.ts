/**
 * Константы для модуля авторизации
 *
 * Содержит все числовые значения, время жизни токенов,
 * типы ошибок и другие константы связанные с авторизацией.
 */

/**
 * Время жизни токенов
 */
export const AUTH_TOKEN_EXPIRY = {
  /** Access токен действителен 12 часов (в миллисекундах) */
  ACCESS_TOKEN_MS: 12 * 60 * 60 * 1000,

  /** Refresh токен действителен 7 дней (в секундах для NextAuth session) */
  REFRESH_TOKEN_SECONDS: 7 * 24 * 60 * 60,
} as const;

/**
 * Типы ошибок авторизации
 */
export enum AuthErrorType {
  /** Ошибка при обновлении токена */
  REFRESH_TOKEN_ERROR = 'RefreshAccessTokenError',

  /** Неверные учетные данные */
  INVALID_CREDENTIALS = 'InvalidCredentials',

  /** Превышен лимит запросов */
  RATE_LIMIT_EXCEEDED = 'RateLimitExceeded',

  /** Email и пароль обязательны */
  MISSING_CREDENTIALS = 'MissingCredentials',
}

/**
 * Сообщения об ошибках авторизации
 */
export const AUTH_ERROR_MESSAGES = {
  [AuthErrorType.INVALID_CREDENTIALS]: 'Invalid credentials',
  [AuthErrorType.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
  [AuthErrorType.MISSING_CREDENTIALS]: 'Email and password are required',
  [AuthErrorType.REFRESH_TOKEN_ERROR]: 'Failed to refresh access token',
} as const;

/**
 * Роли пользователей в системе
 */
export enum UserRole {
  /** Обычный пользователь */
  USER = 'user',

  /** Администратор */
  ADMIN = 'admin',

  /** Контент-менеджер */
  CONTENT_MANAGER = 'content_manager',
}

/**
 * Staff роли (имеют доступ к админке)
 */
export const STAFF_ROLES = [UserRole.ADMIN, UserRole.CONTENT_MANAGER] as const;

/**
 * Маршруты авторизации
 */
export const AUTH_ROUTES = {
  SIGN_IN: '/en/auth/sign-in',
  SIGN_OUT: '/en/auth/sign-out',
  ERROR: '/en/auth/error',
  REGISTER: '/en/auth/register',
} as const;
