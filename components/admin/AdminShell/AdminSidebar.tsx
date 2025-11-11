'use client';

/**
 * AdminSidebar - admin panel side menu
 *
 * Migrated from React repository with adaptation to Next.js:
 * - Uses Next.js Link instead of onClick
 * - Uses usePathname to determine active item
 * - Integrated with /admin/:lang routing
 */

import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SupportedLang } from '@/lib/i18n/lang';
import { getAdminMenuItems } from './admin.constants';
import styles from './AdminSidebar.module.scss';

interface AdminSidebarProps {
  lang: SupportedLang;
}

/**
 * AdminSidebar component
 */
export const AdminSidebar = (props: AdminSidebarProps) => {
  const { lang } = props;
  const pathname = usePathname();

  // Get menu items for current language
  const menuItems = getAdminMenuItems(lang);

  /**
   * Check if menu item is active
   */
  const isActive = (itemPath: string): boolean => {
    // Exact match or path start (for subpages)
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <BookOpen size={32} />
        <span className={styles.logoText}>Bibliaris Admin</span>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.menuList}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <li key={item.id} className={styles.menuItem}>
                <Link
                  href={item.path}
                  className={`${styles.menuLink} ${active ? styles.active : ''}`}
                >
                  <Icon size={20} />
                  <span className={styles.menuLabel}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
