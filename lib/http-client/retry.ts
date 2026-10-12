/**
 * Retry logic for HTTP requests
 *
 * Handles retry attempts on 401 errors (with token refresh).
 * 429 on `next build` is retried once by `httpGet` in `lib/http.ts` (LEGACY-411) - do not add a second retry here.
 */

import { ApiError } from '@/types/api';
import { getCurrentSession, handleAuthFailure, refreshCurrentSession } from './auth';

/**
 * Wrapper for HTTP request with automatic retry on 401
 *
 * @param requestFn - Function performing HTTP request
 * @param retry401 - Enable retry on 401 (automatic refresh)
 * @param viaBackendProxy - Запрос шёл через серверный прокси (`LEGACY-465`): прокси токен не
 *   продлевает, поэтому сессия берётся мимо кэша — `/api/auth/session` продлевает истёкший access
 *   и пишет куку, следующий запрос через прокси уходит уже с новым токеном
 * @returns Request result
 * @throws ApiError if all attempts exhausted
 */
export const withAuthRetry = async <T>(
  requestFn: (accessToken?: string) => Promise<T>,
  retry401: boolean,
  viaBackendProxy = false
): Promise<T> => {
  try {
    // First request attempt
    return await requestFn();
  } catch (error) {
    // Handle 401 with automatic refresh
    if (error instanceof ApiError && error.isUnauthorized() && retry401) {
      try {
        // Refresh session (NextAuth will do refresh in jwt callback)
        const newSession = viaBackendProxy
          ? await refreshCurrentSession()
          : await getCurrentSession();

        // Через прокси токен браузеру не нужен: решает живость сессии, а не наличие в ней
        // `accessToken` (его снимет заход 2 `LEGACY-465`). Окончательный отказ и временный сбой
        // продления (`error` в сессии) — выход, как и прежде после второго 401.
        const alive = viaBackendProxy
          ? Boolean(newSession) && !newSession?.error
          : Boolean(newSession?.accessToken);

        if (!alive || !newSession) {
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
