'use client';

/**
 * AdminTopBar - верхняя панель админки
 *
 * Содержит:
 * - Переключатель языка (AdminLanguageSwitcher)
 * - Информацию о пользователе
 * - Кнопку выхода
 */

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { AdminLanguageSwitcher } from '@/components/admin/AdminLanguageSwitcher';
import styles from './AdminTopBar.module.scss';

interface AdminTopBarProps {
  userEmail?: string;
  userName?: string;
}

/**
 * AdminTopBar компонент
 */
export const AdminTopBar = (props: AdminTopBarProps) => {
  const { userEmail, userName } = props;

  /**
   * Обработчик выхода из системы
   */
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/en/auth/sign-in' });
  };

  return (
    <header className={styles.topBar}>
      <div className={styles.breadcrumbs}>
        {/* TODO: M3.1.3 - добавить breadcrumbs навигацию */}
      </div>

      <div className={styles.actions}>
        <AdminLanguageSwitcher />

        <div className={styles.userInfo}>
          <span className={styles.userName}>{userName || userEmail || 'User'}</span>
        </div>

        <button
          onClick={handleLogout}
          className={styles.logoutButton}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
