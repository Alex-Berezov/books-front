/**
 * Extended HTTP client with NextAuth and retry logic support
 *
 * Features:
 * - Automatic token retrieval from NextAuth
 * - 401 handling with automatic refresh
 * - Retry logic for temporary errors
 * - Language integration
 *
 * @module http-client
 */

export type { ExtendedHttpOptions } from './types';
export { getCurrentSession, getAccessToken, handleAuthFailure } from './auth';
export { withAuthRetry } from './retry';
export { httpGetAuth, httpPostAuth, httpPatchAuth, httpPutAuth, httpDeleteAuth } from './methods';

/**
 * Type guard for ApiError checking
 */
import { ApiError } from '@/types/api';

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};
