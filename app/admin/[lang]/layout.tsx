import { notFound, redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminShell/AdminSidebar';
import { AdminTopBar } from '@/components/admin/AdminShell/AdminTopBar';
import { STAFF_ROLES } from '@/lib/auth/constants';
import { getCurrentUser } from '@/lib/auth/helpers';
import { isSupportedLang, type SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import styles from '@/styles/admin-layouts.module.scss';

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export const metadata: Metadata = {
  title: 'Admin Panel - Bibliaris',
  description: 'Content management system for Bibliaris',
  robots: 'noindex, nofollow', // Admin panel is not indexed
};

/**
 * Admin Layout
 *
 * Protected layout for admin panel.
 * Requires authentication and admin or content_manager role.
 *
 * Middleware already checked authentication, but we do additional
 * server-side check to get user data.
 */
export default async function AdminLayout({ children, params }: Props) {
  const { lang } = await params;

  // Language validation
  if (!isSupportedLang(lang)) {
    notFound();
  }

  // Get current user
  const session = await getCurrentUser();

  // Double-check: middleware should have redirected, but check again
  if (!session || !session.user) {
    redirect(`/${lang}/auth/sign-in?callbackUrl=/admin/${lang}`);
  }

  // Check roles
  const userRoles = session.user.roles || [];
  const hasStaffRole = STAFF_ROLES.some((role) => userRoles.includes(role));

  if (!hasStaffRole) {
    redirect(`/${lang}/403`);
  }

  return (
    <html lang={lang}>
      <body>
        <div className={styles.adminLayout}>
          {/* Sidebar menu */}
          <AdminSidebar lang={lang as SupportedLang} />

          {/* Content on the right */}
          <div className={styles.adminContent}>
            {/* Top bar */}
            <AdminTopBar
              userEmail={session.user.email || undefined}
              userName={session.user.displayName || undefined}
            />

            {/* Main page content */}
            <main className={styles.adminMain}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
