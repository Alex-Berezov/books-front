/**
 * HTTP методы с автоматической авторизацией и retry
 *
 * Предоставляет GET, POST, PATCH, DELETE методы с поддержкой:
 * - Автоматического получения токена из NextAuth
 * - Retry при 401 с автоматическим refresh
 * - Типобезопасности
 */

import type { ExtendedHttpOptions } from './types';
import {
  httpGet as baseHttpGet,
  httpPost as baseHttpPost,
  httpPatch as baseHttpPatch,
  httpDelete as baseHttpDelete,
} from '../http';
import { getAccessToken } from './auth';
import { withAuthRetry } from './retry';

/**
 * Выполняет GET запрос с автоматической авторизацией и retry
 *
 * @param endpoint - Путь эндпоинта
 * @param options - Расширенные опции запроса
 * @returns Типизированный ответ
 */
export const httpGetAuth = async <T>(
  endpoint: string,
  options: ExtendedHttpOptions = {}
): Promise<T> => {
  const {
    requireAuth = true,
    retry401 = true,
    maxRetries: _maxRetries = 0,
    ...fetchOptions
  } = options;

  // Получаем токен если requireAuth = true
  const initialToken = await getAccessToken(requireAuth, fetchOptions.accessToken);

  // Оборачиваем запрос в retry логику
  return withAuthRetry(async (refreshedToken?: string) => {
    const accessToken = refreshedToken || initialToken;

    return baseHttpGet<T>(endpoint, {
      ...fetchOptions,
      accessToken,
    });
  }, retry401);
};

/**
 * Выполняет POST запрос с автоматической авторизацией и retry
 *
 * @param endpoint - Путь эндпоинта
 * @param body - Тело запроса
 * @param options - Расширенные опции запроса
 * @returns Типизированный ответ
 */
export const httpPostAuth = async <T>(
  endpoint: string,
  body?: unknown,
  options: ExtendedHttpOptions = {}
): Promise<T> => {
  const {
    requireAuth = true,
    retry401 = true,
    maxRetries: _maxRetries = 0,
    ...fetchOptions
  } = options;

  // Получаем токен если requireAuth = true
  const initialToken = await getAccessToken(requireAuth, fetchOptions.accessToken);

  // Оборачиваем запрос в retry логику
  return withAuthRetry(async (refreshedToken?: string) => {
    const accessToken = refreshedToken || initialToken;

    return baseHttpPost<T>(endpoint, body, {
      ...fetchOptions,
      accessToken,
    });
  }, retry401);
};

/**
 * Выполняет PATCH запрос с автоматической авторизацией и retry
 *
 * @param endpoint - Путь эндпоинта
 * @param body - Тело запроса
 * @param options - Расширенные опции запроса
 * @returns Типизированный ответ
 */
export const httpPatchAuth = async <T>(
  endpoint: string,
  body?: unknown,
  options: ExtendedHttpOptions = {}
): Promise<T> => {
  const {
    requireAuth = true,
    retry401 = true,
    maxRetries: _maxRetries = 0,
    ...fetchOptions
  } = options;

  // Получаем токен если requireAuth = true
  const initialToken = await getAccessToken(requireAuth, fetchOptions.accessToken);

  // Оборачиваем запрос в retry логику
  return withAuthRetry(async (refreshedToken?: string) => {
    const accessToken = refreshedToken || initialToken;

    return baseHttpPatch<T>(endpoint, body, {
      ...fetchOptions,
      accessToken,
    });
  }, retry401);
};

/**
 * Выполняет DELETE запрос с автоматической авторизацией и retry
 *
 * @param endpoint - Путь эндпоинта
 * @param options - Расширенные опции запроса
 * @returns Типизированный ответ
 */
export const httpDeleteAuth = async <T>(
  endpoint: string,
  options: ExtendedHttpOptions = {}
): Promise<T> => {
  const {
    requireAuth = true,
    retry401 = true,
    maxRetries: _maxRetries = 0,
    ...fetchOptions
  } = options;

  // Получаем токен если requireAuth = true
  const initialToken = await getAccessToken(requireAuth, fetchOptions.accessToken);

  // Оборачиваем запрос в retry логику
  return withAuthRetry(async (refreshedToken?: string) => {
    const accessToken = refreshedToken || initialToken;

    return baseHttpDelete<T>(endpoint, {
      ...fetchOptions,
      accessToken,
    });
  }, retry401);
};
