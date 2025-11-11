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
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Enable retry on 401 (automatic refresh) */
  retry401?: boolean;
}
