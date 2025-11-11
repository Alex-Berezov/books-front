/**
 * React Query configuration
 *
 * Contains QueryClient settings, cache key definitions,
 * and retry strategies for different error types.
 */

import { QueryClient, type DefaultOptions } from '@tanstack/react-query';
import { ApiError } from '@/types/api';

/**
 * Determines if retry should be attempted for an error
 *
 * @param failureCount - Number of failed attempts
 * @param error - Error
 * @returns true if retry should be attempted
 */
const shouldRetry = (failureCount: number, error: unknown): boolean => {
  // Don't retry for ApiError
  if (error instanceof ApiError) {
    const status = error.statusCode;

    // Don't retry for client errors (4xx), except 429
    if (status >= 400 && status < 500) {
      // For 429, do 1-2 attempts
      if (status === 429) {
        return failureCount < 2;
      }
      // Don't retry other 4xx
      return false;
    }

    // For server errors (5xx), do 2-3 attempts
    if (status >= 500) {
      return failureCount < 3;
    }
  }

  // For other errors (network), do 2 attempts
  return failureCount < 2;
};

/**
 * Default options for React Query
 */
const defaultOptions: DefaultOptions = {
  queries: {
    // Time during which data is considered fresh
    staleTime: 30 * 1000, // 30 seconds

    // Time during which cache is stored in memory
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)

    // Retry strategy
    retry: shouldRetry,

    // Don't refetch on window focus for stability
    refetchOnWindowFocus: false,

    // Refetch on mount only if data is stale
    refetchOnMount: true,

    // Don't refetch on reconnect by default
    refetchOnReconnect: false,
  },
  mutations: {
    // For mutations, don't retry on 4xx errors
    retry: (failureCount, error) => {
      if (error instanceof ApiError) {
        const status = error.statusCode;
        // Don't retry for client errors
        if (status >= 400 && status < 500) {
          return false;
        }
      }
      // For others, do 1 attempt
      return failureCount < 1;
    },
  },
};

/**
 * Factory for creating QueryClient
 *
 * @returns New QueryClient instance
 */
export const createQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions,
  });
};

/**
 * Global QueryClient for use in the application
 * Created once at application startup
 */
let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Get QueryClient for use in the application
 *
 * @returns QueryClient instance
 */
export const getQueryClient = (): QueryClient => {
  // On server, always create a new client
  if (typeof window === 'undefined') {
    return createQueryClient();
  }

  // On client, use singleton
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }

  return browserQueryClient;
};

/**
 * Cache keys for React Query
 *
 * Centralized key definitions for predictable caching
 */
export const queryKeys = {
  /** Book overview: ['bookOverview', lang, slug] */
  bookOverview: (lang: string, slug: string) => ['bookOverview', lang, slug] as const,

  /** Book versions: ['bookVersions', bookId, filters] */
  bookVersions: (bookId: string, filters?: { lang?: string; type?: string; isFree?: boolean }) =>
    ['bookVersions', bookId, filters] as const,

  /** CMS page: ['page', lang, slug] */
  page: (lang: string, slug: string) => ['page', lang, slug] as const,

  /** Category books: ['categoryBooks', lang, slug, page, limit] */
  categoryBooks: (lang: string, slug: string, page?: number, limit?: number) =>
    ['categoryBooks', lang, slug, { page, limit }] as const,

  /** Books by tag: ['tagBooks', lang, slug, page, limit] */
  tagBooks: (lang: string, slug: string, page?: number, limit?: number) =>
    ['tagBooks', lang, slug, { page, limit }] as const,

  /** SEO data: ['seoResolve', lang, type, id] */
  seoResolve: (lang: string, type: string, id: string) => ['seoResolve', lang, type, id] as const,

  /** Current user data: ['me'] */
  me: () => ['me'] as const,

  /** User reading progress: ['readingProgress', versionId] */
  readingProgress: (versionId: string) => ['readingProgress', versionId] as const,

  /** User bookshelf: ['bookshelf', page, limit] */
  bookshelf: (page?: number, limit?: number) => ['bookshelf', { page, limit }] as const,
} as const;

/**
 * staleTime settings for different query types
 */
export const staleTimeConfig = {
  /** Public data (books, pages) - 30 seconds */
  public: 30 * 1000,

  /** Catalogs and lists - 5 minutes */
  catalog: 5 * 60 * 1000,

  /** SEO data - 10 minutes */
  seo: 10 * 60 * 1000,

  /** User data - 0 (always fresh) */
  user: 0,

  /** Static data - 1 hour */
  static: 60 * 60 * 1000,
} as const;
