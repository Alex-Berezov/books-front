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
import {
  BookOpen,
  FileText,
  FolderTree,
  Tags,
  Image,
  MessageSquare,
  Users,
} from 'lucide-react';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './AdminSidebar.module.scss';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  path: string;
}

interface AdminSidebarProps {
  lang: SupportedLang;
}

/**
 * AdminSidebar компонент
 */
export const AdminSidebar = (props: AdminSidebarProps) => {
  const { lang } = props;
  const pathname = usePathname();

  /**
   * Меню админ-панели
   */
  const menuItems: MenuItem[] = [
    {
      id: 'books',
      label: 'Books',
      icon: BookOpen,
      path: `/admin/${lang}/books`,
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
