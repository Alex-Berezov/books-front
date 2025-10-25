/**
 * Эндпоинты для авторизованных пользователей
 *
 * Содержит типизированные функции для работы с данными пользователя,
 * требующими авторизации.
 */

import type { UserMeResponse } from '@/types/api-schema';
import { httpGetAuth } from '@/lib/http-client';

/**
 * Получить данные текущего пользователя
 *
 * @returns Данные пользователя
 *
 * @example
 * ```ts
 * const user = await getMe();
 * console.log(user.email, user.roles);
 * ```
 */
export const getMe = async (): Promise<UserMeResponse> => {
  return httpGetAuth<UserMeResponse>('/users/me', {
    requireAuth: true,
  });
};
