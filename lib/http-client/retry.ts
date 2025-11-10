/**
 * Retry логика для HTTP запросов
 *
 * Обрабатывает повторные попытки при ошибках 401 (с refresh токена)
 * и других временных ошибках
 */

import { ApiError } from '@/types/api';
import { getCurrentSession, handleAuthFailure } from './auth';

/**
 * Обертка для HTTP запроса с автоматическим retry при 401
 *
 * @param requestFn - Функция выполняющая HTTP запрос
 * @param retry401 - Включить retry при 401 (автоматический refresh)
 * @returns Результат запроса
 * @throws ApiError если все попытки исчерпаны
 */
export const withAuthRetry = async <T>(
  requestFn: (accessToken?: string) => Promise<T>,
  retry401: boolean
): Promise<T> => {
  try {
    // Первая попытка запроса
    return await requestFn();
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
        return await requestFn(newSession.accessToken);
      } catch (refreshError) {
        // Если refresh не помог - делаем logout
        await handleAuthFailure();
        throw refreshError;
      }
    }

    // Пробрасываем ошибку дальше если retry не нужен
    throw error;
  }
};
