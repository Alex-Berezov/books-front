'use client';

/**
 * AdminTopBar - admin panel top bar
 *
 * Contains:
 * - Rights notifications bell (RightsNotificationsBell)
 * - Language switcher (AdminLanguageSwitcher)
 * - User information
 * - Logout button
 */

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { AdminLanguageSwitcher } from '@/components/admin/AdminShell/AdminTopBar/AdminLanguageSwitcher';
import { RightsNotificationsBell } from '@/components/admin/AdminShell/AdminTopBar/RightsNotificationsBell/RightsNotificationsBell';
import { PurgeCacheButton } from '@/components/admin/AdminShell/PurgeCacheButton/PurgeCacheButton';
import { Button } from '@/components/common/Button';
import { clearLoggedInMarker } from '@/lib/auth/sessionMarker';
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
    clearLoggedInMarker();
    await signOut({ callbackUrl: '/en/auth/sign-in' });
  };

  return (
    <header className={styles.topBar}>
      <div className={styles.breadcrumbs}>
        {/* Placeholder for breadcrumbs */}
        <span style={{ opacity: 0.5 }}>Admin Panel</span>
      </div>

      <div className={styles.actions}>
        <RightsNotificationsBell />

        <PurgeCacheButton />

        <AdminLanguageSwitcher />

        <div className={styles.userInfo}>
          <span className={styles.userName}>{userName || userEmail || 'User'}</span>
        </div>

        <Button
          variant="secondary"
          leftIcon={<LogOut size={20} />}
          onClick={handleLogout}
          ariaLabel="Log out"
          title="Log out"
        >
          Logout
        </Button>
      </div>
    </header>
  );
};
