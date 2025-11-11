/**
 * Endpoints for authorized users
 *
 * Contains typed functions for working with user data
 * that require authorization.
 */

import { httpGetAuth } from '@/lib/http-client';
import type { UserMeResponse } from '@/types/api-schema';

/**
 * Get current user data
 *
 * @returns User data
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
