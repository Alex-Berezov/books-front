/**
 * Модуль авторизации для HTTP клиента
 *
 * Отвечает за получение токенов и обработку ошибок авторизации
 */

import { getSession, signOut } from 'next-auth/react';
import { ApiError } from '@/types/api';

/**
 * Получить текущую сессию и access token
 *
 * @returns Сессия пользователя или null
 */
export const getCurrentSession = async () => {
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
 * Получить access token из текущей сессии
 *
 * @param requireAuth - Требуется ли авторизация
 * @param providedToken - Токен переданный явно
 * @returns Access token или null
 * @throws ApiError если requireAuth = true и токена нет
 */
export const getAccessToken = async (
  requireAuth: boolean,
  providedToken?: string
): Promise<string | undefined> => {
  // Используем переданный токен если есть
  if (providedToken) {
    return providedToken;
  }

  // Если авторизация не требуется, возвращаем undefined
  if (!requireAuth) {
    return undefined;
  }

  // Получаем токен из сессии
  const session = await getCurrentSession();
  const accessToken = session?.accessToken;

  if (!accessToken) {
    throw new ApiError({
      message: 'Authentication required',
      statusCode: 401,
      error: 'Unauthorized',
    });
  }

  return accessToken;
};

/**
 * Выполнить logout при неудачной авторизации
 */
export const handleAuthFailure = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    await signOut({ redirect: true, callbackUrl: '/en/auth/sign-in' });
  }
};
