'use client';

/**
 * AdminSidebar - admin panel side menu
 *
 * Migrated from React repository with adaptation to Next.js:
 * - Uses Next.js Link instead of onClick
 * - Uses usePathname to determine active item
 * - Integrated with /admin/:lang routing
 */

import { useState, type FC } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { AdminMenuItem, AdminMenuNode } from '../admin.constants';
import type { SupportedLang } from '@/lib/i18n/lang';
import { getVisibleAdminMenuTree } from '../admin.constants';
import styles from './AdminSidebar.module.scss';

interface AdminSidebarProps {
  lang: SupportedLang;
}

interface MenuLinkProps {
  item: AdminMenuItem;
  isActive: boolean;
  nested?: boolean;
}

const MenuLink: FC<MenuLinkProps> = ({ item, isActive, nested = false }) => {
  const Icon = item.icon;

  return (
    <Link
      href={item.path}
      className={`${styles.menuLink} ${nested ? styles.nested : ''} ${
        isActive ? styles.active : ''
      }`}
    >
      <Icon size={nested ? 16 : 20} />
      <span className={styles.menuLabel}>{item.label}</span>
    </Link>
  );
};

/**
 * AdminSidebar component
 */
export const AdminSidebar = (props: AdminSidebarProps) => {
  const { lang } = props;
  const pathname = usePathname();
  const { data: session } = useSession();

  // Phase 19: the sidebar is filtered by role — a lawyer sees only the legal sections.
  const userRoles = session?.user?.roles ?? [];
  const nodes = getVisibleAdminMenuTree(lang, userRoles);

  /**
   * Check if menu item is active
   */
  const isActive = (itemPath: string): boolean => {
    // Exact match or path start (for subpages)
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  };

  const isGroupActive = (node: Extract<AdminMenuNode, { kind: 'group' }>): boolean =>
    node.items.some((item) => isActive(item.path));

  // Свёрнутость держится в состоянии, но группа с активным разделом раскрыта всегда: иначе
  // переход по прямой ссылке приводил бы на страницу, которой в меню не видно.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <BookOpen size={32} />
        <span className={styles.logoText}>Bibliaris Admin</span>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.menuList}>
          {nodes.map((node) => {
            if (node.kind === 'item') {
              return (
                <li key={node.item.id} className={styles.menuItem}>
                  <MenuLink item={node.item} isActive={isActive(node.item.path)} />
                </li>
              );
            }

            const GroupIcon = node.group.icon;
            const active = isGroupActive(node);
            const expanded = active || openGroups[node.group.id] === true;

            return (
              <li key={node.group.id} className={styles.menuItem}>
                <button
                  type="button"
                  className={`${styles.menuLink} ${styles.groupToggle} ${
                    active ? styles.groupActive : ''
                  }`}
                  onClick={() => toggleGroup(node.group.id)}
                  aria-expanded={expanded}
                >
                  <GroupIcon size={20} />
                  <span className={styles.menuLabel}>{node.group.label}</span>
                  {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {expanded && (
                  <ul className={styles.subMenuList}>
                    {node.items.map((item) => (
                      <li key={item.id} className={styles.menuItem}>
                        <MenuLink item={item} isActive={isActive(item.path)} nested />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
