/**
 * HTTP methods with automatic authorization and retry
 *
 * Provides GET, POST, PATCH, DELETE methods with support for:
 * - Requests of a signed-in user through the server proxy `/api/backend` (`LEGACY-465`)
 * - 401 retry with automatic refresh
 * - Type safety
 */

import type { ExtendedHttpOptions } from './types';
import type { ProxiedRequestOptions } from '../http';
import {
  httpGet as baseHttpGet,
  httpPost as baseHttpPost,
  httpPatch as baseHttpPatch,
  httpPut as baseHttpPut,
  httpDelete as baseHttpDelete,
} from '../http';
import { hasUsableSession, requireLiveSession } from './auth';
import { withAuthRetry } from './retry';

/** Как запрос авторизуется: явным токеном, через серверный прокси или никак. */
type AuthRoute = Required<Pick<ProxiedRequestOptions, 'viaBackendProxy'>> &
  Pick<ProxiedRequestOptions, 'accessToken'>;

interface AuthRouteInput {
  requireAuth: boolean;
  optionalAuth?: boolean;
  providedToken?: string;
}

const VIA_PROXY: AuthRoute = { viaBackendProxy: true, accessToken: undefined };

/**
 * Маршрут авторизованного запроса (`LEGACY-465`, решения арбитра 12.10.2026).
 *
 * Токена в браузере нет: запрос вошедшего пользователя идёт через прокси `/api/backend`,
 * и токен добавляет сервер из куки сессии. Через прокси идут и загрузки (`FormData`), и
 * `optionalAuth` — страну читателя для гео-блока прокси передаёт сам (`X-Visitor-Country`).
 * Запасного прямого пути на отказ прокси нет — путь выбирается заранее и один. Напрямую идут:
 * - явно переданный `accessToken` — серверный вызов с токеном из куки (`getToken`);
 * - запрос без авторизации и `optionalAuth` без сессии, токен которой API примет (`hasUsableSession`:
 *   при любом `error` в сессии, включая временный отказ продления), — анонимно;
 * - обязательная авторизация с сервера — отказ 500 до сети (`LEGACY-140`), без сессии в
 *   браузере — 401 до сети (`requireLiveSession`).
 *
 * Прямой маршрут явно гасит `viaBackendProxy`: иначе спред опций вызывающего увёл бы
 * серверный вызов на относительный адрес прокси.
 */
const resolveAuthRoute = async ({
  requireAuth,
  optionalAuth = false,
  providedToken,
}: AuthRouteInput): Promise<AuthRoute> => {
  if (providedToken) return { viaBackendProxy: false, accessToken: providedToken };

  if (optionalAuth) {
    return (await hasUsableSession()) ? VIA_PROXY : { viaBackendProxy: false };
  }
  if (!requireAuth) return { viaBackendProxy: false };

  await requireLiveSession();
  return VIA_PROXY;
};

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
    () =>
      baseHttpGet<T>(endpoint, {
        ...fetchOptions,
        ...route,
      }),
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
  });

  // Wrap request in retry logic
  return withAuthRetry(
    () =>
      baseHttpPost<T>(endpoint, body, {
        ...fetchOptions,
        ...route,
      }),
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
  });

  // Wrap request in retry logic
  return withAuthRetry(
    () =>
      baseHttpPatch<T>(endpoint, body, {
        ...fetchOptions,
        ...route,
      }),
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
    () =>
      baseHttpDelete<T>(endpoint, {
        ...fetchOptions,
        ...route,
      }),
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
  });

  // Wrap request in retry logic
  return withAuthRetry(
    () =>
      baseHttpPut<T>(endpoint, body, {
        ...fetchOptions,
        ...route,
      }),
    retry401,
    route.viaBackendProxy
  );
};
