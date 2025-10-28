'use client';

/**
 * AdminSidebar - боковое меню админ-панели
 *
 * Мигрировано из React-репозитория с адаптацией под Next.js:
 * - Использует Next.js Link вместо onClick
 * - Использует usePathname для определения активного пункта
 * - Интегрировано с роутингом /admin/:lang
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import type { SupportedLang } from '@/lib/i18n/lang';
import { getAdminMenuItems } from './admin.constants';
import styles from './AdminSidebar.module.scss';

interface AdminSidebarProps {
  lang: SupportedLang;
}

/**
 * AdminSidebar компонент
 */
export const AdminSidebar = (props: AdminSidebarProps) => {
  const { lang } = props;
  const pathname = usePathname();

  // Получаем пункты меню для текущего языка
  const menuItems = getAdminMenuItems(lang);

  /**
   * Проверка, является ли пункт меню активным
   */
  const isActive = (itemPath: string): boolean => {
    // Точное совпадение или начало пути (для подстраниц)
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
