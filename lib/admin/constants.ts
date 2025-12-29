import { UserRole } from '@/types/api-schema';

/**
 * Status colors mapping for badges
 */
export const STATUS_COLORS = {
  published: 'success',
  active: 'success',
  visible: 'success',
  draft: 'warning',
  inactive: 'warning',
  hidden: 'warning',
  archived: 'error',
  deleted: 'error',
} as const;

/**
 * Role labels mapping
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.CONTENT_MANAGER]: 'Content Manager',
  [UserRole.USER]: 'User',
};

/**
 * Role colors mapping
 */
export const ROLE_COLORS: Record<UserRole, 'blue' | 'green' | 'default'> = {
  [UserRole.ADMIN]: 'blue',
  [UserRole.CONTENT_MANAGER]: 'green',
  [UserRole.USER]: 'default',
};

/**
 * Pagination constants
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;
