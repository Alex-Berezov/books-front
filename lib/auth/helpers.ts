/**
 * Utilities for working with authorization and session
 *
 * Provides helper functions for getting current user,
 * checking roles and working with session on server.
 */

import { auth } from '@/lib/auth/auth';
import { STAFF_ROLES } from './constants';

/**
 * Get current user from session (server function)
 *
 * @returns user session or null
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
 * Check if user is authenticated
 *
 * @returns true if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getCurrentUser();
  return !!session && !!session.user;
};

/**
 * Check if user has a specific role
 *
 * @param role - role to check (admin | content_manager | user)
 * @returns true if user has the specified role
 */
export const hasRole = async (role: string): Promise<boolean> => {
  const session = await getCurrentUser();
  if (!session?.user?.roles) return false;
  return session.user.roles.includes(role);
};

/**
 * Check if user is administrator or content manager
 *
 * @returns true if user is staff (admin or content_manager)
 */
export const isStaff = async (): Promise<boolean> => {
  const session = await getCurrentUser();
  if (!session?.user?.roles) return false;

  // Type casting is necessary for compatibility with readonly array
  const staffRoles: readonly string[] = STAFF_ROLES;
  return session.user.roles.some((role) => staffRoles.includes(role));
};
