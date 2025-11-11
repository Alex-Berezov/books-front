/**
 * React Query configuration constants
 */

/**
 * Data caching time
 */
export const QUERY_CACHE_TIME = {
  /** Data is considered fresh for 1 minute */
  STALE_TIME_MS: 60 * 1000,

  /** Cache is stored for 5 minutes */
  CACHE_TIME_MS: 5 * 60 * 1000,
} as const;

/**
 * Retry settings for queries
 */
export const QUERY_RETRY = {
  /** Number of retry attempts on error */
  MAX_RETRIES: 3,

  /** Delay between attempts (ms) */
  RETRY_DELAY_MS: 1000,
} as const;
