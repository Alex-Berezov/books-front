/**
 * Admin panel constants
 */

import type { ComponentType } from 'react';
import {
  Archive,
  Bell,
  BookOpen,
  CalendarClock,
  FileText,
  FolderTree,
  Library,
  Tags,
  Image,
  MessageSquare,
  Users,
  User,
  ClipboardList,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { STAFF_ROLES, UserRole } from '@/lib/auth/constants';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Admin panel menu item
 */
export interface AdminMenuItem {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  path: string;
  /** Roles the item is visible to. `undefined` = STAFF_ROLES only. */
  roles?: readonly string[];
}

/** Roles that see the legal sections: staff plus the lawyer themselves. */
const LEGAL_SECTION_ROLES: readonly string[] = [...STAFF_ROLES, UserRole.LAWYER];

/**
 * Generate menu items for specific language
 */
export const getAdminMenuItems = (lang: SupportedLang): AdminMenuItem[] => [
  {
    id: 'rights-intakes',
    label: 'Rights Intakes',
    icon: ClipboardList,
    path: `/admin/${lang}/rights-intakes`,
  },
  {
    id: 'rights-claims',
    label: 'Rights Claims',
    icon: ShieldAlert,
    path: `/admin/${lang}/rights-claims`,
  },
  {
    id: 'rights-notifications',
    label: 'Rights Notifications',
    icon: Bell,
    path: `/admin/${lang}/rights-notifications`,
    roles: LEGAL_SECTION_ROLES,
  },
  {
    id: 'rights-rechecks',
    label: 'Rights Rechecks',
    icon: CalendarClock,
    path: `/admin/${lang}/rights-rechecks`,
  },
  {
    id: 'legal-reviews',
    label: 'Legal Reviews',
    icon: Scale,
    path: `/admin/${lang}/legal-reviews`,
    roles: LEGAL_SECTION_ROLES,
  },
  {
    id: 'books',
    label: 'Books',
    icon: BookOpen,
    path: `/admin/${lang}/books`,
  },
  {
    id: 'authors',
    label: 'Authors',
    icon: User,
    path: `/admin/${lang}/authors`,
  },
  {
    id: 'pages',
    label: 'Pages',
    icon: FileText,
    path: `/admin/${lang}/pages`,
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: FolderTree,
    path: `/admin/${lang}/categories`,
  },
  {
    id: 'genres',
    label: 'Genres',
    icon: Library,
    path: `/admin/${lang}/genres`,
  },
  {
    id: 'collections',
    label: 'Collections',
    icon: Archive,
    path: `/admin/${lang}/collections`,
  },
  {
    id: 'tags',
    label: 'Tags',
    icon: Tags,
    path: `/admin/${lang}/tags`,
  },
  {
    id: 'media',
    label: 'Media',
    icon: Image,
    path: `/admin/${lang}/media`,
  },
  {
    id: 'comments',
    label: 'Comments',
    icon: MessageSquare,
    path: `/admin/${lang}/comments`,
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    path: `/admin/${lang}/users`,
  },
];

/**
 * Menu items a given set of user roles may see.
 *
 * An item without an explicit `roles` list is staff-only, so a user whose only role is `lawyer`
 * ends up with exactly two entries: Legal Reviews and Rights Notifications (ADR-004).
 */
export const getVisibleAdminMenuItems = (
  lang: SupportedLang,
  userRoles: readonly string[]
): AdminMenuItem[] => {
  const staffRoles: readonly string[] = STAFF_ROLES;
  const isStaff = userRoles.some((role) => staffRoles.includes(role));

  return getAdminMenuItems(lang).filter((item) =>
    item.roles ? item.roles.some((role) => userRoles.includes(role)) : isStaff
  );
};
