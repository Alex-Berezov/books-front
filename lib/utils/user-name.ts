import type { User } from '@/types/api-schema/user';

/**
 * Имя пользователя для показа в админке.
 *
 * 🔴 Отображаемого имени в ответе сервера нет: `PublicUserWithRolesDto` отдаёт `name`,
 * `firstName`, `lastName` и `nickname`, каждое из которых может быть `null`. Прежде экран
 * читал несуществующее поле `displayName` и показывал «Unknown» всякий раз, когда не были
 * заполнены сразу оба — `firstName` и `lastName` (`LEGACY-380`).
 *
 * Порядок предпочтения: полное имя из двух частей, затем единое `name`, затем то, что есть
 * из частей, затем никнейм. Почта — последний рубеж: она заполнена всегда, поэтому
 * «Unknown» на экране не появляется вовсе.
 */
export const userDisplayName = (
  user: Pick<User, 'name' | 'firstName' | 'lastName' | 'nickname' | 'email'>
): string => {
  const firstName = user.firstName?.trim();
  const lastName = user.lastName?.trim();

  if (firstName && lastName) return `${firstName} ${lastName}`;

  return user.name?.trim() || firstName || lastName || user.nickname?.trim() || user.email;
};
