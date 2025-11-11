/**
 * Types for working with API
 */

import { HTTP_STATUS } from '@/lib/http.constants';

/**
 * API error structure
 */
export interface ApiErrorResponse {
  /** Error message */
  message: string;
  /** HTTP status code */
  statusCode: number;
  /** Error type (optional) */
  error?: string;
  /** Validation details (for 400 errors) */
  details?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * API error class for typed error handling
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly error?: string;
  public readonly details?: ApiErrorResponse['details'];

  constructor(response: ApiErrorResponse) {
    super(response.message);
    this.name = 'ApiError';
    this.statusCode = response.statusCode;
    this.error = response.error;
    this.details = response.details;

    // Preserve correct stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Checks if error is 401 (Unauthorized)
   */
  public isUnauthorized(): boolean {
    return this.statusCode === HTTP_STATUS.UNAUTHORIZED;
  }

  /**
   * Checks if error is 403 (Forbidden)
   */
  public isForbidden(): boolean {
    return this.statusCode === HTTP_STATUS.FORBIDDEN;
  }

  /**
   * Checks if error is 404 (Not Found)
   */
  public isNotFound(): boolean {
    return this.statusCode === HTTP_STATUS.NOT_FOUND;
  }

  /**
   * Checks if error is 429 (Rate Limit)
   */
  public isRateLimited(): boolean {
    return this.statusCode === HTTP_STATUS.TOO_MANY_REQUESTS;
  }

  /**
   * Checks if error is validation error (400)
   */
  public isValidationError(): boolean {
    return this.statusCode === HTTP_STATUS.BAD_REQUEST && Boolean(this.details?.length);
  }
}

/**
 * Options for HTTP requests
 */
export interface HttpRequestOptions extends RequestInit {
  /** Bearer token for authorization */
  accessToken?: string;
  /** Language for Accept-Language header */
  language?: string;
}

/**
 * Basic interface for paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
