/**
 * Утилиты для работы с авторизацией и сессией
 *
 * Предоставляет helper-функции для получения текущего пользователя,
 * проверки ролей и работы с сессией на сервере.
 *
 * TODO (M1): Реализовать полную функциональность
 */

import { STAFF_ROLES, UserRole } from './constants';

// TODO (M1): Раскомментировать когда будет реализована логика авторизации
// import { auth } from '@/lib/auth/auth';

/**
 * Получить текущего пользователя из сессии (серверная функция)
 *
 * TODO (M1): Реализовать получение сессии
 * TODO (M1): Добавить типизацию возвращаемого значения
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
  // TODO (M1): Раскомментировать после реализации callbacks
  // const session = await auth();
  // return session;

  console.warn('getCurrentUser: TODO - реализовать в M1');
  return null;
};

/**
 * Проверить, авторизован ли пользователь
 *
 * TODO (M1): Реализовать проверку
 *
 * @returns true если пользователь авторизован
 */
export const isAuthenticated = async (): Promise<boolean> => {
  // TODO (M1): Реализовать проверку сессии
  // const session = await getCurrentUser();
  // return !!session;

  console.warn('isAuthenticated: TODO - реализовать в M1');
  return false;
};

/**
 * Проверить, имеет ли пользователь определённую роль
 *
 * TODO (M1): Реализовать проверку ролей
 *
 * @param role - роль для проверки (admin | content_manager)
 * @returns true если у пользователя есть указанная роль
 */
export const hasRole = async (role: string): Promise<boolean> => {
  // TODO (M1): Реализовать проверку роли
  // const session = await getCurrentUser();
  // if (!session?.user?.roles) return false;
  // return session.user.roles.includes(role);

  console.warn('hasRole: TODO - реализовать в M1');
  return false;
};

/**
 * Проверить, является ли пользователь администратором или контент-менеджером
 *
 * TODO (M1): Реализовать проверку staff-ролей
 *
 * @returns true если пользователь staff (admin или content_manager)
 */
export const isStaff = async (): Promise<boolean> => {
  // TODO (M1): Реализовать проверку staff-ролей
  // const session = await getCurrentUser();
  // if (!session?.user?.roles) return false;
  // return session.user.roles.some((role) =>
  //   STAFF_ROLES.includes(role as UserRole)
  // );

  console.warn('isStaff: TODO - реализовать в M1');
  return false;
};
