/**
 * Constants for working with HTTP API
 */

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  /** 200 - Successful request */
  OK: 200,
  /** 400 - Validation error */
  BAD_REQUEST: 400,
  /** 401 - Authorization required */
  UNAUTHORIZED: 401,
  /** 403 - Access forbidden */
  FORBIDDEN: 403,
  /** 404 - Resource not found */
  NOT_FOUND: 404,
  /** 409 - Conflict */
  CONFLICT: 409,
  /** 422 - Unprocessable entity */
  UNPROCESSABLE_ENTITY: 422,
  /** 429 - Rate limit exceeded */
  TOO_MANY_REQUESTS: 429,
  /** 500 - Internal server error */
  INTERNAL_SERVER_ERROR: 500,
  /** 503 - Service unavailable */
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * API error types
 */
export const API_ERROR_TYPE = {
  /** JSON parsing error */
  PARSE_ERROR: 'ParseError',
  /** Validation error */
  VALIDATION_ERROR: 'ValidationError',
  /** Authorization error */
  UNAUTHORIZED: 'Unauthorized',
  /** Access forbidden */
  FORBIDDEN: 'Forbidden',
  /** Resource not found */
  NOT_FOUND: 'NotFound',
  /** Rate limit exceeded */
  RATE_LIMIT_EXCEEDED: 'RateLimitExceeded',
  /** Unknown error */
  UNKNOWN_ERROR: 'UnknownError',
} as const;

/**
 * Default error messages
 */
export const DEFAULT_ERROR_MESSAGES = {
  /** Invalid JSON response */
  INVALID_JSON: 'Invalid JSON response from server',
  /** Unknown error */
  UNKNOWN: 'An error occurred',
  /** Network error */
  NETWORK_ERROR: 'Network error occurred',
} as const;

/**
 * HTTP methods
 */
export const HTTP_METHOD = {
  GET: 'GET',
  POST: 'POST',
  PATCH: 'PATCH',
  PUT: 'PUT',
  DELETE: 'DELETE',
} as const;

/**
 * HTTP headers
 */
export const HTTP_HEADER = {
  /** Content type */
  CONTENT_TYPE: 'Content-Type',
  /** Authorization */
  AUTHORIZATION: 'Authorization',
  /** Language */
  ACCEPT_LANGUAGE: 'Accept-Language',
} as const;

/**
 * Header values
 */
export const HEADER_VALUE = {
  /** JSON content type */
  JSON: 'application/json',
} as const;

/**
 * Authorization prefixes
 */
export const AUTH_PREFIX = {
  /** Bearer token */
  BEARER: 'Bearer',
} as const;
