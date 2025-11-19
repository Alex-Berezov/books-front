/**
 * HTTP methods with automatic authorization and retry
 *
 * Provides GET, POST, PATCH, DELETE methods with support for:
 * - Automatic token retrieval from NextAuth
 * - 401 retry with automatic refresh
 * - Type safety
 */

import type { ExtendedHttpOptions } from './types';
import {
  httpGet as baseHttpGet,
  httpPost as baseHttpPost,
  httpPatch as baseHttpPatch,
  httpPut as baseHttpPut,
  httpDelete as baseHttpDelete,
} from '../http';
import { getAccessToken } from './auth';
import { withAuthRetry } from './retry';

/**
 * Performs GET request with automatic authorization and retry
 *
 * @param endpoint - Endpoint path
 * @param options - Extended request options
 * @returns Typed response
 */
export const httpGetAuth = async <T>(
  endpoint: string,
  options: ExtendedHttpOptions = {}
): Promise<T> => {
  const {
    requireAuth = true,
    retry401 = true,
    maxRetries: _maxRetries = 0,
    ...fetchOptions
  } = options;

  // Get token if requireAuth = true
  const initialToken = await getAccessToken(requireAuth, fetchOptions.accessToken);

  // Wrap request in retry logic
  return withAuthRetry(async (refreshedToken?: string) => {
    const accessToken = refreshedToken || initialToken;

    return baseHttpGet<T>(endpoint, {
      ...fetchOptions,
      accessToken,
    });
  }, retry401);
};

/**
 * Performs POST request with automatic authorization and retry
 *
 * @param endpoint - Endpoint path
 * @param body - Request body
 * @param options - Extended request options
 * @returns Typed response
 */
export const httpPostAuth = async <T>(
  endpoint: string,
  body?: unknown,
  options: ExtendedHttpOptions = {}
): Promise<T> => {
  const {
    requireAuth = true,
    retry401 = true,
    maxRetries: _maxRetries = 0,
    ...fetchOptions
  } = options;

  // Get token if requireAuth = true
  const initialToken = await getAccessToken(requireAuth, fetchOptions.accessToken);

  // Wrap request in retry logic
  return withAuthRetry(async (refreshedToken?: string) => {
    const accessToken = refreshedToken || initialToken;

    return baseHttpPost<T>(endpoint, body, {
      ...fetchOptions,
      accessToken,
    });
  }, retry401);
};

/**
 * Performs PATCH request with automatic authorization and retry
 *
 * @param endpoint - Endpoint path
 * @param body - Request body
 * @param options - Extended request options
 * @returns Typed response
 */
export const httpPatchAuth = async <T>(
  endpoint: string,
  body?: unknown,
  options: ExtendedHttpOptions = {}
): Promise<T> => {
  const {
    requireAuth = true,
    retry401 = true,
    maxRetries: _maxRetries = 0,
    ...fetchOptions
  } = options;

  // Get token if requireAuth = true
  const initialToken = await getAccessToken(requireAuth, fetchOptions.accessToken);

  // Wrap request in retry logic
  return withAuthRetry(async (refreshedToken?: string) => {
    const accessToken = refreshedToken || initialToken;

    return baseHttpPatch<T>(endpoint, body, {
      ...fetchOptions,
      accessToken,
    });
  }, retry401);
};

/**
 * Performs DELETE request with automatic authorization and retry
 *
 * @param endpoint - Endpoint path
 * @param options - Extended request options
 * @returns Typed response
 */
export const httpDeleteAuth = async <T>(
  endpoint: string,
  options: ExtendedHttpOptions = {}
): Promise<T> => {
  const {
    requireAuth = true,
    retry401 = true,
    maxRetries: _maxRetries = 0,
    ...fetchOptions
  } = options;

  // Get token if requireAuth = true
  const initialToken = await getAccessToken(requireAuth, fetchOptions.accessToken);

  // Wrap request in retry logic
  return withAuthRetry(async (refreshedToken?: string) => {
    const accessToken = refreshedToken || initialToken;

    return baseHttpDelete<T>(endpoint, {
      ...fetchOptions,
      accessToken,
    });
  }, retry401);
};

/**
 * Performs PUT request with automatic authorization and retry
 *
 * @param endpoint - Endpoint path
 * @param body - Request body
 * @param options - Extended request options
 * @returns Typed response
 */
export const httpPutAuth = async <T>(
  endpoint: string,
  body?: unknown,
  options: ExtendedHttpOptions = {}
): Promise<T> => {
  const {
    requireAuth = true,
    retry401 = true,
    maxRetries: _maxRetries = 0,
    ...fetchOptions
  } = options;

  // Get token if requireAuth = true
  const initialToken = await getAccessToken(requireAuth, fetchOptions.accessToken);

  // Wrap request in retry logic
  return withAuthRetry(async (refreshedToken?: string) => {
    const accessToken = refreshedToken || initialToken;

    return baseHttpPut<T>(endpoint, body, {
      ...fetchOptions,
      accessToken,
    });
  }, retry401);
};
