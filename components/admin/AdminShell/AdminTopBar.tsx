'use client';

/**
 * AdminTopBar - admin panel top bar
 *
 * Contains:
 * - Language switcher (AdminLanguageSwitcher)
 * - User information
 * - Logout button
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
 * AdminTopBar component
 */
export const AdminTopBar = (props: AdminTopBarProps) => {
  const { userEmail, userName } = props;

  /**
   * Logout handler
   */
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/en/auth/sign-in' });
  };

  return (
    <header className={styles.topBar}>
      <div className={styles.breadcrumbs}>{/* TODO: M3.1.3 - add breadcrumbs navigation */}</div>

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
