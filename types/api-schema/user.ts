/**
 * Types for User endpoints
 *
 * User profile, settings
 */

import type { ISODate, RoleName, SupportedLang, UUID } from './common';

/**
 * Response with current user information
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
