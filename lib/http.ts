/**
 * HTTP client for API communication
 *
 * Features:
 * - Automatic base URL configuration
 * - Authorization support (Bearer token)
 * - Accept-Language header support
 * - Typed error handling
 * - JSON by default
 */

import { ApiError } from '@/types/api';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { HttpRequestOptions } from '@/types/api';
import {
  HTTP_METHOD,
  HTTP_HEADER,
  HEADER_VALUE,
  AUTH_PREFIX,
  API_ERROR_TYPE,
  DEFAULT_ERROR_MESSAGES,
} from './http.constants';

/**
 * Base API URL from environment variables
 * In production: https://api.bibliaris.com/api
 * In development: http://localhost:5000/api
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Creates headers for HTTP request
 *
 * @param options - Request options with token and language
 * @returns Ready headers for fetch
 */
const createHeaders = (options?: HttpRequestOptions): HeadersInit => {
  const headers: HeadersInit = {
    [HTTP_HEADER.CONTENT_TYPE]: HEADER_VALUE.JSON,
  };

  // Add Authorization header if token exists
  if (options?.accessToken) {
    headers[HTTP_HEADER.AUTHORIZATION] = `${AUTH_PREFIX.BEARER} ${options.accessToken}`;
  }

  // Add Accept-Language header if language is specified
  if (options?.language) {
    headers[HTTP_HEADER.ACCEPT_LANGUAGE] = options.language;
  }

  return headers;
};

/**
 * Handles API response
 *
 * @param response - Response from fetch
 * @returns Parsed data
 * @throws {ApiError} On API or network error
 */
const handleResponse = async <T>(response: Response): Promise<T> => {
  // Check status before parsing JSON
  if (!response.ok) {
    // Try to parse error JSON
    let errorData;
    try {
      errorData = await response.json();
    } catch (_error) {
      // If failed to parse error JSON
      throw new ApiError({
        message: DEFAULT_ERROR_MESSAGES.UNKNOWN,
        statusCode: response.status,
        error: API_ERROR_TYPE.PARSE_ERROR,
      });
    }

    throw new ApiError({
      message: errorData.message || DEFAULT_ERROR_MESSAGES.UNKNOWN,
      statusCode: response.status,
      error: errorData.error,
      details: errorData.details,
    });
  }

  // For successful responses without body (204 No Content)
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  // Try to parse JSON response for successful requests
  let data;
  try {
    data = await response.json();
  } catch (_error) {
    // If failed to parse JSON, but status is OK
    throw new ApiError({
      message: DEFAULT_ERROR_MESSAGES.INVALID_JSON,
      statusCode: response.status,
      error: API_ERROR_TYPE.PARSE_ERROR,
    });
  }

  return data as T;
};

/**
 * Executes GET request to API
 *
 * @param endpoint - Endpoint path (without base URL)
 * @param options - Request options
 * @returns Typed response
 *
 * @example
 * ```ts
 * const user = await httpGet<User>('/users/me', {
 *   accessToken: session.accessToken,
 *   language: 'en'
 * });
 * ```
 */
export const httpGet = async <T>(endpoint: string, options?: HttpRequestOptions): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = createHeaders(options);

  const response = await fetch(url, {
    method: HTTP_METHOD.GET,
    headers,
    ...options,
  });

  return handleResponse<T>(response);
};

/**
 * Executes POST request to API
 *
 * @param endpoint - Endpoint path (without base URL)
 * @param body - Request body
 * @param options - Request options
 * @returns Typed response
 *
 * @example
 * ```ts
 * const response = await httpPost<AuthResponse>('/auth/login', {
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 * ```
 */
export const httpPost = async <T>(
  endpoint: string,
  body?: unknown,
  options?: HttpRequestOptions
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = createHeaders(options);

  const response = await fetch(url, {
    method: HTTP_METHOD.POST,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  return handleResponse<T>(response);
};

/**
 * Executes PATCH request to API
 *
 * @param endpoint - Endpoint path (without base URL)
 * @param body - Request body
 * @param options - Request options
 * @returns Typed response
 *
 * @example
 * ```ts
 * const user = await httpPatch<User>('/users/me', {
 *   name: 'New Name'
 * }, {
 *   accessToken: session.accessToken
 * });
 * ```
 */
export const httpPatch = async <T>(
  endpoint: string,
  body?: unknown,
  options?: HttpRequestOptions
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = createHeaders(options);

  const response = await fetch(url, {
    method: HTTP_METHOD.PATCH,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  return handleResponse<T>(response);
};

/**
 * Executes DELETE request to API
 *
 * @param endpoint - Endpoint path (without base URL)
 * @param options - Request options
 * @returns Typed response
 *
 * @example
 * ```ts
 * await httpDelete('/me/bookshelf/version-id', {
 *   accessToken: session.accessToken
 * });
 * ```
 */
export const httpDelete = async <T>(endpoint: string, options?: HttpRequestOptions): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = createHeaders(options);

  const response = await fetch(url, {
    method: HTTP_METHOD.DELETE,
    headers,
    ...options,
  });

  return handleResponse<T>(response);
};

/**
 * Executes PUT request to API
 *
 * @param endpoint - Endpoint path (without base URL)
 * @param body - Request body
 * @param options - Request options
 * @returns Typed response
 *
 * @example
 * ```ts
 * const progress = await httpPut<Progress>('/me/progress/version-id', {
 *   chapterNumber: 5,
 *   position: 1234
 * }, {
 *   accessToken: session.accessToken
 * });
 * ```
 */
export const httpPut = async <T>(
  endpoint: string,
  body?: unknown,
  options?: HttpRequestOptions
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = createHeaders(options);

  const response = await fetch(url, {
    method: HTTP_METHOD.PUT,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  return handleResponse<T>(response);
};

/**
 * Utility for building URL with query parameters
 *
 * @param endpoint - Base endpoint
 * @param params - Object with query parameters
 * @returns URL with query string
 *
 * @example
 * ```ts
 * const url = buildUrlWithParams('/books', { page: 1, limit: 10 });
 * // Result: '/books?page=1&limit=10'
 * ```
 */
export const buildUrlWithParams = (
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string => {
  if (!params) {
    return endpoint;
  }

  // Filter undefined values and build query string
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
};

/**
 * Utility for building path with language prefix
 *
 * @param lang - Language
 * @param path - Path without language
 * @returns Full path with language
 *
 * @example
 * ```ts
 * const endpoint = buildLangPath('en', '/books/some-slug/overview');
 * // Result: '/en/books/some-slug/overview'
 * ```
 */
export const buildLangPath = (lang: SupportedLang, path: string): string => {
  // Remove leading slash if present
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `/${lang}/${normalizedPath}`;
};
