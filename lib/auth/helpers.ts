/**
 * Utilities for working with authorization and session
 *
 * Provides helper functions for getting current user,
 * checking roles and working with session on server.
 */

import { auth } from '@/lib/auth/auth';
import { ADMIN_PANEL_ROLES, STAFF_ROLES, UserRole } from './constants';

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

/**
 * Check if user has the Phase 19 lawyer role
 *
 * @returns true if user is a lawyer
 */
export const isLawyer = async (): Promise<boolean> => hasRole(UserRole.LAWYER);

/**
 * Check if user may enter `/admin/*` at all: admin, content manager or lawyer.
 *
 * Not the same as {@link isStaff} — a lawyer reaches the admin panel but only sees the legal
 * sections, and must never gain content or moderation rights.
 *
 * @returns true if user may open the admin panel
 */
export const canAccessAdminPanel = async (): Promise<boolean> => {
  const session = await getCurrentUser();
  if (!session?.user?.roles) return false;

  const adminPanelRoles: readonly string[] = ADMIN_PANEL_ROLES;
  return session.user.roles.some((role) => adminPanelRoles.includes(role));
};
