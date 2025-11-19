/**
 * Constants for authorization module
 *
 * Contains all numeric values, token lifetimes,
 * error types and other constants related to authorization.
 */

/**
 * Token expiration times
 */
export const AUTH_TOKEN_EXPIRY = {
  /** Access token is valid for 12 hours (in milliseconds) */
  ACCESS_TOKEN_MS: 12 * 60 * 60 * 1000,

  /** Refresh token is valid for 7 days (in seconds for NextAuth session) */
  REFRESH_TOKEN_SECONDS: 7 * 24 * 60 * 60,
} as const;

/**
 * Session polling optimization settings
 */
export const SESSION_SETTINGS = {
  /** Check session every 15 minutes instead of default 60 seconds */
  REFETCH_INTERVAL_MINUTES: 15,

  /** Update session token every 4 hours to balance security and performance */
  UPDATE_AGE_HOURS: 4,
} as const;

/**
 * Authorization error types
 */
export enum AuthErrorType {
  /** Error refreshing token */
  REFRESH_TOKEN_ERROR = 'RefreshAccessTokenError',

  /** Invalid credentials */
  INVALID_CREDENTIALS = 'InvalidCredentials',

  /** Rate limit exceeded */
  RATE_LIMIT_EXCEEDED = 'RateLimitExceeded',

  /** Email and password are required */
  MISSING_CREDENTIALS = 'MissingCredentials',
}

/**
 * Authorization error messages
 */
export const AUTH_ERROR_MESSAGES = {
  [AuthErrorType.INVALID_CREDENTIALS]: 'Invalid credentials',
  [AuthErrorType.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
  [AuthErrorType.MISSING_CREDENTIALS]: 'Email and password are required',
  [AuthErrorType.REFRESH_TOKEN_ERROR]: 'Failed to refresh access token',
} as const;

/**
 * User roles in the system
 */
export enum UserRole {
  /** Regular user */
  USER = 'user',

  /** Administrator */
  ADMIN = 'admin',

  /** Content manager */
  CONTENT_MANAGER = 'content_manager',
}

/**
 * Staff roles (have access to admin panel)
 */
export const STAFF_ROLES = [UserRole.ADMIN, UserRole.CONTENT_MANAGER] as const;

/**
 * Authorization routes
 */
export const AUTH_ROUTES = {
  SIGN_IN: '/en/auth/sign-in',
  SIGN_OUT: '/en/auth/sign-out',
  ERROR: '/en/auth/error',
  REGISTER: '/en/auth/register',
} as const;
