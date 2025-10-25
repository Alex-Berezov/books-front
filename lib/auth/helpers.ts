/**
 * Утилиты для работы с авторизацией и сессией
 *
 * Предоставляет helper-функции для получения текущего пользователя,
 * проверки ролей и работы с сессией на сервере.
 */

import { auth } from '@/lib/auth/auth';
import { STAFF_ROLES } from './constants';

/**
 * Получить текущего пользователя из сессии (серверная функция)
 *
 * @returns сессия пользователя или null
 *
 * @example
 * ```ts
 * const session = await getCurrentUser();
 * if (!session) {
 *   redirect('/en/auth/sign-in');
 * }
 * console.log(session.user.email);
 * ```
 */
export const getCurrentUser = async () => {
  const session = await auth();
  return session;
};

/**
 * Проверить, авторизован ли пользователь
 *
 * @returns true если пользователь авторизован
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getCurrentUser();
  return !!session && !!session.user;
};

/**
 * Проверить, имеет ли пользователь определённую роль
 *
 * @param role - роль для проверки (admin | content_manager | user)
 * @returns true если у пользователя есть указанная роль
 */
export const hasRole = async (role: string): Promise<boolean> => {
  const session = await getCurrentUser();
  if (!session?.user?.roles) return false;
  return session.user.roles.includes(role);
};

/**
 * Проверить, является ли пользователь администратором или контент-менеджером
 *
 * @returns true если пользователь staff (admin или content_manager)
 */
export const isStaff = async (): Promise<boolean> => {
  const session = await getCurrentUser();
  if (!session?.user?.roles) return false;

  // Приведение типа необходимо для совместимости с readonly array
  const staffRoles: readonly string[] = STAFF_ROLES;
  return session.user.roles.some((role) => staffRoles.includes(role));
};
