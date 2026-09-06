/**
 * API error handling utilities
 *
 * Provides functions for converting API errors
 * to user-friendly messages and handling different error types.
 */

import { API_ERROR_TYPE, HTTP_STATUS } from '@/lib/http.constants';
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
  RIGHTS_BLOCKED = 'rights_blocked',
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
  [ErrorType.RIGHTS_BLOCKED]: 'This content is not available in your region',
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
  [HTTP_STATUS.BAD_GATEWAY]: 'Service temporarily unavailable. Please try again later',
  [HTTP_STATUS.GATEWAY_TIMEOUT]: 'Service temporarily unavailable. Please try again later',
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later',
};

/**
 * Messages for failures the status code alone does not describe.
 *
 * A malformed body arrives with an OK status, so `STATUS_MESSAGES` has nothing to say about it.
 */
export const CODE_MESSAGES: Record<string, string> = {
  [API_ERROR_TYPE.PARSE_ERROR]: 'The server returned a malformed response',
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

  if (statusCode === HTTP_STATUS.UNAVAILABLE_FOR_LEGAL_REASONS) {
    return ErrorType.RIGHTS_BLOCKED;
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
 * Карта человекочитаемых текстов отказа для всего, что бросает транспорт (`LEGACY-053`).
 *
 * 🔴 Заведена потому, что тексты жили в трёх местах и подменяли собой коды:
 * `DEFAULT_ERROR_MESSAGES` в `lib/http.constants.ts`, `AUTH_ERROR_MESSAGES`
 * в `lib/auth/constants.ts` и литерал `'Authentication required'` в двух копиях.
 * Внутренняя константа, выполняющая двойную роль «код и текст для пользователя»,
 * рано или поздно уезжает на экран как есть.
 *
 * Транспорт (`lib/http.ts`, `lib/http-client/auth.ts`) своего текста больше
 * не подставляет: он кладёт **код** в `ApiError.error`, а фразу берёт отсюда —
 * и только когда бэкенд собственного `message` не прислал.
 *
 * ⚠️ Тексты здесь английские намеренно: они видны в админке, которая не переведена
 * (`books-front/CLAUDE.md`). Публичному посетителю показывается словарь, а не они.
 *
 * ⚠️ Вторая карта в проекте всё же есть и этой правкой не тронута:
 * `components/admin/RightsIntakeDetail/rightsFileErrors.ts` держит свои тексты
 * по кодам отказа загрузки юридических файлов. Правка текста здесь панели прав
 * не меняет.
 *
 * @param statusCode - HTTP status code
 * @param code - Machine code from `ApiError.error`, when there is one
 */
export const describeApiFailure = (statusCode: number, code?: string): string => {
  // 🔴 Статус идёт первым. Неуспешный ответ часто приходит без разбираемого тела —
  // 401 пустым, 502/503 HTML-страницей от прокси, — и транспорт в этом случае ставит
  // код `ParseError`. Проверь код раньше статуса, и читатель получит «битый ответ»
  // вместо «сервис недоступен», то есть пойдёт искать поломку не там.
  const statusMessage = STATUS_MESSAGES[statusCode];
  if (statusMessage) {
    return statusMessage;
  }

  // Сюда доходит то, о чём статус ничего не говорит: успешный ответ с битым телом.
  if (code && CODE_MESSAGES[code]) {
    return CODE_MESSAGES[code];
  }

  return ERROR_MESSAGES[getErrorType(statusCode)];
};

/**
 * Ключ словаря для отказа на **публичной** странице (`LEGACY-053`).
 *
 * 🔴 Тексты в этом файле английские и предназначены админке. Публичный посетитель
 * не должен видеть ни их, ни `message` бэкенда: рендер `error.message` на странице
 * регистрации и в профиле показывал русскому читателю английскую фразу.
 * Известное разводим по словарю, всё остальное сводим к переданному общему ключу.
 *
 * ⚠️ Имена ключей приходят от страницы: у регистрации и у профиля они разные, а этот
 * модуль про транспорт и раздел словаря `auth.signin` знать не должен.
 *
 * @param error - Any error
 * @param keys - Ключи словаря: общий и, если есть, отдельные под 409 и 429
 */
export const publicErrorKey = (
  error: unknown,
  keys: { fallback: string; conflict?: string; rateLimit?: string; validation?: string }
): string => {
  if (!(error instanceof ApiError)) return keys.fallback;

  // 400/422 — форма пропустила то, что бэкенд не принял (правила длины у сторон
  // расходятся). Без своей ветки посетитель видит «не удалось» и жмёт кнопку
  // с теми же данными: прежний английский текст хотя бы называл поле.
  if (
    (error.statusCode === HTTP_STATUS.BAD_REQUEST ||
      error.statusCode === HTTP_STATUS.UNPROCESSABLE_ENTITY) &&
    keys.validation
  ) {
    return keys.validation;
  }

  // 409 — самый частый отказ обеих форм: занятая почта при регистрации и занятый
  // никнейм в профиле. Без своей ветки посетитель видит общий текст и жмёт кнопку
  // снова, не понимая, что менять.
  if (error.statusCode === HTTP_STATUS.CONFLICT && keys.conflict) return keys.conflict;
  if (error.statusCode === HTTP_STATUS.TOO_MANY_REQUESTS && keys.rateLimit) return keys.rateLimit;
  if (error.statusCode >= 500) return 'common.serverError';

  return keys.fallback;
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
    if (error.message) {
      return error.message;
    }

    return describeApiFailure(error.statusCode, error.error);
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

/**
 * Check whether the backend refused the content for legal reasons (HTTP 451).
 *
 * The backend answers 451 both when rights clearance closes the visitor's market
 * (`GEO_BLOCKED_BY_RIGHTS`) and when a rightsholder claim blocks the work
 * (`BLOCKED_BY_RIGHTS_CLAIM`). The reader is shown the same explanation for both — the claim,
 * the claimant and the reason are never disclosed outward (Phase 16, ADR-012).
 *
 * @param error - Any error
 * @returns true if the content is blocked by rights
 *
 * @example
 * ```tsx
 * if (isRightsBlockedError(error)) return <RightsBlockedNotice lang={lang} />;
 * ```
 */
export const isRightsBlockedError = (error: unknown): boolean => {
  return error instanceof ApiError && error.isRightsBlocked();
};
