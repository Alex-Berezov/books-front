/**
 * Retry logic for HTTP requests
 *
 * Handles retry attempts on 401 errors (with token refresh)
 * and other temporary errors
 */

import { ApiError } from '@/types/api';
import { getCurrentSession, handleAuthFailure } from './auth';

/**
 * Wrapper for HTTP request with automatic retry on 401
 *
 * @param requestFn - Function performing HTTP request
 * @param retry401 - Enable retry on 401 (automatic refresh)
 * @returns Request result
 * @throws ApiError if all attempts exhausted
 */
export const withAuthRetry = async <T>(
  requestFn: (accessToken?: string) => Promise<T>,
  retry401: boolean
): Promise<T> => {
  try {
    // First request attempt
    return await requestFn();
  } catch (error) {
    // Handle 401 with automatic refresh
    if (error instanceof ApiError && error.isUnauthorized() && retry401) {
      try {
        // Refresh session (NextAuth will do refresh in jwt callback)
        const newSession = await getCurrentSession();

        if (!newSession?.accessToken) {
          // Refresh failed - perform logout
          await handleAuthFailure();
          throw error;
        }

        // Retry request with new token
        return await requestFn(newSession.accessToken);
      } catch (refreshError) {
        // If refresh didn't help - perform logout
        await handleAuthFailure();
        throw refreshError;
      }
    }

    // Pass error through if retry not needed
    throw error;
  }
};
