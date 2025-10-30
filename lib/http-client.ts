/**
 * Расширенный HTTP клиент с поддержкой NextAuth и retry логики
 *
 * Возможности:
 * - Автоматическое получение токена из NextAuth
 * - Обработка 401 с автоматическим refresh
 * - Retry логика для временных ошибок
 * - Интеграция с языками
 */

import { getSession, signOut } from 'next-auth/react';
import { ApiError } from '@/types/api';
import type { HttpRequestOptions } from '@/types/api';
import { httpGet as baseHttpGet, httpPost as baseHttpPost, httpPatch, httpDelete } from './http';

/**
 * Расширенные опции для HTTP запросов
 */
export interface ExtendedHttpOptions extends HttpRequestOptions {
  /** Требуется ли автоматическая авторизация */
  requireAuth?: boolean;
  /** Максимальное количество попыток retry */
  maxRetries?: number;
  /** Включить retry при 401 (автоматический refresh) */
  retry401?: boolean;
}

/**
 * Получить текущую сессию и access token
 */
const getCurrentSession = async () => {
  // Только на клиенте
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const session = await getSession();
    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
};

/**
 * Выполнить logout при неудачной авторизации
 */
const handleAuthFailure = async () => {
  if (typeof window !== 'undefined') {
    await signOut({ redirect: true, callbackUrl: '/en/auth/sign-in' });
  }
};

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
  const { requireAuth = true, retry401 = true, maxRetries: _maxRetries = 0, ...fetchOptions } = options;

  // Получаем токен если requireAuth = true
  let accessToken = fetchOptions.accessToken;
  if (requireAuth && !accessToken) {
    const session = await getCurrentSession();
    accessToken = session?.accessToken;

    if (!accessToken) {
      throw new ApiError({
        message: 'Authentication required',
        statusCode: 401,
        error: 'Unauthorized',
      });
    }
  }

  try {
    // Первая попытка запроса
    return await baseHttpGet<T>(endpoint, {
      ...fetchOptions,
      accessToken,
    });
  } catch (error) {
    // Обработка 401 с автоматическим refresh
    if (error instanceof ApiError && error.isUnauthorized() && retry401) {
      try {
        // Обновляем сессию (NextAuth сделает refresh в jwt callback)
        const newSession = await getCurrentSession();

        if (!newSession?.accessToken) {
          // Refresh не удался - делаем logout
          await handleAuthFailure();
          throw error;
        }

        // Повторяем запрос с новым токеном
        return await baseHttpGet<T>(endpoint, {
          ...fetchOptions,
          accessToken: newSession.accessToken,
        });
      } catch (refreshError) {
        // Если refresh не помог - делаем logout
        await handleAuthFailure();
        throw refreshError;
      }
    }

    // Retry для других ошибок (опционально)
    if (_maxRetries > 0 && error instanceof ApiError) {
      // Retry только для 5xx или сетевых ошибок
      const shouldRetry = error.statusCode >= 500 || error.statusCode === 0;

      if (shouldRetry) {
        // Простой retry без backoff (для более сложной логики можно добавить)
        try {
          return await baseHttpGet<T>(endpoint, {
            ...fetchOptions,
            accessToken,
          });
        } catch (_retryError) {
          // Если retry не помог, бросаем оригинальную ошибку
          throw error;
        }
      }
    }

    throw error;
  }
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
  const { requireAuth = true, retry401 = true, ...fetchOptions } = options;

  // Получаем токен если requireAuth = true
  let accessToken = fetchOptions.accessToken;
  if (requireAuth && !accessToken) {
    const session = await getCurrentSession();
    accessToken = session?.accessToken;

    if (!accessToken) {
      throw new ApiError({
        message: 'Authentication required',
        statusCode: 401,
        error: 'Unauthorized',
      });
    }
  }

  try {
    // Первая попытка запроса
    return await baseHttpPost<T>(endpoint, body, {
      ...fetchOptions,
      accessToken,
    });
  } catch (error) {
    // Обработка 401 с автоматическим refresh
    if (error instanceof ApiError && error.isUnauthorized() && retry401) {
      try {
        // Обновляем сессию (NextAuth сделает refresh в jwt callback)
        const newSession = await getCurrentSession();

        if (!newSession?.accessToken) {
          // Refresh не удался - делаем logout
          await handleAuthFailure();
          throw error;
        }

        // Повторяем запрос с новым токеном
        return await baseHttpPost<T>(endpoint, body, {
          ...fetchOptions,
          accessToken: newSession.accessToken,
        });
      } catch (refreshError) {
        // Если refresh не помог - делаем logout
        await handleAuthFailure();
        throw refreshError;
      }
    }

    throw error;
  }
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
  let accessToken = fetchOptions.accessToken;
  if (requireAuth && !accessToken) {
    const session = await getCurrentSession();
    accessToken = session?.accessToken;

    if (!accessToken) {
      throw new ApiError({
        message: 'Authentication required',
        statusCode: 401,
        error: 'Unauthorized',
      });
    }
  }

  try {
    // Первая попытка запроса
    return await httpPatch<T>(endpoint, body, {
      ...fetchOptions,
      accessToken,
    });
  } catch (error) {
    // Обработка 401 с автоматическим refresh
    if (error instanceof ApiError && error.isUnauthorized() && retry401) {
      try {
        // Обновляем сессию (NextAuth сделает refresh в jwt callback)
        const newSession = await getCurrentSession();

        if (!newSession?.accessToken) {
          // Refresh не удался - делаем logout
          await handleAuthFailure();
          throw error;
        }

        // Повторяем запрос с новым токеном
        return await httpPatch<T>(endpoint, body, {
          ...fetchOptions,
          accessToken: newSession.accessToken,
        });
      } catch (refreshError) {
        // Если refresh не помог - делаем logout
        await handleAuthFailure();
        throw refreshError;
      }
    }

    throw error;
  }
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
  let accessToken = fetchOptions.accessToken;
  if (requireAuth && !accessToken) {
    const session = await getCurrentSession();
    accessToken = session?.accessToken;

    if (!accessToken) {
      throw new ApiError({
        message: 'Authentication required',
        statusCode: 401,
        error: 'Unauthorized',
      });
    }
  }

  try {
    // Первая попытка запроса
    return await httpDelete<T>(endpoint, {
      ...fetchOptions,
      accessToken,
    });
  } catch (error) {
    // Обработка 401 с автоматическим refresh
    if (error instanceof ApiError && error.isUnauthorized() && retry401) {
      try {
        // Обновляем сессию (NextAuth сделает refresh в jwt callback)
        const newSession = await getCurrentSession();

        if (!newSession?.accessToken) {
          // Refresh не удался - делаем logout
          await handleAuthFailure();
          throw error;
        }

        // Повторяем запрос с новым токеном
        return await httpDelete<T>(endpoint, {
          ...fetchOptions,
          accessToken: newSession.accessToken,
        });
      } catch (refreshError) {
        // Если refresh не помог - делаем logout
        await handleAuthFailure();
        throw refreshError;
      }
    }

    throw error;
  }
};

/**
 * Type guard для проверки ApiError
 */
export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};
