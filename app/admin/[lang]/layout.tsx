import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isSupportedLang } from '@/lib/i18n/lang';
import { AppProviders } from '@/providers/AppProviders';
import { AdminLanguageSwitcher } from '@/components/admin/AdminLanguageSwitcher';
import '@/styles/globals.css';
import styles from '@/styles/admin-layouts.module.scss';

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export const metadata: Metadata = {
  title: 'Admin Panel - Bibliaris',
  description: 'Content management system for Bibliaris',
  robots: {
    index: false, // Don't index admin pages
    follow: false,
  },
};

export default async function AdminLayout({ children, params }: Props) {
  const { lang } = await params;

  if (!isSupportedLang(lang)) {
    notFound();
  }

  return (
    <html lang={lang}>
      <body>
        <AppProviders>
          <div className={styles.adminLayout}>
            <aside className={styles.adminSidebar}>
              <h2>Admin Panel</h2>
              <nav>
                <ul className={styles.adminNav}>
                  <li>📊 Dashboard</li>
                  <li>📄 Pages</li>
                  <li>📚 Books</li>
                  <li>🏷️ Categories</li>
                  <li>🔖 Tags</li>
                </ul>
              </nav>
            </aside>

            <div className={styles.adminContent}>
              <header className={styles.adminHeader}>
                <h1>Content Management</h1>
                <AdminLanguageSwitcher />
              </header>

              <main className={styles.adminMain}>{children}</main>
            </div>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
