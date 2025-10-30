/**
 * HTTP клиент для работы с API
 *
 * Возможности:
 * - Автоматическая установка базового URL
 * - Поддержка Authorization (Bearer token)
 * - Поддержка Accept-Language заголовка
 * - Типизированная обработка ошибок
 * - JSON по умолчанию
 */

import { ApiError } from '@/types/api';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { HttpRequestOptions } from '@/types/api';
import {
  HTTP_METHOD,
  HTTP_HEADER,
  HEADER_VALUE,
  AUTH_PREFIX,
  API_ERROR_TYPE,
  DEFAULT_ERROR_MESSAGES,
} from './http.constants';

/**
 * Базовый URL API из переменных окружения
 * В production: https://api.bibliaris.com/api
 * В development: http://localhost:5000/api
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Создаёт заголовки для HTTP запроса
 *
 * @param options - Опции запроса с токеном и языком
 * @returns Готовые заголовки для fetch
 */
const createHeaders = (options?: HttpRequestOptions): HeadersInit => {
  const headers: HeadersInit = {
    [HTTP_HEADER.CONTENT_TYPE]: HEADER_VALUE.JSON,
  };

  // Добавляем Authorization заголовок если есть токен
  if (options?.accessToken) {
    headers[HTTP_HEADER.AUTHORIZATION] = `${AUTH_PREFIX.BEARER} ${options.accessToken}`;
  }

  // Добавляем Accept-Language заголовок если указан язык
  if (options?.language) {
    headers[HTTP_HEADER.ACCEPT_LANGUAGE] = options.language;
  }

  return headers;
};

/**
 * Обрабатывает ответ от API
 *
 * @param response - Ответ от fetch
 * @returns Распарсенные данные
 * @throws {ApiError} При ошибке API или сети
 */
const handleResponse = async <T>(response: Response): Promise<T> => {
  // Пытаемся распарсить JSON ответ
  let data;
  try {
    data = await response.json();
  } catch (_error) {
    // Если не удалось распарсить JSON, это серверная ошибка
    throw new ApiError({
      message: DEFAULT_ERROR_MESSAGES.INVALID_JSON,
      statusCode: response.status,
      error: API_ERROR_TYPE.PARSE_ERROR,
    });
  }

  // Если статус не OK, выбрасываем типизированную ошибку
  if (!response.ok) {
    throw new ApiError({
      message: data.message || DEFAULT_ERROR_MESSAGES.UNKNOWN,
      statusCode: response.status,
      error: data.error,
      details: data.details,
    });
  }

  return data as T;
};

/**
 * Выполняет GET запрос к API
 *
 * @param endpoint - Путь эндпоинта (без базового URL)
 * @param options - Опции запроса
 * @returns Типизированный ответ
 *
 * @example
 * ```ts
 * const user = await httpGet<User>('/users/me', {
 *   accessToken: session.accessToken,
 *   language: 'en'
 * });
 * ```
 */
export const httpGet = async <T>(endpoint: string, options?: HttpRequestOptions): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = createHeaders(options);

  const response = await fetch(url, {
    method: HTTP_METHOD.GET,
    headers,
    ...options,
  });

  return handleResponse<T>(response);
};

/**
 * Выполняет POST запрос к API
 *
 * @param endpoint - Путь эндпоинта (без базового URL)
 * @param body - Тело запроса
 * @param options - Опции запроса
 * @returns Типизированный ответ
 *
 * @example
 * ```ts
 * const response = await httpPost<AuthResponse>('/auth/login', {
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 * ```
 */
export const httpPost = async <T>(
  endpoint: string,
  body?: unknown,
  options?: HttpRequestOptions
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = createHeaders(options);

  const response = await fetch(url, {
    method: HTTP_METHOD.POST,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  return handleResponse<T>(response);
};

/**
 * Выполняет PATCH запрос к API
 *
 * @param endpoint - Путь эндпоинта (без базового URL)
 * @param body - Тело запроса
 * @param options - Опции запроса
 * @returns Типизированный ответ
 *
 * @example
 * ```ts
 * const user = await httpPatch<User>('/users/me', {
 *   name: 'New Name'
 * }, {
 *   accessToken: session.accessToken
 * });
 * ```
 */
export const httpPatch = async <T>(
  endpoint: string,
  body?: unknown,
  options?: HttpRequestOptions
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = createHeaders(options);

  const response = await fetch(url, {
    method: HTTP_METHOD.PATCH,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  return handleResponse<T>(response);
};

/**
 * Выполняет DELETE запрос к API
 *
 * @param endpoint - Путь эндпоинта (без базового URL)
 * @param options - Опции запроса
 * @returns Типизированный ответ
 *
 * @example
 * ```ts
 * await httpDelete('/me/bookshelf/version-id', {
 *   accessToken: session.accessToken
 * });
 * ```
 */
export const httpDelete = async <T>(endpoint: string, options?: HttpRequestOptions): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = createHeaders(options);

  const response = await fetch(url, {
    method: HTTP_METHOD.DELETE,
    headers,
    ...options,
  });

  return handleResponse<T>(response);
};

/**
 * Выполняет PUT запрос к API
 *
 * @param endpoint - Путь эндпоинта (без базового URL)
 * @param body - Тело запроса
 * @param options - Опции запроса
 * @returns Типизированный ответ
 *
 * @example
 * ```ts
 * const progress = await httpPut<Progress>('/me/progress/version-id', {
 *   chapterNumber: 5,
 *   position: 1234
 * }, {
 *   accessToken: session.accessToken
 * });
 * ```
 */
export const httpPut = async <T>(
  endpoint: string,
  body?: unknown,
  options?: HttpRequestOptions
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = createHeaders(options);

  const response = await fetch(url, {
    method: HTTP_METHOD.PUT,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  return handleResponse<T>(response);
};

/**
 * Утилита для построения URL с query параметрами
 *
 * @param endpoint - Базовый эндпоинт
 * @param params - Объект с query параметрами
 * @returns URL с query string
 *
 * @example
 * ```ts
 * const url = buildUrlWithParams('/books', { page: 1, limit: 10 });
 * // Результат: '/books?page=1&limit=10'
 * ```
 */
export const buildUrlWithParams = (
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string => {
  if (!params) {
    return endpoint;
  }

  // Фильтруем undefined значения и строим query string
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
};

/**
 * Утилита для построения пути с языковым префиксом
 *
 * @param lang - Язык
 * @param path - Путь без языка
 * @returns Полный путь с языком
 *
 * @example
 * ```ts
 * const endpoint = buildLangPath('en', '/books/some-slug/overview');
 * // Результат: '/en/books/some-slug/overview'
 * ```
 */
export const buildLangPath = (lang: SupportedLang, path: string): string => {
  // Убираем начальный слэш если есть
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `/${lang}/${normalizedPath}`;
};
