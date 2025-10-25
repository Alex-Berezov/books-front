/**
 * Утилиты для обработки ошибок API
 *
 * Предоставляет функции для преобразования ошибок API
 * в user-friendly сообщения и обработки различных типов ошибок.
 */

import { ApiError } from '@/types/api';
import { HTTP_STATUS } from '@/lib/http.constants';

/**
 * Типы ошибок для маппинга
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
 * User-friendly сообщения для разных типов ошибок
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
 * Детальные сообщения для конкретных HTTP статусов
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
 * Определить тип ошибки по статус коду
 *
 * @param statusCode - HTTP статус код
 * @returns Тип ошибки
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
 * Преобразовать ApiError в user-friendly сообщение
 *
 * @param error - ApiError или любая другая ошибка
 * @returns User-friendly сообщение об ошибке
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
  // Если это ApiError с кастомным сообщением
  if (error instanceof ApiError) {
    // Если есть конкретное сообщение от сервера, используем его
    if (error.message && error.message !== 'Unknown error') {
      return error.message;
    }

    // Иначе используем сообщение по статусу
    const statusMessage = STATUS_MESSAGES[error.statusCode];
    if (statusMessage) {
      return statusMessage;
    }

    // Или общее сообщение по типу ошибки
    const errorType = getErrorType(error.statusCode);
    return ERROR_MESSAGES[errorType];
  }

  // Если это стандартная Error
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback для неизвестных ошибок
  return ERROR_MESSAGES[ErrorType.UNKNOWN];
};

/**
 * Получить детали валидационных ошибок
 *
 * @param error - ApiError
 * @returns Массив валидационных ошибок или null
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
 * Проверить, является ли ошибка ошибкой валидации
 *
 * @param error - Любая ошибка
 * @returns true если это ошибка валидации
 */
export const isValidationError = (error: unknown): boolean => {
  return error instanceof ApiError && error.isValidationError();
};

/**
 * Проверить, нужно ли показывать retry кнопку
 *
 * @param error - Любая ошибка
 * @returns true если можно делать retry
 */
export const canRetry = (error: unknown): boolean => {
  if (error instanceof ApiError) {
    const errorType = getErrorType(error.statusCode);
    // Можно retry для server errors и network errors
    return errorType === ErrorType.SERVER_ERROR || errorType === ErrorType.NETWORK_ERROR;
  }
  return false;
};

/**
 * Получить action для обработки ошибки
 *
 * @param error - Любая ошибка
 * @returns Рекомендуемое действие
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
