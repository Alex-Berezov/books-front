/**
 * Types for HTTP client with automatic authorization
 */

import type { HttpRequestOptions } from '@/types/api';

/**
 * Extended options for HTTP requests
 */
export interface ExtendedHttpOptions extends HttpRequestOptions {
  /** Whether automatic authorization is required */
  requireAuth?: boolean;
  /**
   * Route is open to anonymous callers but returns a personal part to the token
   * bearer. The token is attached when a session exists; its absence is not an
   * error. Overrides `requireAuth`.
   */
  optionalAuth?: boolean;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Enable retry on 401 (automatic refresh) */
  retry401?: boolean;
}
