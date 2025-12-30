import type { RoleName } from '@/types/api-schema';

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
export const ROLE_LABELS: Record<RoleName, string> = {
  admin: 'Administrator',
  content_manager: 'Content Manager',
  user: 'User',
};

/**
 * Role colors mapping
 */
export const ROLE_COLORS: Record<RoleName, 'blue' | 'green' | 'default'> = {
  admin: 'blue',
  content_manager: 'green',
  user: 'default',
};

/**
 * Pagination constants
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;
