import { notFound, redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminShell/AdminSidebar';
import { AdminTopBar } from '@/components/admin/AdminShell/AdminTopBar';
import { STAFF_ROLES } from '@/lib/auth/constants';
import { getCurrentUser } from '@/lib/auth/helpers';
import { isSupportedLang, type SupportedLang } from '@/lib/i18n/lang';
import { AppProviders } from '@/providers/AppProviders';
import type { Metadata } from 'next';
import '@/styles/globals.css';
import '@/styles/snackbar.scss';
import styles from '@/styles/admin-layouts.module.scss';

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export const metadata: Metadata = {
  title: 'Admin Panel - Bibliaris',
  description: 'Content management system for Bibliaris',
  robots: 'noindex, nofollow', // Админка не индексируется
};

/**
 * Admin Layout
 *
 * Защищённый layout для админ-панели.
 * Требует авторизации и роли admin или content_manager.
 *
 * Middleware уже проверил авторизацию, но мы делаем дополнительную
 * проверку на сервере для получения данных пользователя.
 */
export default async function AdminLayout({ children, params }: Props) {
  const { lang } = await params;

  // Валидация языка
  if (!isSupportedLang(lang)) {
    notFound();
  }

  // Получение текущего пользователя
  const session = await getCurrentUser();

  // Double-check: middleware должен был перенаправить, но проверим ещё раз
  if (!session || !session.user) {
    redirect(`/${lang}/auth/sign-in?callbackUrl=/admin/${lang}`);
  }

  // Проверка ролей
  const userRoles = session.user.roles || [];
  const hasStaffRole = STAFF_ROLES.some((role) => userRoles.includes(role));

  if (!hasStaffRole) {
    redirect(`/${lang}/403`);
  }

  return (
    <html lang={lang}>
      <body>
        <AppProviders>
          <div className={styles.adminLayout}>
            {/* Боковое меню */}
            <AdminSidebar lang={lang as SupportedLang} />

            {/* Контент справа */}
            <div className={styles.adminContent}>
              {/* Верхняя панель */}
              <AdminTopBar
                userEmail={session.user.email || undefined}
                userName={session.user.displayName || undefined}
              />

              {/* Основной контент страницы */}
              <main className={styles.adminMain}>{children}</main>
            </div>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
