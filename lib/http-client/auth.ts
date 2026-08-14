/**
 * Authorization module for HTTP client
 *
 * Handles token retrieval and authorization error processing
 */

import { getSession, signOut } from 'next-auth/react';
import { clearLoggedInMarker } from '@/lib/auth/sessionMarker';
import { ApiError } from '@/types/api';
import type { Session } from 'next-auth';

// Cache settings to prevent excessive API calls
const SESSION_CACHE_TIME = 60 * 1000; // 1 minute

// Cache state
let cachedSession: Session | null = null;
let lastSessionFetchTime = 0;
let sessionFetchPromise: Promise<Session | null> | null = null;

/**
 * Manually set session (e.g. from AppProviders)
 * to avoid initial network request
 */
export const setSession = (session: Session | null) => {
  cachedSession = session;
  lastSessionFetchTime = Date.now();
};

/**
 * Get current session and access token
 *
 * @returns User session or null
 */
export const getCurrentSession = async () => {
  // Client-side only
  if (typeof window === 'undefined') {
    return null;
  }

  const now = Date.now();

  // Return cached session if valid
  if (cachedSession && now - lastSessionFetchTime < SESSION_CACHE_TIME) {
    return cachedSession;
  }

  // Return existing promise if request in progress
  if (sessionFetchPromise) {
    return sessionFetchPromise;
  }

  try {
    sessionFetchPromise = getSession();
    const session = await sessionFetchPromise;

    cachedSession = session;
    lastSessionFetchTime = Date.now();

    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  } finally {
    sessionFetchPromise = null;
  }
};

/**
 * Текст ошибки авторизованного клиента, вызванного с сервера.
 *
 * Вынесен в константу, потому что на него смотрит посадка: общий 401 от этого
 * места неотличим от честного ответа бэкенда неавторизованному запросу
 * (`LEGACY-140`).
 */
export const SERVER_CONTEXT_AUTH_MESSAGE =
  'Authorized HTTP client called from a server context: the NextAuth session is only readable in ' +
  'the browser, so no token can be obtained here. Pass an explicit accessToken, or call the ' +
  'endpoint with requireAuth: false / optionalAuth: true.';

/** Код этой ошибки: она про неверный вызов, а не про неавторизованного посетителя. */
export const SERVER_CONTEXT_AUTH_ERROR = 'ServerContextAuthUnavailable';

/**
 * Get access token from current session
 *
 * @param requireAuth - Whether authorization is required
 * @param providedToken - Token explicitly provided
 * @returns Access token or null
 * @throws ApiError if requireAuth = true and no token available
 */
export const getAccessToken = async (
  requireAuth: boolean,
  providedToken?: string
): Promise<string | undefined> => {
  // Use provided token if available
  if (providedToken) {
    return providedToken;
  }

  // If authorization not required, return undefined
  if (!requireAuth) {
    return undefined;
  }

  // ⚠️ На сервере `getCurrentSession` всегда возвращает null, поэтому дальше по
  // коду получался бы 401 ещё до похода в сеть — и выглядел бы как отказ
  // бэкенда. В карте сайта такой 401 оседал в noteFailure и превращался в 503
  // или в пропавшую секцию, а искать шли в бэкенд. Ошибка здесь называет
  // причину вслух: серверная функция названа так же, как рабочая клиентская,
  // и на ревью подмена контекста не видна (`LEGACY-140`).
  if (typeof window === 'undefined') {
    throw new ApiError({
      message: SERVER_CONTEXT_AUTH_MESSAGE,
      statusCode: 500,
      error: SERVER_CONTEXT_AUTH_ERROR,
    });
  }

  // Get token from session
  const session = await getCurrentSession();
  const accessToken = session?.accessToken;

  if (!accessToken) {
    throw new ApiError({
      message: 'Authentication required',
      statusCode: 401,
      error: 'Unauthorized',
    });
  }

  return accessToken;
};

/**
 * Get access token for a route that works without authorization but returns a
 * personal part to the token bearer — the reader, for one (`LEGACY-088`).
 *
 * ⚠️ Unlike `getAccessToken`, a missing session is not an error here: anonymous
 * callers get the same response without the personal part. There used to be no
 * third mode — either demand a token and fail with 401, or send none at all —
 * so the reader worked around it by passing `userId` in the query string. That
 * workaround is precisely what turned out to be the leak.
 */
export const getOptionalAccessToken = async (): Promise<string | undefined> => {
  const session = await getCurrentSession();
  return session?.accessToken;
};

/**
 * Perform logout on authentication failure
 */
export const handleAuthFailure = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    clearLoggedInMarker();
    await signOut({ redirect: true, callbackUrl: '/en/auth/sign-in' });
  }
};
