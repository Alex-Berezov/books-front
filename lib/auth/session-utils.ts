/**
 * Утилиты для работы с сессией NextAuth в HTTP запросах
 *
 * Предоставляет функции для получения токенов авторизации
 * как на клиенте, так и на сервере.
 */

import { getSession } from 'next-auth/react';
import { auth } from '@/lib/auth/auth';

/**
 * Получить access token на клиенте
 *
 * @returns Access token или null
 */
export const getClientAccessToken = async (): Promise<string | null> => {
  const session = await getSession();
  return session?.accessToken || null;
};

/**
 * Получить access token на сервере
 *
 * @returns Access token или null
 */
export const getServerAccessToken = async (): Promise<string | null> => {
  const session = await auth();
  return session?.accessToken || null;
};

/**
 * Получить access token (универсальная функция)
 *
 * Автоматически определяет контекст (клиент/сервер)
 *
 * @returns Access token или null
 */
export const getAccessToken = async (): Promise<string | null> => {
  // Проверяем, находимся ли мы в браузере
  if (typeof window !== 'undefined') {
    return getClientAccessToken();
  }

  // Серверный контекст
  return getServerAccessToken();
};
