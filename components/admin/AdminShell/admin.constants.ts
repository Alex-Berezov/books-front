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
  /** Группа сайдбара, в которую сворачивается пункт. Без неё пункт лежит на верхнем уровне. */
  groupId?: string;
}

/** Roles that see the legal sections: staff plus the lawyer themselves. */
const LEGAL_SECTION_ROLES: readonly string[] = [...STAFF_ROLES, UserRole.LAWYER];

/**
 * Группа пунктов сайдбара.
 *
 * Система клиренса добавила в меню пять разделов подряд, и они вытеснили из поля зрения то, чем
 * пользуются каждый день. В сами интейки публикатор почти всегда приходит со страницы книги, а не
 * из меню, поэтому разделы прав живут свёрнутыми под одним родителем.
 */
export interface AdminMenuGroup {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

export const RIGHTS_MENU_GROUP_ID = 'rights';

export const ADMIN_MENU_GROUPS: readonly AdminMenuGroup[] = [
  { id: RIGHTS_MENU_GROUP_ID, label: 'Rights & Legal', icon: Scale },
];

/**
 * Generate menu items for specific language
 */
export const getAdminMenuItems = (lang: SupportedLang): AdminMenuItem[] => [
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
    id: 'rights-intakes',
    label: 'Rights Intakes',
    icon: ClipboardList,
    path: `/admin/${lang}/rights-intakes`,
    groupId: RIGHTS_MENU_GROUP_ID,
  },
  {
    id: 'rights-claims',
    label: 'Rights Claims',
    icon: ShieldAlert,
    path: `/admin/${lang}/rights-claims`,
    groupId: RIGHTS_MENU_GROUP_ID,
  },
  {
    id: 'rights-notifications',
    label: 'Rights Notifications',
    icon: Bell,
    path: `/admin/${lang}/rights-notifications`,
    roles: LEGAL_SECTION_ROLES,
    groupId: RIGHTS_MENU_GROUP_ID,
  },
  {
    id: 'rights-rechecks',
    label: 'Rights Rechecks',
    icon: CalendarClock,
    path: `/admin/${lang}/rights-rechecks`,
    groupId: RIGHTS_MENU_GROUP_ID,
  },
  {
    id: 'legal-reviews',
    label: 'Legal Reviews',
    icon: Scale,
    path: `/admin/${lang}/legal-reviews`,
    roles: LEGAL_SECTION_ROLES,
    groupId: RIGHTS_MENU_GROUP_ID,
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

/** Запись верхнего уровня сайдбара: либо самостоятельная ссылка, либо свёрнутая группа. */
export type AdminMenuNode =
  | { kind: 'item'; item: AdminMenuItem }
  | { kind: 'group'; group: AdminMenuGroup; items: AdminMenuItem[] };

/**
 * То же меню, но собранное в дерево: пункты с `groupId` уходят под своего родителя, остальные
 * остаются на верхнем уровне. Группа появляется на месте **первого** своего пункта в плоском
 * списке — порядок разделов задаётся там же, где и раньше, в одном месте.
 *
 * Роли фильтруются ровно тем же `getVisibleAdminMenuItems`, поэтому группа без единого доступного
 * пункта не показывается вовсе: юрист видит «Rights & Legal» с двумя разделами внутри и ничего
 * больше (ADR-004).
 */
export const getVisibleAdminMenuTree = (
  lang: SupportedLang,
  userRoles: readonly string[]
): AdminMenuNode[] => {
  const groupsById = new Map(ADMIN_MENU_GROUPS.map((group) => [group.id, group]));
  const nodes: AdminMenuNode[] = [];
  const groupNodes = new Map<string, Extract<AdminMenuNode, { kind: 'group' }>>();

  for (const item of getVisibleAdminMenuItems(lang, userRoles)) {
    const group = item.groupId ? groupsById.get(item.groupId) : undefined;
    if (!group) {
      nodes.push({ kind: 'item', item });
      continue;
    }

    const existing = groupNodes.get(group.id);
    if (existing) {
      existing.items.push(item);
      continue;
    }

    const node: Extract<AdminMenuNode, { kind: 'group' }> = { kind: 'group', group, items: [item] };
    groupNodes.set(group.id, node);
    nodes.push(node);
  }

  return nodes;
};
