/**
 * Типы для User endpoints
 *
 * Профиль пользователя, настройки
 */

import type { ISODate, RoleName, SupportedLang, UUID } from './common';

/**
 * Ответ с информацией о текущем пользователе
 */
export interface UserMeResponse {
  id: UUID;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  languagePreference?: SupportedLang;
  roles: RoleName[];
  createdAt: ISODate;
  updatedAt: ISODate;
}
