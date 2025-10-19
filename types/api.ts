/**
 * Типы для работы с API
 */

import { HTTP_STATUS } from '@/lib/http.constants';

/**
 * Структура ошибки API
 */
export interface ApiErrorResponse {
  /** Сообщение об ошибке */
  message: string;
  /** HTTP статус код */
  statusCode: number;
  /** Тип ошибки (опционально) */
  error?: string;
  /** Детали валидации (для 400 ошибок) */
  details?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Класс ошибки API для typed error handling
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

    // Сохраняем правильный stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Проверяет, является ли ошибка 401 (Unauthorized)
   */
  public isUnauthorized(): boolean {
    return this.statusCode === HTTP_STATUS.UNAUTHORIZED;
  }

  /**
   * Проверяет, является ли ошибка 403 (Forbidden)
   */
  public isForbidden(): boolean {
    return this.statusCode === HTTP_STATUS.FORBIDDEN;
  }

  /**
   * Проверяет, является ли ошибка 404 (Not Found)
   */
  public isNotFound(): boolean {
    return this.statusCode === HTTP_STATUS.NOT_FOUND;
  }

  /**
   * Проверяет, является ли ошибка 429 (Rate Limit)
   */
  public isRateLimited(): boolean {
    return this.statusCode === HTTP_STATUS.TOO_MANY_REQUESTS;
  }

  /**
   * Проверяет, является ли ошибка валидации (400)
   */
  public isValidationError(): boolean {
    return this.statusCode === HTTP_STATUS.BAD_REQUEST && Boolean(this.details?.length);
  }
}

/**
 * Опции для HTTP запросов
 */
export interface HttpRequestOptions extends RequestInit {
  /** Bearer токен для авторизации */
  accessToken?: string;
  /** Язык для Accept-Language заголовка */
  language?: string;
}

/**
 * Базовый интерфейс пагинированного ответа
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
