/**
 * API error handling utilities
 *
 * Provides functions for converting API errors
 * to user-friendly messages and handling different error types.
 */

import { HTTP_STATUS } from '@/lib/http.constants';
import { ApiError } from '@/types/api';

/**
 * Error types for mapping
 */
export enum ErrorType {
  VALIDATION = 'validation',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  NETWORK_ERROR = 'network_error',
  UNKNOWN = 'unknown',
}

/**
 * User-friendly messages for different error types
 */
export const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.VALIDATION]: 'Please check your input and try again',
  [ErrorType.UNAUTHORIZED]: 'You need to sign in to access this resource',
  [ErrorType.FORBIDDEN]: 'You do not have permission to access this resource',
  [ErrorType.NOT_FOUND]: 'The requested resource was not found',
  [ErrorType.CONFLICT]: 'This operation conflicts with existing data',
  [ErrorType.RATE_LIMIT]: 'Too many requests. Please try again later',
  [ErrorType.SERVER_ERROR]: 'Something went wrong on our end. Please try again later',
  [ErrorType.NETWORK_ERROR]: 'Network error. Please check your connection',
  [ErrorType.UNKNOWN]: 'An unexpected error occurred',
};

/**
 * Detailed messages for specific HTTP status codes
 */
export const STATUS_MESSAGES: Record<number, string> = {
  [HTTP_STATUS.BAD_REQUEST]: 'Invalid request. Please check your input',
  [HTTP_STATUS.UNAUTHORIZED]: 'Please sign in to continue',
  [HTTP_STATUS.FORBIDDEN]: 'Access denied. Insufficient permissions',
  [HTTP_STATUS.NOT_FOUND]: 'Resource not found',
  [HTTP_STATUS.CONFLICT]: 'This resource already exists or conflicts with existing data',
  [HTTP_STATUS.UNPROCESSABLE_ENTITY]: 'Unable to process the request. Please check your data',
  [HTTP_STATUS.TOO_MANY_REQUESTS]: 'Too many requests. Please slow down',
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'Internal server error. Please try again later',
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later',
};

/**
 * Determine error type by status code
 *
 * @param statusCode - HTTP status code
 * @returns Error type
 */
export const getErrorType = (statusCode: number): ErrorType => {
  if (statusCode === HTTP_STATUS.BAD_REQUEST || statusCode === HTTP_STATUS.UNPROCESSABLE_ENTITY) {
    return ErrorType.VALIDATION;
  }

  if (statusCode === HTTP_STATUS.UNAUTHORIZED) {
    return ErrorType.UNAUTHORIZED;
  }

  if (statusCode === HTTP_STATUS.FORBIDDEN) {
    return ErrorType.FORBIDDEN;
  }

  if (statusCode === HTTP_STATUS.NOT_FOUND) {
    return ErrorType.NOT_FOUND;
  }

  if (statusCode === HTTP_STATUS.CONFLICT) {
    return ErrorType.CONFLICT;
  }

  if (statusCode === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return ErrorType.RATE_LIMIT;
  }

  if (statusCode >= 500) {
    return ErrorType.SERVER_ERROR;
  }

  if (statusCode === 0) {
    return ErrorType.NETWORK_ERROR;
  }

  return ErrorType.UNKNOWN;
};

/**
 * Convert ApiError to user-friendly message
 *
 * @param error - ApiError or any other error
 * @returns User-friendly error message
 *
 * @example
 * ```ts
 * try {
 *   await api.getData();
 * } catch (error) {
 *   const message = toUserMessage(error);
 *   toast.error(message);
 * }
 * ```
 */
export const toUserMessage = (error: unknown): string => {
  // If this is ApiError with custom message
  if (error instanceof ApiError) {
    // If there's a specific message from server, use it
    if (error.message && error.message !== 'Unknown error') {
      return error.message;
    }

    // Otherwise use message by status
    const statusMessage = STATUS_MESSAGES[error.statusCode];
    if (statusMessage) {
      return statusMessage;
    }

    // Or generic message by error type
    const errorType = getErrorType(error.statusCode);
    return ERROR_MESSAGES[errorType];
  }

  // If this is standard Error
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback for unknown errors
  return ERROR_MESSAGES[ErrorType.UNKNOWN];
};

/**
 * Get validation error details
 *
 * @param error - ApiError
 * @returns Array of validation errors or null
 *
 * @example
 * ```ts
 * const validationErrors = getValidationErrors(error);
 * if (validationErrors) {
 *   validationErrors.forEach(({ field, message }) => {
 *     form.setError(field, { message });
 *   });
 * }
 * ```
 */
export const getValidationErrors = (
  error: unknown
): Array<{ field: string; message: string }> | null => {
  if (error instanceof ApiError && error.details) {
    return error.details;
  }
  return null;
};

/**
 * Check if error is validation error
 *
 * @param error - Any error
 * @returns true if this is validation error
 */
export const isValidationError = (error: unknown): boolean => {
  return error instanceof ApiError && error.isValidationError();
};

/**
 * Check if retry button should be shown
 *
 * @param error - Any error
 * @returns true if retry is possible
 */
export const canRetry = (error: unknown): boolean => {
  if (error instanceof ApiError) {
    const errorType = getErrorType(error.statusCode);
    // Can retry for server errors and network errors
    return errorType === ErrorType.SERVER_ERROR || errorType === ErrorType.NETWORK_ERROR;
  }
  return false;
};

/**
 * Get action for error handling
 *
 * @param error - Any error
 * @returns Recommended action
 */
export const getErrorAction = (error: unknown): 'retry' | 'signin' | 'dismiss' | 'contact' => {
  if (error instanceof ApiError) {
    if (error.isUnauthorized()) {
      return 'signin';
    }

    if (error.statusCode >= 500) {
      return 'retry';
    }

    if (error.isRateLimited()) {
      return 'dismiss';
    }
  }

  return 'dismiss';
};

/**
 * Type guard для ApiError
 */
export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};
