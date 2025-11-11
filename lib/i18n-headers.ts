/**
 * Utilities for working with language headers in HTTP requests
 *
 * Provides functions for adding Accept-Language header
 * and extracting language from various sources.
 */

import { isSupportedLang, getDefaultLang } from '@/lib/i18n/lang';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Add language header to existing headers
 *
 * @param lang - Language code
 * @param headers - Existing headers (optional)
 * @returns Headers with added Accept-Language
 *
 * @example
 * ```ts
 * const headers = withLangHeaders('en', {
 *   'Content-Type': 'application/json'
 * });
 * // { 'Content-Type': 'application/json', 'Accept-Language': 'en' }
 * ```
 */
export const withLangHeaders = (lang: SupportedLang, headers?: HeadersInit): HeadersInit => {
  const baseHeaders: Record<string, string> = {};

  // Copy existing headers
  if (headers) {
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        baseHeaders[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        baseHeaders[key] = value;
      });
    } else {
      Object.assign(baseHeaders, headers);
    }
  }

  // Add Accept-Language
  baseHeaders['Accept-Language'] = lang;

  return baseHeaders;
};

/**
 * Extract language from URL pathname
 *
 * @param pathname - URL path (e.g., '/en/books/some-slug')
 * @returns Language code or default language
 *
 * @example
 * ```ts
 * extractLangFromPath('/en/books/slug'); // 'en'
 * extractLangFromPath('/admin/fr/pages'); // 'fr'
 * extractLangFromPath('/invalid/path'); // 'en' (default)
 * ```
 */
export const extractLangFromPath = (pathname: string): SupportedLang => {
  const segments = pathname.split('/').filter(Boolean);

  // Check first segment for public routes
  if (segments.length >= 1 && isSupportedLang(segments[0])) {
    return segments[0];
  }

  // Check second segment for admin routes
  if (segments[0] === 'admin' && segments.length >= 2 && isSupportedLang(segments[1])) {
    return segments[1];
  }

  // Return default language if not found
  return getDefaultLang();
};

/**
 * Get current language on the client from URL
 *
 * @returns Current language code
 *
 * @example
 * ```ts
 * // If current URL: https://example.com/en/books
 * const lang = getCurrentLang(); // 'en'
 * ```
 */
export const getCurrentLang = (): SupportedLang => {
  if (typeof window === 'undefined') {
    return getDefaultLang();
  }

  return extractLangFromPath(window.location.pathname);
};

/**
 * Create headers for HTTP request with current language
 *
 * @param headers - Additional headers (optional)
 * @returns Headers with Accept-Language for current language
 *
 * @example
 * ```ts
 * const headers = createLangHeaders({
 *   'Authorization': 'Bearer token'
 * });
 * ```
 */
export const createLangHeaders = (headers?: HeadersInit): HeadersInit => {
  const currentLang = getCurrentLang();
  return withLangHeaders(currentLang, headers);
};

/**
 * Check if language prefix is required for endpoint
 *
 * Some endpoints (e.g., /auth/*) don't require language prefix
 *
 * @param endpoint - Endpoint path
 * @returns true if language prefix is required
 *
 * @example
 * ```ts
 * needsLangPrefix('/books/slug'); // true
 * needsLangPrefix('/auth/login'); // false
 * needsLangPrefix('/users/me'); // false
 * ```
 */
export const needsLangPrefix = (endpoint: string): boolean => {
  const neutralPrefixes = ['/auth/', '/users/', '/api/'];

  return !neutralPrefixes.some((prefix) => endpoint.startsWith(prefix));
};

/**
 * Build URL with language prefix if necessary
 *
 * @param lang - Language code
 * @param endpoint - Endpoint path
 * @returns URL with or without language prefix
 *
 * @example
 * ```ts
 * buildLangUrl('en', '/books/slug'); // '/en/books/slug'
 * buildLangUrl('en', '/auth/login'); // '/auth/login'
 * ```
 */
export const buildLangUrl = (lang: SupportedLang, endpoint: string): string => {
  if (!needsLangPrefix(endpoint)) {
    return endpoint;
  }

  // Remove leading slash if present
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  return `/${lang}/${normalizedEndpoint}`;
};
