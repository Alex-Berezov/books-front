/**
 * HTTP methods with automatic authorization and retry
 *
 * Provides GET, POST, PATCH, DELETE methods with support for:
 * - Automatic token retrieval from NextAuth
 * - 401 retry with automatic refresh
 * - Type safety
 */

import type { ExtendedHttpOptions } from './types';
import type { HttpRequestOptions } from '@/types/api';
import {
  httpGet as baseHttpGet,
  httpPost as baseHttpPost,
  httpPatch as baseHttpPatch,
  httpPut as baseHttpPut,
  httpDelete as baseHttpDelete,
  isFormDataBody,
} from '../http';
import { getAccessToken, getOptionalAccessToken } from './auth';
import { withAuthRetry } from './retry';

/** Как запрос авторизуется: токеном в заголовке или через серверный прокси. */
type AuthRoute = Pick<HttpRequestOptions, 'accessToken' | 'viaBackendProxy'>;

interface AuthRouteInput {
  requireAuth: boolean;
  optionalAuth?: boolean;
  providedToken?: string;
  body?: unknown;
}

/**
 * Маршрут авторизованного запроса (`LEGACY-465`, решения арбитра 12.10.2026).
 *
 * В браузере авторизованный JSON-запрос идёт через прокси `/api/backend`, и токен в нём
 * не участвует: его добавляет сервер. Запасного прямого пути на отказ прокси нет —
 * путь выбирается заранее и один. Напрямую с токеном, как раньше, идут:
 * - тело `FormData` — загрузки, прокси их не принимает (переезд — заход 2 пачки `T127`);
 * - явно переданный `accessToken` и любой вызов с сервера — там прокси не нужен;
 * - `optionalAuth` — с токеном сессии, если она есть, как до захода. Такие ручки отдают
 *   публичный текст с личной частью, и среди них есть гео-зависимые (`reader-bootstrap`):
 *   бэкенд берёт страну из `cf-ipcountry`, а через прокси Cloudflare поставил бы туда страну
 *   сервера фронта. Переезд — в заходе 2, после решения о передаче страны читателя (решение
 *   арбитра 12.10.2026);
 * - запрос без авторизации — токена в нём нет вовсе.
 *
 * Обязательная авторизация без сессии по-прежнему отказывает 401 до сети — той же проверкой
 * `getAccessToken`, что и прямой путь: признак живой сессии один на оба пути. Прямой маршрут
 * явно гасит `viaBackendProxy`, пришедший в опциях вызывающего: иначе спред опций увёл бы
 * серверный вызов или загрузку на относительный адрес прокси.
 */
const resolveAuthRoute = async ({
  requireAuth,
  optionalAuth = false,
  providedToken,
  body,
}: AuthRouteInput): Promise<AuthRoute> => {
  const isFormData = isFormDataBody(body);
  const inBrowser = typeof window !== 'undefined';

  if (optionalAuth) {
    return {
      accessToken: providedToken || (await getOptionalAccessToken()),
      viaBackendProxy: false,
    };
  }
  if (providedToken || isFormData || !inBrowser || !requireAuth) {
    return {
      accessToken: await getAccessToken(requireAuth, providedToken),
      viaBackendProxy: false,
    };
  }

  // Токен браузеру не нужен — вызов только отказывает 401 до сети, если сессии нет.
  await getAccessToken(true);
  return { viaBackendProxy: true };
};

/** Токен для попытки: через прокси — никакого, иначе обновлённый после 401 или исходный. */
const tokenFor = (route: AuthRoute, refreshedToken?: string): string | undefined =>
  route.viaBackendProxy ? undefined : refreshedToken || route.accessToken;

/**
 * Performs GET request with automatic authorization and retry
 *
 * @param endpoint - Endpoint path
 * @param options - Extended request options
 * @returns Typed response
 */
export const httpGetAuth = async <T>(
  endpoint: string,
  options: ExtendedHttpOptions = {}
): Promise<T> => {
  const {
    requireAuth = true,
    optionalAuth = false,
    retry401 = true,
    maxRetries: _maxRetries = 0,
    ...fetchOptions
  } = options;

  // With optionalAuth an absent session is not an error
  const route = await resolveAuthRoute({
    requireAuth,
    optionalAuth,
    providedToken: fetchOptions.accessToken,
  });

  // Wrap request in retry logic
  return withAuthRetry(
    async (refreshedToken?: string) => {
      return baseHttpGet<T>(endpoint, {
        ...fetchOptions,
        ...route,
        accessToken: tokenFor(route, refreshedToken),
      });
    },
    retry401,
    route.viaBackendProxy
  );
};

/**
 * Performs POST request with automatic authorization and retry
 *
 * @param endpoint - Endpoint path
 * @param body - Request body
 * @param options - Extended request options
 * @returns Typed response
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

  const route = await resolveAuthRoute({
    requireAuth,
    providedToken: fetchOptions.accessToken,
    body,
  });

  // Wrap request in retry logic
  return withAuthRetry(
    async (refreshedToken?: string) => {
      return baseHttpPost<T>(endpoint, body, {
        ...fetchOptions,
        ...route,
        accessToken: tokenFor(route, refreshedToken),
      });
    },
    retry401,
    route.viaBackendProxy
  );
};

/**
 * Performs PATCH request with automatic authorization and retry
 *
 * @param endpoint - Endpoint path
 * @param body - Request body
 * @param options - Extended request options
 * @returns Typed response
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

  const route = await resolveAuthRoute({
    requireAuth,
    providedToken: fetchOptions.accessToken,
    body,
  });

  // Wrap request in retry logic
  return withAuthRetry(
    async (refreshedToken?: string) => {
      return baseHttpPatch<T>(endpoint, body, {
        ...fetchOptions,
        ...route,
        accessToken: tokenFor(route, refreshedToken),
      });
    },
    retry401,
    route.viaBackendProxy
  );
};

/**
 * Performs DELETE request with automatic authorization and retry
 *
 * @param endpoint - Endpoint path
 * @param options - Extended request options
 * @returns Typed response
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

  const route = await resolveAuthRoute({
    requireAuth,
    providedToken: fetchOptions.accessToken,
  });

  // Wrap request in retry logic
  return withAuthRetry(
    async (refreshedToken?: string) => {
      return baseHttpDelete<T>(endpoint, {
        ...fetchOptions,
        ...route,
        accessToken: tokenFor(route, refreshedToken),
      });
    },
    retry401,
    route.viaBackendProxy
  );
};

/**
 * Performs PUT request with automatic authorization and retry
 *
 * @param endpoint - Endpoint path
 * @param body - Request body
 * @param options - Extended request options
 * @returns Typed response
 */
export const httpPutAuth = async <T>(
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

  const route = await resolveAuthRoute({
    requireAuth,
    providedToken: fetchOptions.accessToken,
    body,
  });

  // Wrap request in retry logic
  return withAuthRetry(
    async (refreshedToken?: string) => {
      return baseHttpPut<T>(endpoint, body, {
        ...fetchOptions,
        ...route,
        accessToken: tokenFor(route, refreshedToken),
      });
    },
    retry401,
    route.viaBackendProxy
  );
};
