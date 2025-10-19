/**
 * Константы для работы с HTTP API
 */

/**
 * HTTP статус коды
 */
export const HTTP_STATUS = {
  /** 200 - Успешный запрос */
  OK: 200,
  /** 400 - Ошибка валидации */
  BAD_REQUEST: 400,
  /** 401 - Требуется авторизация */
  UNAUTHORIZED: 401,
  /** 403 - Доступ запрещён */
  FORBIDDEN: 403,
  /** 404 - Ресурс не найден */
  NOT_FOUND: 404,
  /** 429 - Превышен лимит запросов */
  TOO_MANY_REQUESTS: 429,
  /** 500 - Внутренняя ошибка сервера */
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Типы ошибок API
 */
export const API_ERROR_TYPE = {
  /** Ошибка парсинга JSON */
  PARSE_ERROR: 'ParseError',
  /** Ошибка валидации */
  VALIDATION_ERROR: 'ValidationError',
  /** Ошибка авторизации */
  UNAUTHORIZED: 'Unauthorized',
  /** Доступ запрещён */
  FORBIDDEN: 'Forbidden',
  /** Ресурс не найден */
  NOT_FOUND: 'NotFound',
  /** Превышен лимит запросов */
  RATE_LIMIT_EXCEEDED: 'RateLimitExceeded',
  /** Неизвестная ошибка */
  UNKNOWN_ERROR: 'UnknownError',
} as const;

/**
 * Дефолтные сообщения об ошибках
 */
export const DEFAULT_ERROR_MESSAGES = {
  /** Некорректный JSON ответ */
  INVALID_JSON: 'Invalid JSON response from server',
  /** Неизвестная ошибка */
  UNKNOWN: 'An error occurred',
  /** Сетевая ошибка */
  NETWORK_ERROR: 'Network error occurred',
} as const;

/**
 * HTTP методы
 */
export const HTTP_METHOD = {
  GET: 'GET',
  POST: 'POST',
  PATCH: 'PATCH',
  PUT: 'PUT',
  DELETE: 'DELETE',
} as const;

/**
 * HTTP заголовки
 */
export const HTTP_HEADER = {
  /** Тип контента */
  CONTENT_TYPE: 'Content-Type',
  /** Авторизация */
  AUTHORIZATION: 'Authorization',
  /** Язык */
  ACCEPT_LANGUAGE: 'Accept-Language',
} as const;

/**
 * Значения заголовков
 */
export const HEADER_VALUE = {
  /** JSON тип контента */
  JSON: 'application/json',
} as const;

/**
 * Префиксы для авторизации
 */
export const AUTH_PREFIX = {
  /** Bearer токен */
  BEARER: 'Bearer',
} as const;
